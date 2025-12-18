import json
import os
import jwt
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, Optional
from datetime import datetime

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    API для работы с тикетами техподдержки.
    POST /create - создание нового тикета
    GET /list - получение списка тикетов пользователя или всех (для админов)
    GET /{ticket_id} - получение деталей тикета с сообщениями
    POST /{ticket_id}/reply - добавление ответа в тикет
    PUT /{ticket_id}/status - изменение статуса тикета (только админ)
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
    
    headers = event.get('headers') or {}
    token = headers.get('x-auth-token') or headers.get('X-Auth-Token')
    
    user_data = verify_token(token)
    if not user_data:
        return error_response('Unauthorized', 401)
    
    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')
    ticket_id = params.get('ticket_id', '')
    
    if method == 'POST' and action == 'create':
        return create_ticket(event, user_data)
    elif method == 'GET' and action == 'list':
        return list_tickets(user_data)
    elif method == 'GET' and ticket_id:
        return get_ticket_details(ticket_id, user_data)
    elif method == 'POST' and action == 'reply' and ticket_id:
        return add_reply(ticket_id, event, user_data)
    elif method == 'PUT' and action == 'status' and ticket_id:
        return update_status(ticket_id, event, user_data)
    elif method == 'DELETE' and ticket_id:
        return delete_ticket(ticket_id, user_data)
    
    return error_response('Not found', 404)


def verify_token(token: Optional[str]) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    
    try:
        secret = os.environ['JWT_SECRET']
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        return payload
    except:
        return None


def create_ticket(event: Dict[str, Any], user_data: Dict[str, Any]) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}'))
    server = body.get('server', '').strip()
    subject = body.get('subject', '').strip()
    message = body.get('message', '').strip()
    file_url = body.get('file_url', '').strip()
    
    if not server or not subject or not message:
        return error_response('Server, subject and message are required')
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute("SELECT is_blocked FROM users WHERE id = %s", (user_data['user_id'],))
    user = cur.fetchone()
    
    if user and user['is_blocked']:
        cur.close()
        conn.close()
        return error_response('User is blocked from creating tickets', 403)
    
    cur.execute(
        "INSERT INTO tickets (user_id, server, subject) VALUES (%s, %s, %s) RETURNING *",
        (user_data['user_id'], server, subject)
    )
    ticket = cur.fetchone()
    
    cur.execute(
        "INSERT INTO ticket_messages (ticket_id, user_id, message, file_url) VALUES (%s, %s, %s, %s) RETURNING *",
        (ticket['id'], user_data['user_id'], message, file_url if file_url else None)
    )
    first_message = cur.fetchone()
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 201,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'ticket': dict(ticket),
            'message': dict(first_message)
        }, default=str),
        'isBase64Encoded': False
    }


def list_tickets(user_data: Dict[str, Any]) -> Dict[str, Any]:
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    is_admin = user_data.get('is_admin', False)
    
    if is_admin:
        cur.execute("""
            SELECT t.*, u.steam_username, u.steam_avatar,
                   (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count
            FROM tickets t
            JOIN users u ON t.user_id = u.id
            ORDER BY t.created_at DESC
        """)
    else:
        cur.execute("""
            SELECT t.*,
                   (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count
            FROM tickets t
            WHERE t.user_id = %s
            ORDER BY t.created_at DESC
        """, (user_data['user_id'],))
    
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'tickets': [dict(t) for t in tickets]}, default=str),
        'isBase64Encoded': False
    }


def get_ticket_details(ticket_id: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute("""
        SELECT t.*, u.steam_username, u.steam_avatar, u.steam_id, u.is_blocked
        FROM tickets t
        JOIN users u ON t.user_id = u.id
        WHERE t.id = %s
    """, (ticket_id,))
    
    ticket = cur.fetchone()
    
    if not ticket:
        cur.close()
        conn.close()
        return error_response('Ticket not found', 404)
    
    is_admin = user_data.get('is_admin', False)
    if not is_admin and ticket['user_id'] != user_data['user_id']:
        cur.close()
        conn.close()
        return error_response('Access denied', 403)
    
    cur.execute("""
        SELECT tm.*, 
               u.steam_username as user_name, u.steam_avatar as user_avatar,
               a.full_name as admin_name
        FROM ticket_messages tm
        LEFT JOIN users u ON tm.user_id = u.id
        LEFT JOIN admins a ON tm.admin_id = a.id
        WHERE tm.ticket_id = %s
        ORDER BY tm.created_at ASC
    """, (ticket_id,))
    
    messages = cur.fetchall()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'ticket': dict(ticket),
            'messages': [dict(m) for m in messages]
        }, default=str),
        'isBase64Encoded': False
    }


def add_reply(ticket_id: str, event: Dict[str, Any], user_data: Dict[str, Any]) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}'))
    message = body.get('message', '').strip()
    file_url = body.get('file_url', '').strip()
    
    if not message:
        return error_response('Message is required')
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    is_admin = user_data.get('is_admin', False)
    
    if is_admin:
        cur.execute(
            "INSERT INTO ticket_messages (ticket_id, admin_id, message, file_url, is_admin_reply) VALUES (%s, %s, %s, %s, TRUE) RETURNING *",
            (ticket_id, user_data['admin_id'], message, file_url if file_url else None)
        )
    else:
        cur.execute("SELECT user_id FROM tickets WHERE id = %s", (ticket_id,))
        ticket = cur.fetchone()
        
        if not ticket or ticket['user_id'] != user_data['user_id']:
            cur.close()
            conn.close()
            return error_response('Access denied', 403)
        
        cur.execute(
            "INSERT INTO ticket_messages (ticket_id, user_id, message, file_url) VALUES (%s, %s, %s, %s) RETURNING *",
            (ticket_id, user_data['user_id'], message, file_url if file_url else None)
        )
    
    reply = cur.fetchone()
    
    cur.execute("UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = %s", (ticket_id,))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 201,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'message': dict(reply)}, default=str),
        'isBase64Encoded': False
    }


def update_status(ticket_id: str, event: Dict[str, Any], user_data: Dict[str, Any]) -> Dict[str, Any]:
    if not user_data.get('is_admin'):
        return error_response('Admin access required', 403)
    
    body = json.loads(event.get('body', '{}'))
    status = body.get('status', '').strip()
    
    if status not in ['open', 'closed', 'in_progress']:
        return error_response('Invalid status')
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute(
        "UPDATE tickets SET status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING *",
        (status, ticket_id)
    )
    
    ticket = cur.fetchone()
    
    if not ticket:
        cur.close()
        conn.close()
        return error_response('Ticket not found', 404)
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'ticket': dict(ticket)}, default=str),
        'isBase64Encoded': False
    }


def delete_ticket(ticket_id: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
    if not user_data.get('is_admin', False):
        return error_response('Access denied', 403)
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute("SELECT id FROM tickets WHERE id = %s", (ticket_id,))
    ticket = cur.fetchone()
    
    if not ticket:
        cur.close()
        conn.close()
        return error_response('Ticket not found', 404)
    
    cur.execute("DELETE FROM ticket_messages WHERE ticket_id = %s", (ticket_id,))
    cur.execute("DELETE FROM tickets WHERE id = %s", (ticket_id,))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'success': True}),
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