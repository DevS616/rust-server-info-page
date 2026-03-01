import json
import os
import jwt
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, Optional
from datetime import datetime

def escape_sql(value: str) -> str:
    return value.replace("'", "''")

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    API для работы с жалобами.
    POST ?action=create          — создание жалобы (авторизован)
    GET  ?action=dashboard       — мои жалобы (авторизован)
    GET  ?action=public_list     — все жалобы публично (авторизован)
    GET  ?complaint_id=X         — детали жалобы (авторизован, автор или любой авторизованный)
    POST ?action=reply&complaint_id=X — добавить ответ (автор или admin)
    PUT  ?action=close&complaint_id=X — закрыть тему (автор своей или admin любой)
    PUT  ?action=status&complaint_id=X — изменить статус (только admin)
    DELETE ?complaint_id=X       — удалить жалобу (только admin)
    POST ?action=block_user      — заблокировать пользователя (только admin)
    """
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

    # Обогащаем user_data флагом is_admin из таблицы admins по steam_id
    user_data = enrich_with_admin_status(user_data)

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')
    complaint_id = params.get('complaint_id', '')

    if method == 'POST' and action == 'create':
        return create_complaint(event, user_data)
    elif method == 'GET' and action == 'dashboard':
        return get_dashboard(user_data)
    elif method == 'GET' and action == 'public_list':
        return get_public_list(user_data)
    elif method == 'GET' and action == 'list':
        return list_complaints(user_data)
    elif method == 'GET' and complaint_id:
        return get_complaint_details(complaint_id, user_data)
    elif method == 'POST' and action == 'reply' and complaint_id:
        return add_reply(complaint_id, event, user_data)
    elif method == 'PUT' and action == 'close' and complaint_id:
        return close_complaint(complaint_id, user_data)
    elif method == 'PUT' and action == 'status' and complaint_id:
        return update_status(complaint_id, event, user_data)
    elif method == 'DELETE' and complaint_id:
        return delete_complaint(complaint_id, user_data)
    elif method == 'POST' and action == 'block_user':
        return block_user(event, user_data)

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


def enrich_with_admin_status(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """Проверяет, является ли пользователь администратором по steam_id в таблице admins."""
    steam_id = str(user_data.get('steam_id', ''))
    if not steam_id:
        return user_data
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(f"SELECT id, full_name, role FROM admins WHERE steam_id = '{escape_sql(steam_id)}'")
        admin = cur.fetchone()
        cur.close()
        conn.close()
        if admin:
            user_data = dict(user_data)
            user_data['is_admin'] = True
            user_data['admin_id'] = int(admin['id'])
            user_data['admin_name'] = admin['full_name'] or 'Администратор'
            user_data['admin_role'] = admin['role']
    except:
        pass
    return user_data


def error_response(message: str, status: int = 400) -> Dict[str, Any]:
    return {
        'statusCode': status,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': message}),
        'isBase64Encoded': False
    }


def ok_response(data: dict, status: int = 200) -> Dict[str, Any]:
    return {
        'statusCode': status,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(data, default=str),
        'isBase64Encoded': False
    }


def create_complaint(event: Dict[str, Any], user_data: Dict[str, Any]) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}'))
    complaint_against = body.get('complaint_against', '').strip()
    subject = body.get('subject', '').strip()
    reason = body.get('reason', '').strip()
    file_url = body.get('file_url', '').strip()

    if not complaint_against or not subject or not reason:
        return error_response('complaint_against, subject and reason are required')

    if complaint_against not in ('admin', 'player'):
        return error_response('complaint_against must be admin or player')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)

    user_id = int(user_data['user_id'])
    cur.execute(f"SELECT is_blocked FROM users WHERE id = {user_id}")
    user = cur.fetchone()

    if user and user['is_blocked']:
        cur.close()
        conn.close()
        return error_response('Ваш аккаунт заблокирован.', 403)

    subject_e = escape_sql(subject)
    reason_e = escape_sql(reason)
    file_sql = f"'{escape_sql(file_url)}'" if file_url else 'NULL'

    cur.execute(
        f"INSERT INTO complaints (user_id, complaint_against, subject, reason, file_url) "
        f"VALUES ({user_id}, '{complaint_against}', '{subject_e}', '{reason_e}', {file_sql}) RETURNING *"
    )
    complaint = cur.fetchone()
    complaint_id = int(complaint['id'])

    cur.execute(
        f"INSERT INTO complaint_messages (complaint_id, user_id, message, file_url) "
        f"VALUES ({complaint_id}, {user_id}, '{reason_e}', {file_sql}) RETURNING *"
    )
    first_message = cur.fetchone()

    conn.commit()
    cur.close()
    conn.close()

    return ok_response({'complaint': dict(complaint), 'message': dict(first_message)}, 201)


def get_dashboard(user_data: Dict[str, Any]) -> Dict[str, Any]:
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)

    user_id = int(user_data['user_id'])

    cur.execute(f"SELECT is_blocked FROM users WHERE id = {user_id}")
    user = cur.fetchone()

    if not user:
        cur.close()
        conn.close()
        return error_response('User not found', 404)

    cur.execute(f"""
        SELECT c.*,
               (SELECT COUNT(*) FROM complaint_messages WHERE complaint_id = c.id) as message_count,
               (SELECT COUNT(*) FROM complaint_messages WHERE complaint_id = c.id AND is_admin_reply = TRUE) as unread_count
        FROM complaints c
        WHERE c.user_id = {user_id}
        ORDER BY c.created_at DESC
    """)
    complaints = cur.fetchall()

    cur.close()
    conn.close()

    return ok_response({
        'is_blocked': user['is_blocked'],
        'is_admin': user_data.get('is_admin', False),
        'complaints': [dict(c) for c in complaints]
    })


def get_public_list(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """Возвращает публичный список всех жалоб для авторизованных пользователей."""
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)

    user_id = int(user_data['user_id'])
    is_admin = user_data.get('is_admin', False)

    cur.execute(f"""
        SELECT c.id, c.complaint_against, c.subject, c.status, c.created_at, c.updated_at,
               c.user_id,
               u.steam_username, u.steam_avatar,
               (SELECT COUNT(*) FROM complaint_messages WHERE complaint_id = c.id) as message_count,
               (c.user_id = {user_id}) as is_own
        FROM complaints c
        LEFT JOIN users u ON c.user_id = u.id
        ORDER BY
            CASE WHEN c.status = 'open' THEN 0
                 WHEN c.status = 'in_progress' THEN 1
                 ELSE 2 END,
            c.created_at DESC
    """)
    complaints = cur.fetchall()

    cur.close()
    conn.close()

    return ok_response({
        'complaints': [dict(c) for c in complaints],
        'is_admin': is_admin,
        'current_user_id': user_id
    })


def list_complaints(user_data: Dict[str, Any]) -> Dict[str, Any]:
    if not user_data.get('is_admin'):
        return error_response('Forbidden', 403)

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute(f"""
        SELECT c.*,
               u.steam_username, u.steam_avatar, u.steam_id, u.is_blocked as user_is_blocked,
               (SELECT COUNT(*) FROM complaint_messages WHERE complaint_id = c.id) as message_count
        FROM complaints c
        LEFT JOIN users u ON c.user_id = u.id
        ORDER BY c.created_at DESC
    """)
    complaints = cur.fetchall()

    cur.close()
    conn.close()

    return ok_response({'complaints': [dict(c) for c in complaints]})


def get_complaint_details(complaint_id: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)

    user_id = int(user_data.get('user_id') or user_data.get('id') or 0)
    is_admin = user_data.get('is_admin', False)
    cid = int(complaint_id)

    cur.execute(f"""
        SELECT c.*, u.steam_username, u.steam_avatar, u.steam_id, u.is_blocked as user_is_blocked
        FROM complaints c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.id = {cid}
    """)
    complaint = cur.fetchone()

    if not complaint:
        cur.close()
        conn.close()
        return error_response('Complaint not found', 404)

    # Любой авторизованный пользователь может просматривать жалобы
    cur.execute(f"""
        SELECT cm.*, u.steam_username as user_name, u.steam_avatar as user_avatar,
               a.full_name as admin_name
        FROM complaint_messages cm
        LEFT JOIN users u ON cm.user_id = u.id AND cm.is_admin_reply = FALSE
        LEFT JOIN admins a ON cm.user_id = a.id AND cm.is_admin_reply = TRUE
        WHERE cm.complaint_id = {cid}
        ORDER BY cm.created_at ASC
    """)
    messages = cur.fetchall()

    cur.close()
    conn.close()

    complaint_dict = dict(complaint)
    complaint_dict['is_own'] = (int(complaint['user_id']) == user_id)

    return ok_response({'complaint': complaint_dict, 'messages': [dict(m) for m in messages]})


def add_reply(complaint_id: str, event: Dict[str, Any], user_data: Dict[str, Any]) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}'))
    message = body.get('message', '').strip()
    file_url = body.get('file_url', '').strip()

    if not message:
        return error_response('Message is required')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)

    user_id = int(user_data['user_id'])
    is_admin = user_data.get('is_admin', False)
    cid = int(complaint_id)

    cur.execute(f"SELECT * FROM complaints WHERE id = {cid}")
    complaint = cur.fetchone()

    if not complaint:
        cur.close()
        conn.close()
        return error_response('Complaint not found', 404)

    if complaint['status'] == 'closed':
        cur.close()
        conn.close()
        return error_response('Жалоба закрыта. Отвечать нельзя.', 403)

    # Отвечать может: автор жалобы или админ
    if not is_admin and int(complaint['user_id']) != user_id:
        cur.close()
        conn.close()
        return error_response('Forbidden', 403)

    message_e = escape_sql(message)
    file_sql = f"'{escape_sql(file_url)}'" if file_url else 'NULL'
    is_admin_reply = 'TRUE' if is_admin else 'FALSE'
    # Для is_admin_reply используем admin_id если есть, иначе user_id
    writer_id = user_data.get('admin_id', user_id) if is_admin else user_id

    cur.execute(
        f"INSERT INTO complaint_messages (complaint_id, user_id, message, file_url, is_admin_reply) "
        f"VALUES ({cid}, {writer_id}, '{message_e}', {file_sql}, {is_admin_reply}) RETURNING *"
    )
    msg = cur.fetchone()

    new_status = 'in_progress' if is_admin else complaint['status']
    cur.execute(f"UPDATE complaints SET updated_at = CURRENT_TIMESTAMP, status = '{new_status}' WHERE id = {cid}")

    conn.commit()
    cur.close()
    conn.close()

    msg_dict = dict(msg)
    if is_admin:
        msg_dict['admin_name'] = user_data.get('admin_name', 'Администратор')
    else:
        msg_dict['user_name'] = user_data.get('username', '')

    return ok_response({'message': msg_dict}, 201)


def close_complaint(complaint_id: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
    """Закрыть жалобу может автор (своя) или любой администратор."""
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)

    user_id = int(user_data['user_id'])
    is_admin = user_data.get('is_admin', False)
    cid = int(complaint_id)

    cur.execute(f"SELECT * FROM complaints WHERE id = {cid}")
    complaint = cur.fetchone()

    if not complaint:
        cur.close()
        conn.close()
        return error_response('Complaint not found', 404)

    if complaint['status'] == 'closed':
        cur.close()
        conn.close()
        return error_response('Жалоба уже закрыта', 400)

    # Закрыть может: автор (только свою) или любой admin
    if not is_admin and int(complaint['user_id']) != user_id:
        cur.close()
        conn.close()
        return error_response('Forbidden', 403)

    cur.execute(f"UPDATE complaints SET status = 'closed', updated_at = CURRENT_TIMESTAMP WHERE id = {cid} RETURNING *")
    updated = cur.fetchone()

    conn.commit()
    cur.close()
    conn.close()

    return ok_response({'complaint': dict(updated)})


def update_status(complaint_id: str, event: Dict[str, Any], user_data: Dict[str, Any]) -> Dict[str, Any]:
    if not user_data.get('is_admin'):
        return error_response('Forbidden', 403)

    body = json.loads(event.get('body', '{}'))
    status = body.get('status', '').strip()

    if status not in ('open', 'in_progress', 'closed'):
        return error_response('Invalid status')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cid = int(complaint_id)

    cur.execute(f"UPDATE complaints SET status = '{status}', updated_at = CURRENT_TIMESTAMP WHERE id = {cid} RETURNING *")
    complaint = cur.fetchone()

    conn.commit()
    cur.close()
    conn.close()

    return ok_response({'complaint': dict(complaint)})


def delete_complaint(complaint_id: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
    if not user_data.get('is_admin'):
        return error_response('Forbidden', 403)

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    cid = int(complaint_id)

    cur.execute(f"DELETE FROM complaint_messages WHERE complaint_id = {cid}")
    cur.execute(f"DELETE FROM complaints WHERE id = {cid}")

    conn.commit()
    cur.close()
    conn.close()

    return ok_response({'success': True})


def block_user(event: Dict[str, Any], user_data: Dict[str, Any]) -> Dict[str, Any]:
    if not user_data.get('is_admin'):
        return error_response('Forbidden', 403)

    body = json.loads(event.get('body', '{}'))
    target_user_id = body.get('user_id')
    block = body.get('block', True)

    if not target_user_id:
        return error_response('user_id is required')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute(f"UPDATE users SET is_blocked = {str(block).upper()} WHERE id = {int(target_user_id)} RETURNING id, steam_username, is_blocked")
    user = cur.fetchone()

    conn.commit()
    cur.close()
    conn.close()

    if not user:
        return error_response('User not found', 404)

    return ok_response({'user': dict(user)})
