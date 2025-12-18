import json
import os
import jwt
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, Optional
from datetime import datetime
import requests

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    API для работы с тикетами техподдержки.
    POST /create - создание нового тикета
    GET /list - получение списка тикетов пользователя или всех (для админов)
    GET /status - проверка статуса пользователя и непрочитанных уведомлений
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
    elif method == 'GET' and action == 'status':
        return get_user_status(user_data)
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
        return error_response('Вам запрещено создавать тикеты в техподдержке, ваш аккаунт заблокирован.', 403)
    
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
                   (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count,
                   (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id AND is_admin_reply = TRUE AND is_read_by_user = FALSE) as unread_count
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
    
    if not is_admin:
        cur.execute("""
            UPDATE ticket_messages 
            SET is_read_by_user = TRUE 
            WHERE ticket_id = %s AND is_admin_reply = TRUE AND is_read_by_user = FALSE
        """, (ticket_id,))
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
    body = json.loads(event.get('body', '{}'))
    message = body.get('message', '').strip()
    file_url = body.get('file_url', '').strip()
    
    if not message:
        return error_response('Message is required')
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    is_admin = user_data.get('is_admin', False)
    
    if is_admin:
        admin_id = user_data.get('admin_id')
        if not admin_id:
            cur.close()
            conn.close()
            return error_response('Admin ID not found in token', 400)
        
        cur.execute(
            "INSERT INTO ticket_messages (ticket_id, admin_id, message, file_url, is_admin_reply) VALUES (%s, %s, %s, %s, TRUE) RETURNING *",
            (ticket_id, admin_id, message, file_url if file_url else None)
        )
        reply = cur.fetchone()
        
        cur.execute("""
            SELECT u.telegram_chat_id, t.subject, t.id
            FROM tickets t
            JOIN users u ON t.user_id = u.id
            WHERE t.id = %s AND u.telegram_chat_id IS NOT NULL
        """, (ticket_id,))
        
        ticket_info = cur.fetchone()
        if ticket_info:
            send_telegram_notification(
                chat_id=ticket_info['telegram_chat_id'],
                ticket_id=ticket_info['id'],
                subject=ticket_info['subject'],
                message_type='reply'
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
    
    cur.execute("""
        SELECT u.telegram_chat_id, t.subject, t.id
        FROM tickets t
        JOIN users u ON t.user_id = u.id
        WHERE t.id = %s AND u.telegram_chat_id IS NOT NULL
    """, (ticket_id,))
    
    ticket_info = cur.fetchone()
    if ticket_info:
        send_telegram_notification(
            chat_id=ticket_info['telegram_chat_id'],
            ticket_id=ticket_info['id'],
            subject=ticket_info['subject'],
            message_type='status_change',
            status=status
        )
    
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


def get_user_status(user_data: Dict[str, Any]) -> Dict[str, Any]:
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute("SELECT is_blocked FROM users WHERE id = %s", (user_data['user_id'],))
    user = cur.fetchone()
    
    if not user:
        cur.close()
        conn.close()
        return error_response('User not found', 404)
    
    cur.execute("""
        SELECT COUNT(*) as total_unread
        FROM ticket_messages tm
        JOIN tickets t ON tm.ticket_id = t.id
        WHERE t.user_id = %s 
        AND tm.is_admin_reply = TRUE 
        AND tm.is_read_by_user = FALSE
    """, (user_data['user_id'],))
    
    unread_result = cur.fetchone()
    total_unread = unread_result['total_unread'] if unread_result else 0
    
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
            'unread_count': total_unread
        }),
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


def send_telegram_notification(chat_id: int, ticket_id: int, subject: str, message_type: str, status: str = None):
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    if not bot_token:
        return
    
    if message_type == 'reply':
        text = f'📩 Новый ответ на ваше обращение\n\n🎫 Тикет: {subject}'
    elif message_type == 'status_change':
        status_text = {'open': 'Открыт', 'in_progress': 'В работе', 'closed': 'Закрыт'}
        text = f'🔔 Статус вашего обращения изменён\n\n🎫 Тикет: {subject}\n📊 Новый статус: {status_text.get(status, status)}'
    else:
        return
    
    keyboard = {
        'inline_keyboard': [[
            {
                'text': '👁️ Перейти к обращению',
                'url': f'https://play.devilrust.ru/support/ticket/{ticket_id}'
            }
        ]]
    }
    
    try:
        requests.post(
            f'https://api.telegram.org/bot{bot_token}/sendMessage',
            json={
                'chat_id': chat_id,
                'text': text,
                'reply_markup': keyboard
            },
            timeout=5
        )
    except Exception as e:
        print(f'Telegram notification error: {e}')


def send_user_notification(chat_id: str, ticket_id: int, subject: str, server: str, message: str):
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    if not bot_token:
        return
    
    try:
        notification_text = f"✉️ Новый ответ от администратора\n\n" \
                          f"📋 Тикет: {subject}\n" \
                          f"📍 Сервер: {server}\n\n" \
                          f"💬 Сообщение:\n{message[:200]}{'...' if len(message) > 200 else ''}"
        
        ticket_url = f"https://play.devilrust.ru/support/ticket/{ticket_id}"
        
        keyboard = {
            "inline_keyboard": [[
                {"text": "Открыть обращение", "url": ticket_url}
            ]]
        }
        
        requests.post(
            f'https://api.telegram.org/bot{bot_token}/sendMessage',
            json={
                'chat_id': chat_id,
                'text': notification_text,
                'reply_markup': keyboard
            }
        )
    except Exception as e:
        print(f'Failed to send user notification: {e}')


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