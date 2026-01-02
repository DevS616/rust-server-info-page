import json
import os
import jwt
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, Optional
from datetime import datetime
import requests

def escape_sql(value: str) -> str:
    return value.replace("'", "''")

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    API для работы с тикетами техподдержки.
    POST /create - создание нового тикета
    GET /list - получение списка тикетов пользователя или всех (для админов)
    GET /status - проверка статуса пользователя и непрочитанных уведомлений
    GET /{ticket_id} - получение деталей тикета с сообщениями
    POST /{ticket_id}/reply - добавление ответа в тикет
    PUT /{ticket_id}/status - изменение статуса тикета (только админ)
    POST /{ticket_id}/rate - оценка тикета пользователем (1-5 звезд)
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
    elif method == 'GET' and action == 'dashboard':
        return get_dashboard(user_data)
    elif method == 'GET' and action == 'list':
        return list_tickets(user_data)
    elif method == 'GET' and action == 'status':
        return get_user_status(user_data)
    elif method == 'GET' and ticket_id:
        return get_ticket_details(ticket_id, user_data)
    elif method == 'POST' and action == 'reply' and ticket_id:
        return add_reply(ticket_id, event, user_data)
    elif method == 'PUT' and action == 'status' and ticket_id:
        return update_status(ticket_id, event, user_data)
    elif method == 'POST' and action == 'rate' and ticket_id:
        return rate_ticket(ticket_id, event, user_data)
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
    
    user_id = int(user_data['user_id'])
    cur.execute(f"SELECT is_blocked, steam_username, steam_id FROM users WHERE id = {user_id}")
    user = cur.fetchone()
    
    if user and user['is_blocked']:
        cur.close()
        conn.close()
        return error_response('Вам запрещено создавать тикеты в техподдержке, ваш аккаунт заблокирован.', 403)
    
    server_escaped = escape_sql(server)
    subject_escaped = escape_sql(subject)
    
    cur.execute(
        f"INSERT INTO tickets (user_id, server, subject) VALUES ({user_id}, '{server_escaped}', '{subject_escaped}') RETURNING *"
    )
    ticket = cur.fetchone()
    
    message_escaped = escape_sql(message)
    ticket_id = int(ticket['id'])
    if file_url:
        file_url_escaped = escape_sql(file_url)
        file_url_sql = f"'{file_url_escaped}'"
    else:
        file_url_sql = 'NULL'
    
    cur.execute(
        f"INSERT INTO ticket_messages (ticket_id, user_id, message, file_url) VALUES ({ticket_id}, {user_id}, '{message_escaped}', {file_url_sql}) RETURNING *"
    )
    first_message = cur.fetchone()
    
    conn.commit()
    cur.close()
    conn.close()
    
    # Отправка уведомления в Telegram
    try:
        site_url = 'https://play.devilrust.ru'
        ticket_url = f'{site_url}/support/ticket/{ticket["id"]}'
        
        telegram_notify_url = 'https://functions.poehali.dev/d9aaa9bf-3c0a-459b-ae1a-3c8bb981fdc6/'
        
        notify_payload = {
            'ticket_id': ticket['id'],
            'server': server,
            'subject': subject,
            'url': ticket_url,
            'steam_username': user['steam_username'] if user else 'Unknown',
            'steam_id': user['steam_id'] if user else 'Unknown'
        }
        
        requests.post(
            telegram_notify_url,
            json=notify_payload,
            timeout=5
        )
    except Exception as e:
        print(f'Failed to send telegram notification: {e}')
    
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


def get_dashboard(user_data: Dict[str, Any]) -> Dict[str, Any]:
    '''Получить все данные для dashboard за один запрос: статус, тикеты, непрочитанные'''
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    user_id = int(user_data['user_id'])
    print(f'Loading dashboard for user_id={user_id}')
    
    # Получаем статус пользователя
    cur.execute(f"SELECT is_blocked, telegram_chat_id, telegram_username FROM users WHERE id = {user_id}")
    user = cur.fetchone()
    
    if not user:
        cur.close()
        conn.close()
        print(f'User not found for user_id={user_id}')
        return error_response('User not found', 404)
    
    print(f'User found: {user}')
    
    # Всегда получаем только тикеты текущего пользователя (не показываем чужие)
    cur.execute(f"""
        SELECT t.*,
               (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count,
               (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id AND is_admin_reply = TRUE AND is_read_by_user = FALSE) as unread_count
        FROM tickets t
        WHERE t.user_id = {user_id}
        ORDER BY t.created_at DESC
    """)
    
    tickets = cur.fetchall()
    print(f'Found {len(tickets)} tickets for user_id={user_id}')
    
    # Считаем общее количество непрочитанных уведомлений
    cur.execute(f"""
        SELECT COUNT(*) as count
        FROM ticket_messages tm
        JOIN tickets t ON tm.ticket_id = t.id
        WHERE t.user_id = {user_id} AND tm.is_admin_reply = TRUE AND tm.is_read_by_user = FALSE
    """)
    result = cur.fetchone()
    unread_count = result['count'] if result else 0
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'is_blocked': user['is_blocked'],
            'telegram_linked': user['telegram_chat_id'] is not None,
            'telegram_username': user.get('telegram_username'),
            'unread_count': unread_count,
            'tickets': [dict(t) for t in tickets]
        }, default=str),
        'isBase64Encoded': False
    }





def list_tickets(user_data: Dict[str, Any]) -> Dict[str, Any]:
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    is_admin = user_data.get('is_admin', False)
    
    if is_admin:
        cur.execute("""
            SELECT t.*, u.steam_username, u.steam_avatar, u.steam_id, u.is_blocked,
                   (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count
            FROM tickets t
            LEFT JOIN users u ON t.user_id = u.id
            ORDER BY t.created_at DESC
        """)
    else:
        user_id = int(user_data['user_id'])
        cur.execute(f"""
            SELECT t.*,
                   (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count
            FROM tickets t
            WHERE t.user_id = {user_id}
            ORDER BY t.created_at DESC
        """)
    
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


def get_user_status(user_data: Dict[str, Any]) -> Dict[str, Any]:
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    user_id = int(user_data['user_id'])
    cur.execute(f"SELECT is_blocked, telegram_chat_id, telegram_username FROM users WHERE id = {user_id}")
    user = cur.fetchone()
    
    if not user:
        cur.close()
        conn.close()
        return error_response('User not found', 404)
    
    # Подсчет непрочитанных уведомлений
    cur.execute(f"""
        SELECT COUNT(*) as count
        FROM ticket_messages tm
        JOIN tickets t ON tm.ticket_id = t.id
        WHERE t.user_id = {user_id} AND tm.is_admin_reply = TRUE AND tm.is_read_by_user = FALSE
    """)
    result = cur.fetchone()
    unread_count = result['count'] if result else 0
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'is_blocked': user['is_blocked'],
            'telegram_linked': user['telegram_chat_id'] is not None,
            'telegram_username': user.get('telegram_username'),
            'unread_count': unread_count
        }, default=str),
        'isBase64Encoded': False
    }


def get_ticket_details(ticket_id: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        ticket_id_int = int(ticket_id)
    except ValueError:
        return error_response('Invalid ticket ID')
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    is_admin = user_data.get('is_admin', False)
    
    cur.execute(f"SELECT * FROM tickets WHERE id = {ticket_id_int}")
    ticket = cur.fetchone()
    
    if not ticket:
        cur.close()
        conn.close()
        return error_response('Ticket not found', 404)
    
    if not is_admin:
        user_id = int(user_data['user_id'])
        if ticket['user_id'] != user_id:
            cur.close()
            conn.close()
            return error_response('Access denied', 403)
    
    cur.execute(f"""
        SELECT tm.*, 
               u.steam_username as user_name, 
               u.steam_avatar as user_avatar,
               a.full_name as admin_name
        FROM ticket_messages tm
        LEFT JOIN users u ON tm.user_id = u.id AND tm.is_admin_reply = FALSE
        LEFT JOIN admins a ON tm.admin_id = a.id AND tm.is_admin_reply = TRUE
        WHERE tm.ticket_id = {ticket_id_int}
        ORDER BY tm.created_at ASC
    """)
    messages = cur.fetchall()
    
    # Отметить непрочитанные сообщения как прочитанные
    if not is_admin:
        cur.execute(f"""
            UPDATE ticket_messages
            SET is_read_by_user = TRUE
            WHERE ticket_id = {ticket_id_int} AND is_admin_reply = TRUE AND is_read_by_user = FALSE
        """)
        conn.commit()
    
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
    try:
        ticket_id_int = int(ticket_id)
    except ValueError:
        return error_response('Invalid ticket ID')
    
    body = json.loads(event.get('body', '{}'))
    message = body.get('message', '').strip()
    file_url = body.get('file_url', '').strip()
    
    if not message:
        return error_response('Message is required')
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    is_admin = user_data.get('is_admin', False)
    
    cur.execute(f"SELECT * FROM tickets WHERE id = {ticket_id_int}")
    ticket = cur.fetchone()
    
    if not ticket:
        cur.close()
        conn.close()
        return error_response('Ticket not found', 404)
    
    if not is_admin:
        user_id = int(user_data['user_id'])
        if ticket['user_id'] != user_id:
            cur.close()
            conn.close()
            return error_response('Access denied', 403)
    else:
        user_id = int(user_data['admin_id'])
    
    message_escaped = escape_sql(message)
    is_admin_reply = 'TRUE' if is_admin else 'FALSE'
    
    if file_url:
        file_url_escaped = escape_sql(file_url)
        file_url_sql = f"'{file_url_escaped}'"
    else:
        file_url_sql = 'NULL'
    
    cur.execute(f"""
        INSERT INTO ticket_messages (ticket_id, user_id, message, file_url, is_admin_reply)
        VALUES ({ticket_id_int}, {user_id}, '{message_escaped}', {file_url_sql}, {is_admin_reply})
        RETURNING *
    """)
    new_message = cur.fetchone()
    
    # Обновить статус тикета: если админ отвечает, ставим "answered", если пользователь - "pending"
    if is_admin:
        new_status = 'answered'
    else:
        new_status = 'pending'
    
    new_status_escaped = escape_sql(new_status)
    cur.execute(f"UPDATE tickets SET status = '{new_status_escaped}', updated_at = NOW() WHERE id = {ticket_id_int}")
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 201,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(dict(new_message), default=str),
        'isBase64Encoded': False
    }


def update_status(ticket_id: str, event: Dict[str, Any], user_data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        ticket_id_int = int(ticket_id)
    except ValueError:
        return error_response('Invalid ticket ID')
    
    if not user_data.get('is_admin', False):
        return error_response('Admin access required', 403)
    
    body = json.loads(event.get('body', '{}'))
    new_status = body.get('status', '').strip()
    
    allowed_statuses = ['open', 'pending', 'answered', 'closed']
    if new_status not in allowed_statuses:
        return error_response(f'Status must be one of: {", ".join(allowed_statuses)}')
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    new_status_escaped = escape_sql(new_status)
    cur.execute(f"UPDATE tickets SET status = '{new_status_escaped}', updated_at = NOW() WHERE id = {ticket_id_int} RETURNING *")
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
        'body': json.dumps(dict(ticket), default=str),
        'isBase64Encoded': False
    }


def rate_ticket(ticket_id: str, event: Dict[str, Any], user_data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        ticket_id_int = int(ticket_id)
    except ValueError:
        return error_response('Invalid ticket ID')
    
    body = json.loads(event.get('body', '{}'))
    rating = body.get('rating')
    
    try:
        rating_int = int(rating)
    except (ValueError, TypeError):
        return error_response('Rating must be an integer')
    
    if rating_int < 1 or rating_int > 5:
        return error_response('Rating must be between 1 and 5')
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    user_id = int(user_data['user_id'])
    
    cur.execute(f"SELECT * FROM tickets WHERE id = {ticket_id_int}")
    ticket = cur.fetchone()
    
    if not ticket:
        cur.close()
        conn.close()
        return error_response('Ticket not found', 404)
    
    if ticket['user_id'] != user_id:
        cur.close()
        conn.close()
        return error_response('You can only rate your own tickets', 403)
    
    cur.execute(f"UPDATE tickets SET rating = {rating_int}, updated_at = NOW() WHERE id = {ticket_id_int} RETURNING *")
    updated_ticket = cur.fetchone()
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(dict(updated_ticket), default=str),
        'isBase64Encoded': False
    }


def delete_ticket(ticket_id: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        ticket_id_int = int(ticket_id)
    except ValueError:
        return error_response('Invalid ticket ID')
    
    if not user_data.get('is_admin', False):
        return error_response('Admin access required', 403)
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute(f"SELECT * FROM tickets WHERE id = {ticket_id_int}")
    ticket = cur.fetchone()
    
    if not ticket:
        cur.close()
        conn.close()
        return error_response('Ticket not found', 404)
    
    cur.execute(f"DELETE FROM ticket_messages WHERE ticket_id = {ticket_id_int}")
    cur.execute(f"DELETE FROM tickets WHERE id = {ticket_id_int}")
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'message': 'Ticket deleted successfully'}),
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