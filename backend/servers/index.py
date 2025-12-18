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
    
    path = event.get('path', '')
    path_params = event.get('pathParams') or {}
    
    if method == 'GET' and 'active' in path:
        return get_active_servers()
    elif method == 'GET':
        return get_all_servers()
    
    headers = event.get('headers') or {}
    token = headers.get('x-auth-token') or headers.get('X-Auth-Token')
    admin_data = verify_admin_token(token)
    
    if not admin_data:
        return error_response('Admin access required', 401)
    
    if method == 'POST' and 'create' in path:
        return create_server(event)
    elif method == 'PUT' and path_params.get('server_id'):
        return update_server(path_params['server_id'], event)
    elif method == 'DELETE' and path_params.get('server_id'):
        return delete_server(path_params['server_id'])
    
    return error_response('Not found', 404)


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
        SELECT id, name, is_active, created_at, updated_at
        FROM servers
        WHERE is_active = TRUE
        ORDER BY name ASC
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
        SELECT id, name, is_active, created_at, updated_at
        FROM servers
        ORDER BY name ASC
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
    
    if not name:
        return error_response('Server name is required')
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cur.execute(
            "INSERT INTO servers (name, is_active) VALUES (%s, %s) RETURNING *",
            (name, is_active)
        )
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
    body = json.loads(event.get('body', '{}'))
    name = body.get('name', '').strip()
    is_active = body.get('is_active')
    
    if not name:
        return error_response('Server name is required')
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cur.execute(
            "UPDATE servers SET name = %s, is_active = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING *",
            (name, is_active, server_id)
        )
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
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute("DELETE FROM servers WHERE id = %s RETURNING *", (server_id,))
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
