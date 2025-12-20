import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any

def escape_sql(value: str) -> str:
    """Escape single quotes for SQL strings"""
    return value.replace("'", "''")


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Управление карточками серверов на главной странице
    GET / - получить все серверы
    GET /?server_id=X - получить конкретный сервер
    POST / - создать сервер (только админ)
    PUT /?server_id=X - обновить сервер (только админ)
    DELETE /?server_id=X - удалить сервер (только админ)
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    params = event.get('queryStringParameters') or {}
    server_id = params.get('server_id', '')
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        if method == 'GET':
            if server_id:
                try:
                    server_id_int = int(server_id)
                except ValueError:
                    return error_response('Invalid server ID', 400)
                
                cur.execute(f"""
                    SELECT id, name, mode, ip, server_ip, battlemetrics_id, 
                           description, features, detailed_description, 
                           display_order, is_active, created_at, updated_at
                    FROM servers 
                    WHERE id = {server_id_int}
                """)
                server = cur.fetchone()
                
                if not server:
                    return error_response('Server not found', 404)
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'server': dict(server)}, default=str),
                    'isBase64Encoded': False
                }
            else:
                cur.execute("""
                    SELECT id, name, mode, ip, server_ip, battlemetrics_id, 
                           description, features, detailed_description, 
                           display_order, is_active
                    FROM servers 
                    WHERE is_active = TRUE
                    ORDER BY display_order ASC, id ASC
                """)
                servers = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'servers': [dict(s) for s in servers]}, default=str),
                    'isBase64Encoded': False
                }
        
        headers = event.get('headers') or {}
        token = headers.get('x-auth-token') or headers.get('X-Auth-Token')
        
        if not token:
            return error_response('Unauthorized', 401)
        
        token_safe = escape_sql(token)
        cur.execute(f"SELECT id, role FROM admins WHERE token = '{token_safe}'")
        admin = cur.fetchone()
        
        if not admin:
            return error_response('Access denied', 403)
        
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            name = body.get('name', '').strip()
            mode = body.get('mode', '').strip()
            ip = body.get('ip', '').strip()
            server_ip = body.get('server_ip', '').strip()
            battlemetrics_id = body.get('battlemetrics_id', '').strip()
            description = body.get('description', '').strip()
            features = body.get('features', [])
            detailed_description = body.get('detailed_description')
            display_order = body.get('display_order', 0)
            
            if not name:
                return error_response('Name is required', 400)
            
            try:
                display_order_int = int(display_order)
            except ValueError:
                display_order_int = 0
            
            name_safe = escape_sql(name)
            mode_safe = escape_sql(mode)
            ip_safe = escape_sql(ip)
            server_ip_safe = escape_sql(server_ip)
            battlemetrics_id_safe = escape_sql(battlemetrics_id)
            description_safe = escape_sql(description)
            features_json = escape_sql(json.dumps(features))
            
            if detailed_description:
                detailed_description_json = escape_sql(json.dumps(detailed_description))
                detailed_sql = f"'{detailed_description_json}'"
            else:
                detailed_sql = 'NULL'
            
            cur.execute(f"""
                INSERT INTO servers 
                (name, mode, ip, server_ip, battlemetrics_id, description, 
                 features, detailed_description, display_order, is_active) 
                VALUES ('{name_safe}', '{mode_safe}', '{ip_safe}', '{server_ip_safe}', 
                        '{battlemetrics_id_safe}', '{description_safe}', 
                        '{features_json}', {detailed_sql}, {display_order_int}, TRUE)
                RETURNING id, name, mode, ip, server_ip, battlemetrics_id, 
                          description, features, detailed_description, display_order, is_active
            """)
            
            server = cur.fetchone()
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'server': dict(server)}, default=str),
                'isBase64Encoded': False
            }
        
        if method == 'PUT':
            if not server_id:
                return error_response('Server ID required', 400)
            
            try:
                server_id_int = int(server_id)
            except ValueError:
                return error_response('Invalid server ID', 400)
            
            body = json.loads(event.get('body', '{}'))
            name = body.get('name', '').strip()
            mode = body.get('mode', '').strip()
            ip = body.get('ip', '').strip()
            server_ip = body.get('server_ip', '').strip()
            battlemetrics_id = body.get('battlemetrics_id', '').strip()
            description = body.get('description', '').strip()
            features = body.get('features', [])
            detailed_description = body.get('detailed_description')
            display_order = body.get('display_order', 0)
            is_active = body.get('is_active', True)
            
            if not name:
                return error_response('Name is required', 400)
            
            try:
                display_order_int = int(display_order)
            except ValueError:
                display_order_int = 0
            
            name_safe = escape_sql(name)
            mode_safe = escape_sql(mode)
            ip_safe = escape_sql(ip)
            server_ip_safe = escape_sql(server_ip)
            battlemetrics_id_safe = escape_sql(battlemetrics_id)
            description_safe = escape_sql(description)
            features_json = escape_sql(json.dumps(features))
            
            if detailed_description:
                detailed_description_json = escape_sql(json.dumps(detailed_description))
                detailed_sql = f"'{detailed_description_json}'"
            else:
                detailed_sql = 'NULL'
            
            cur.execute(f"""
                UPDATE servers 
                SET name = '{name_safe}', mode = '{mode_safe}', ip = '{ip_safe}', 
                    server_ip = '{server_ip_safe}', battlemetrics_id = '{battlemetrics_id_safe}', 
                    description = '{description_safe}', features = '{features_json}', 
                    detailed_description = {detailed_sql}, display_order = {display_order_int}, 
                    is_active = {is_active}, updated_at = NOW()
                WHERE id = {server_id_int}
                RETURNING id, name, mode, ip, server_ip, battlemetrics_id, 
                          description, features, detailed_description, display_order, is_active
            """)
            
            server = cur.fetchone()
            
            if not server:
                return error_response('Server not found', 404)
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'server': dict(server)}, default=str),
                'isBase64Encoded': False
            }
        
        if method == 'DELETE':
            if not server_id:
                return error_response('Server ID required', 400)
            
            try:
                server_id_int = int(server_id)
            except ValueError:
                return error_response('Invalid server ID', 400)
            
            cur.execute(f"DELETE FROM servers WHERE id = {server_id_int} RETURNING id")
            result = cur.fetchone()
            
            if not result:
                return error_response('Server not found', 404)
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True}),
                'isBase64Encoded': False
            }
        
        return error_response('Method not allowed', 405)
        
    finally:
        cur.close()
        conn.close()


def error_response(message: str, status_code: int = 400) -> Dict[str, Any]:
    return {
        'statusCode': status_code,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': message}),
        'isBase64Encoded': False
    }
