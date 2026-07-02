import json
import os
import jwt
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, Optional

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    API для управления серверами в системе поддержки.
    GET /list - получение списка всех серверов
    GET /active - получение только активных серверов
    POST /create - создание нового сервера (только админ)
    PUT /{server_id} - обновление сервера (только админ)
    DELETE /{server_id} - удаление сервера (только админ)
    '''
    method = event.get('httpMethod', 'GET')
    
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
    active_only = params.get('active', '') == 'true'
    action = params.get('action', '')
    server_id = params.get('server_id', '')
    
    if method == 'GET' and active_only:
        return get_active_servers()
    elif method == 'GET':
        return get_all_servers()
    
    headers = event.get('headers') or {}
    token = headers.get('x-auth-token') or headers.get('X-Auth-Token')
    admin_data = verify_admin_token(token)
    
    if not admin_data:
        return error_response('Admin access required', 401)
    
    if method == 'POST' and action == 'create':
        return create_server(event)
    elif method == 'PUT' and server_id:
        return update_server(server_id, event)
    elif method == 'DELETE' and server_id:
        return delete_server(server_id)
    
    return error_response('Not found', 404)


def escape_sql(value: str) -> str:
    """Escape single quotes for SQL strings"""
    return value.replace("'", "''")


def verify_admin_token(token: Optional[str]) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    
    try:
        secret = os.environ['JWT_SECRET']
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        if payload.get('is_admin'):
            return payload
        return None
    except:
        return None


def get_active_servers() -> Dict[str, Any]:
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute("""
        SELECT id, name, mode, ip, server_ip, battlemetrics_id, description, features,
               detailed_description, display_order, is_active, cached_players, players_updated_at,
               created_at, updated_at
        FROM servers
        WHERE is_active = TRUE
        ORDER BY display_order ASC, id ASC
    """)
    
    servers = cur.fetchall()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'servers': [dict(s) for s in servers]}, default=str),
        'isBase64Encoded': False
    }


def get_all_servers() -> Dict[str, Any]:
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute("""
        SELECT id, name, mode, ip, server_ip, battlemetrics_id, description, features,
               detailed_description, display_order, is_active, cached_players, players_updated_at,
               created_at, updated_at
        FROM servers
        ORDER BY display_order ASC, id ASC
    """)
    
    servers = cur.fetchall()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'servers': [dict(s) for s in servers]}, default=str),
        'isBase64Encoded': False
    }


def create_server(event: Dict[str, Any]) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}'))
    name = body.get('name', '').strip()
    is_active = body.get('is_active', True)
    battlemetrics_id = body.get('battlemetrics_id', None)
    cached_players = body.get('cached_players', 0)
    mode = body.get('mode', '')
    ip = body.get('ip', '')
    server_ip = body.get('server_ip', '')
    description = body.get('description', '')
    features = body.get('features', [])
    detailed_description = body.get('detailed_description', None)
    display_order = body.get('display_order', 0)

    if not name:
        return error_response('Server name is required')
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        name_safe = escape_sql(name)
        bm_id_val = f"'{escape_sql(battlemetrics_id)}'" if battlemetrics_id else 'NULL'
        features_json = escape_sql(json.dumps(features, ensure_ascii=False))
        dd_val = f"'{escape_sql(json.dumps(detailed_description, ensure_ascii=False))}'" if detailed_description else 'NULL'

        cur.execute(f"""
            INSERT INTO servers (name, mode, ip, server_ip, battlemetrics_id, description, features,
                                 detailed_description, display_order, is_active, cached_players)
            VALUES ('{name_safe}', '{escape_sql(mode)}', '{escape_sql(ip)}', '{escape_sql(server_ip)}',
                    {bm_id_val}, '{escape_sql(description)}', '{features_json}',
                    {dd_val}, {int(display_order)}, {is_active}, {cached_players})
            RETURNING *
        """)
        server = cur.fetchone()
        conn.commit()
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 201,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'server': dict(server)}, default=str),
            'isBase64Encoded': False
        }
    except psycopg2.IntegrityError:
        conn.rollback()
        cur.close()
        conn.close()
        return error_response('Server with this name already exists', 409)


def update_server(server_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    try:
        server_id_int = int(server_id)
    except ValueError:
        return error_response('Invalid server ID', 400)
    
    body = json.loads(event.get('body', '{}'))
    name = body.get('name', '').strip()
    is_active = body.get('is_active')
    battlemetrics_id = body.get('battlemetrics_id')
    cached_players = body.get('cached_players')
    mode = body.get('mode')
    ip = body.get('ip')
    server_ip = body.get('server_ip')
    description = body.get('description')
    features = body.get('features')
    detailed_description = body.get('detailed_description')
    display_order = body.get('display_order')

    if not name:
        return error_response('Server name is required')
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        name_safe = escape_sql(name)
        
        update_parts = [f"name = '{name_safe}'"]
        if is_active is not None:
            update_parts.append(f"is_active = {is_active}")
        if battlemetrics_id is not None:
            bm_id_val = f"'{escape_sql(battlemetrics_id)}'" if battlemetrics_id else 'NULL'
            update_parts.append(f"battlemetrics_id = {bm_id_val}")
        if cached_players is not None:
            update_parts.append(f"cached_players = {cached_players}")
            update_parts.append("players_updated_at = CURRENT_TIMESTAMP")
        if mode is not None:
            update_parts.append(f"mode = '{escape_sql(mode)}'")
        if ip is not None:
            update_parts.append(f"ip = '{escape_sql(ip)}'")
        if server_ip is not None:
            update_parts.append(f"server_ip = '{escape_sql(server_ip)}'")
        if description is not None:
            update_parts.append(f"description = '{escape_sql(description)}'")
        if features is not None:
            features_json = escape_sql(json.dumps(features, ensure_ascii=False))
            update_parts.append(f"features = '{features_json}'")
        if detailed_description is not None:
            dd_json = escape_sql(json.dumps(detailed_description, ensure_ascii=False))
            update_parts.append(f"detailed_description = '{dd_json}'")
        elif 'detailed_description' in body and detailed_description is None:
            update_parts.append("detailed_description = NULL")
        if display_order is not None:
            update_parts.append(f"display_order = {int(display_order)}")

        update_parts.append("updated_at = CURRENT_TIMESTAMP")
        
        cur.execute(f"""
            UPDATE servers 
            SET {', '.join(update_parts)} 
            WHERE id = {server_id_int} 
            RETURNING *
        """)
        server = cur.fetchone()
        
        if not server:
            cur.close()
            conn.close()
            return error_response('Server not found', 404)
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'server': dict(server)}, default=str),
            'isBase64Encoded': False
        }
    except psycopg2.IntegrityError:
        conn.rollback()
        cur.close()
        conn.close()
        return error_response('Server with this name already exists', 409)


def delete_server(server_id: str) -> Dict[str, Any]:
    try:
        server_id_int = int(server_id)
    except ValueError:
        return error_response('Invalid server ID', 400)
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute(f"DELETE FROM servers WHERE id = {server_id_int} RETURNING *")
    server = cur.fetchone()
    
    if not server:
        cur.close()
        conn.close()
        return error_response('Server not found', 404)
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'message': 'Server deleted successfully'}),
        'isBase64Encoded': False
    }


def error_response(message: str, status_code: int = 400) -> Dict[str, Any]:
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'error': message}),
        'isBase64Encoded': False
    }