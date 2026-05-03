import json
import os
import jwt
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, Optional

def escape_sql(value: str) -> str:
    return value.replace("'", "''")

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    API жалоб и апелляций.
    GET  ?action=public_list         — список всех (авторизован)
    GET  ?action=dashboard           — мои жалобы
    GET  ?action=list                — все жалобы (adminpanel)
    GET  ?action=list_moderators     — список модераторов (adminpanel)
    POST ?action=add_moderator       — добавить модератора (adminpanel)
    DELETE ?action=remove_moderator&mod_id=X — удалить модератора (adminpanel)
    POST ?action=create              — создать жалобу/апелляцию
    GET  ?complaint_id=X             — детали
    POST ?action=reply&complaint_id=X
    PUT  ?action=close&complaint_id=X
    PUT  ?action=status&complaint_id=X
    DELETE ?complaint_id=X
    POST ?action=block_user
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

    # Определяем права
    user_data = enrich_permissions(user_data)

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
    elif method == 'GET' and action == 'list_moderators':
        return list_moderators(user_data)
    elif method == 'POST' and action == 'add_moderator':
        return add_moderator(event, user_data)
    elif method == 'DELETE' and action == 'remove_moderator':
        return remove_moderator(params, user_data)
    elif method == 'POST' and action == 'rate' and complaint_id:
        return rate_complaint(complaint_id, event, user_data)
    elif method == 'GET' and complaint_id:
        return get_complaint_details(complaint_id, user_data)
    elif method == 'POST' and action == 'reply' and complaint_id:
        return add_reply(complaint_id, event, user_data)
    elif method == 'PUT' and action == 'edit_message' and complaint_id:
        return edit_message(complaint_id, event, user_data)
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
        payload = jwt.decode(token, os.environ['JWT_SECRET'], algorithms=['HS256'])
        return payload
    except:
        return None


def enrich_permissions(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Устанавливает поля: is_adminpanel, can_reply, can_close, is_moderator, mod_name.
    Источник прав:
      - AdminPanel JWT (admin_id есть) → полный доступ
      - Steam JWT → ищем steam_id в complaint_moderators
    """
    user_data = dict(user_data)

    # AdminPanel JWT — полный доступ
    if user_data.get('admin_id') and user_data.get('is_admin'):
        user_data['is_adminpanel'] = True
        user_data['can_reply'] = True
        user_data['can_close'] = True
        user_data['is_moderator'] = True
        user_data['mod_name'] = user_data.get('full_name', 'Администратор')
        if not user_data.get('user_id'):
            user_data['user_id'] = 0
        return user_data

    # Steam JWT — проверяем complaint_moderators
    steam_id = str(user_data.get('steam_id', ''))
    if steam_id:
        try:
            conn = psycopg2.connect(os.environ['DATABASE_URL'])
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(f"SELECT * FROM complaint_moderators WHERE steam_id = '{escape_sql(steam_id)}'")
            mod = cur.fetchone()
            cur.close()
            conn.close()
            if mod:
                user_data['is_moderator'] = True
                user_data['can_reply'] = bool(mod['can_reply'])
                user_data['can_close'] = bool(mod['can_close'])
                user_data['mod_name'] = mod['name']
                user_data['admin_id'] = None  # нет admin_id у Steam-модератора
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


# ── Управление модераторами (только AdminPanel) ──────────────────────────────

def list_moderators(user_data: Dict[str, Any]) -> Dict[str, Any]:
    if not user_data.get('is_adminpanel'):
        return error_response('Forbidden', 403)
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM complaint_moderators ORDER BY created_at DESC")
    mods = cur.fetchall()
    cur.close()
    conn.close()
    return ok_response({'moderators': [dict(m) for m in mods]})


def add_moderator(event: Dict[str, Any], user_data: Dict[str, Any]) -> Dict[str, Any]:
    if not user_data.get('is_adminpanel'):
        return error_response('Forbidden', 403)
    body = json.loads(event.get('body', '{}'))
    steam_id = str(body.get('steam_id', '')).strip()
    name = str(body.get('name', '')).strip()
    can_reply = bool(body.get('can_reply', True))
    can_close = bool(body.get('can_close', True))

    if not steam_id or not name:
        return error_response('steam_id and name are required')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    sid = escape_sql(steam_id)
    nm = escape_sql(name)
    cr = 'TRUE' if can_reply else 'FALSE'
    cc = 'TRUE' if can_close else 'FALSE'
    cur.execute(
        f"INSERT INTO complaint_moderators (steam_id, name, can_reply, can_close) "
        f"VALUES ('{sid}', '{nm}', {cr}, {cc}) "
        f"ON CONFLICT (steam_id) DO UPDATE SET name='{nm}', can_reply={cr}, can_close={cc} "
        f"RETURNING *"
    )
    mod = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    return ok_response({'moderator': dict(mod)}, 201)


def remove_moderator(params: Dict[str, Any], user_data: Dict[str, Any]) -> Dict[str, Any]:
    if not user_data.get('is_adminpanel'):
        return error_response('Forbidden', 403)
    mod_id = params.get('mod_id', '')
    if not mod_id:
        return error_response('mod_id is required')
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    cur.execute(f"DELETE FROM complaint_moderators WHERE id = {int(mod_id)}")
    conn.commit()
    cur.close()
    conn.close()
    return ok_response({'success': True})


# ── Пользовательские действия ─────────────────────────────────────────────────

def create_complaint(event: Dict[str, Any], user_data: Dict[str, Any]) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}'))
    complaint_against = str(body.get('complaint_against', '')).strip()
    subject = str(body.get('subject', '')).strip()
    reason = str(body.get('reason', '')).strip()
    file_url = str(body.get('file_url', '')).strip()
    complaint_type = str(body.get('complaint_type', 'complaint')).strip()

    if complaint_type not in ('complaint', 'appeal'):
        complaint_type = 'complaint'
    if not subject or not reason:
        return error_response('subject and reason are required')
    if complaint_type == 'complaint' and not complaint_against:
        return error_response('complaint_against is required for complaints')
    if not complaint_against:
        complaint_against = 'player'
    if complaint_against not in ('admin', 'player'):
        return error_response('complaint_against must be admin or player')

    user_id = int(user_data.get('user_id', 0))
    if not user_id:
        return error_response('Forbidden', 403)

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(f"SELECT is_blocked FROM users WHERE id = {user_id}")
    user = cur.fetchone()
    if user and user['is_blocked']:
        cur.close(); conn.close()
        return error_response('Ваш аккаунт заблокирован.', 403)

    s = escape_sql(subject); r = escape_sql(reason)
    f = f"'{escape_sql(file_url)}'" if file_url else 'NULL'
    t = escape_sql(complaint_type); ca = escape_sql(complaint_against)

    cur.execute(
        f"INSERT INTO complaints (user_id, complaint_against, subject, reason, file_url, complaint_type) "
        f"VALUES ({user_id}, '{ca}', '{s}', '{r}', {f}, '{t}') RETURNING *"
    )
    complaint = cur.fetchone()
    cid = int(complaint['id'])
    cur.execute(
        f"INSERT INTO complaint_messages (complaint_id, user_id, message, file_url) "
        f"VALUES ({cid}, {user_id}, '{r}', {f}) RETURNING *"
    )
    first_message = cur.fetchone()
    conn.commit(); cur.close(); conn.close()
    return ok_response({'complaint': dict(complaint), 'message': dict(first_message)}, 201)


def get_dashboard(user_data: Dict[str, Any]) -> Dict[str, Any]:
    user_id = int(user_data.get('user_id', 0))
    is_moderator = user_data.get('is_moderator', False)

    # Модераторы без user_id (Steam-аккаунт не в users) — возвращаем базовые данные
    if not user_id:
        if is_moderator:
            return ok_response({'is_blocked': False, 'is_moderator': True, 'complaints': []})
        return error_response('Forbidden', 403)

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(f"SELECT is_blocked FROM users WHERE id = {user_id}")
    user = cur.fetchone()
    if not user:
        cur.close(); conn.close()
        if is_moderator:
            return ok_response({'is_blocked': False, 'is_moderator': True, 'complaints': []})
        return error_response('User not found', 404)
    cur.execute(f"""
        SELECT c.*,
               (SELECT COUNT(*) FROM complaint_messages WHERE complaint_id = c.id) as message_count
        FROM complaints c WHERE c.user_id = {user_id} ORDER BY c.created_at DESC
    """)
    complaints = cur.fetchall()
    cur.close(); conn.close()
    return ok_response({
        'is_blocked': user['is_blocked'],
        'is_moderator': is_moderator,
        'complaints': [dict(c) for c in complaints]
    })


def get_public_list(user_data: Dict[str, Any]) -> Dict[str, Any]:
    user_id = int(user_data.get('user_id', 0))
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(f"""
        SELECT c.id, c.complaint_against, c.complaint_type, c.subject, c.status,
               c.created_at, c.updated_at, c.user_id,
               u.steam_username, u.steam_avatar,
               (SELECT COUNT(*) FROM complaint_messages WHERE complaint_id = c.id) as message_count,
               (c.user_id = {user_id}) as is_own
        FROM complaints c LEFT JOIN users u ON c.user_id = u.id
        ORDER BY CASE WHEN c.status='open' THEN 0 WHEN c.status='in_progress' THEN 1 ELSE 2 END, c.created_at DESC
    """)
    complaints = cur.fetchall()
    cur.close(); conn.close()
    return ok_response({
        'complaints': [dict(c) for c in complaints],
        'is_moderator': user_data.get('is_moderator', False),
        'is_adminpanel': user_data.get('is_adminpanel', False),
    })


def list_complaints(user_data: Dict[str, Any]) -> Dict[str, Any]:
    if not user_data.get('is_adminpanel') and not user_data.get('is_moderator'):
        return error_response('Forbidden', 403)
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("""
        SELECT c.*, u.steam_username, u.steam_avatar, u.steam_id, u.is_blocked as user_is_blocked,
               (SELECT COUNT(*) FROM complaint_messages WHERE complaint_id = c.id) as message_count
        FROM complaints c LEFT JOIN users u ON c.user_id = u.id ORDER BY c.created_at DESC
    """)
    complaints = cur.fetchall()
    cur.close(); conn.close()
    return ok_response({'complaints': [dict(c) for c in complaints]})


def get_complaint_details(complaint_id: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
    user_id = int(user_data.get('user_id', 0))
    cid = int(complaint_id)
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(f"""
        SELECT c.*, u.steam_username, u.steam_avatar, u.steam_id, u.is_blocked as user_is_blocked
        FROM complaints c LEFT JOIN users u ON c.user_id = u.id WHERE c.id = {cid}
    """)
    complaint = cur.fetchone()
    if not complaint:
        cur.close(); conn.close()
        return error_response('Complaint not found', 404)
    cur.execute(f"""
        SELECT cm.*, u.steam_username as user_name, u.steam_avatar as user_avatar,
               COALESCE(cm.admin_name, m.name) as admin_name,
               CASE WHEN m.rating_count > 0 THEN ROUND(m.rating_sum::numeric / m.rating_count, 1) ELSE NULL END as mod_rating,
               m.rating_count as mod_rating_count
        FROM complaint_messages cm
        LEFT JOIN users u ON cm.user_id = u.id AND cm.is_admin_reply = FALSE
        LEFT JOIN complaint_moderators m ON cm.moderator_steam_id = m.steam_id AND cm.is_admin_reply = TRUE
        WHERE cm.complaint_id = {cid} ORDER BY cm.created_at ASC
    """)
    messages = cur.fetchall()
    cur.close(); conn.close()
    d = dict(complaint)
    d['is_own'] = (int(complaint['user_id']) == user_id)
    return ok_response({'complaint': d, 'messages': [dict(m) for m in messages]})


def add_reply(complaint_id: str, event: Dict[str, Any], user_data: Dict[str, Any]) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}'))
    message = str(body.get('message', '')).strip()
    file_url = str(body.get('file_url', '')).strip()
    if not message:
        return error_response('Message is required')

    user_id = int(user_data.get('user_id', 0))
    can_reply = user_data.get('can_reply', False)
    cid = int(complaint_id)

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(f"SELECT * FROM complaints WHERE id = {cid}")
    complaint = cur.fetchone()
    if not complaint:
        cur.close(); conn.close()
        return error_response('Complaint not found', 404)
    if complaint['status'] == 'closed':
        cur.close(); conn.close()
        return error_response('Жалоба закрыта. Отвечать нельзя.', 403)

    is_author = (int(complaint['user_id']) == user_id)
    if not can_reply and not is_author:
        cur.close(); conn.close()
        return error_response('Forbidden', 403)

    msg_e = escape_sql(message)
    f = f"'{escape_sql(file_url)}'" if file_url else 'NULL'
    is_mod_reply = can_reply and not is_author
    is_admin_reply = 'TRUE' if is_mod_reply else 'FALSE'

    # Для модератора сохраняем steam_id; для AdminPanel user_id = NULL
    mod_steam = user_data.get('steam_id', '')
    mod_steam_sql = f"'{escape_sql(str(mod_steam))}'" if mod_steam and is_mod_reply else 'NULL'
    uid_sql = 'NULL' if (is_mod_reply and not user_id) else str(user_id if user_id else 'NULL')

    display_name = ''
    admin_name_sql = 'NULL'
    if is_mod_reply:
        display_name = user_data.get('mod_name') or user_data.get('full_name', 'Администратор')
        admin_name_sql = f"'{escape_sql(display_name)}'"

    cur.execute(
        f"INSERT INTO complaint_messages (complaint_id, user_id, message, file_url, is_admin_reply, moderator_steam_id, admin_name) "
        f"VALUES ({cid}, {uid_sql}, '{msg_e}', {f}, {is_admin_reply}, {mod_steam_sql}, {admin_name_sql}) RETURNING *"
    )
    msg = cur.fetchone()

    new_status = 'in_progress' if is_mod_reply else complaint['status']
    cur.execute(f"UPDATE complaints SET updated_at=CURRENT_TIMESTAMP, status='{new_status}' WHERE id={cid}")
    conn.commit(); cur.close(); conn.close()

    msg_dict = dict(msg)
    if is_mod_reply:
        msg_dict['admin_name'] = display_name
    return ok_response({'message': msg_dict}, 201)


def close_complaint(complaint_id: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
    user_id = int(user_data.get('user_id', 0))
    can_close = user_data.get('can_close', False)
    cid = int(complaint_id)

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(f"SELECT * FROM complaints WHERE id = {cid}")
    complaint = cur.fetchone()
    if not complaint:
        cur.close(); conn.close()
        return error_response('Complaint not found', 404)
    if complaint['status'] == 'closed':
        cur.close(); conn.close()
        return error_response('Жалоба уже закрыта', 400)

    is_author = (user_id and int(complaint['user_id']) == user_id)
    if not can_close and not is_author:
        cur.close(); conn.close()
        return error_response('Forbidden', 403)

    # Сохраняем steam_id того кто закрыл — для рейтинга.
    # AdminPanel-admin не имеет steam_id, поэтому closed_by остаётся NULL (рейтинг не предлагается)
    closer_steam = user_data.get('steam_id', '')
    closed_by_sql = f"'{escape_sql(str(closer_steam))}'" if closer_steam and not is_author else 'NULL'

    cur.execute(
        f"UPDATE complaints SET status='closed', updated_at=CURRENT_TIMESTAMP, "
        f"closed_by_steam_id={closed_by_sql} WHERE id={cid} RETURNING *"
    )
    updated = cur.fetchone()
    conn.commit(); cur.close(); conn.close()
    return ok_response({'complaint': dict(updated)})


def rate_complaint(complaint_id: str, event: Dict[str, Any], user_data: Dict[str, Any]) -> Dict[str, Any]:
    """Оценка закрытой жалобы автором — обновляет рейтинг модератора."""
    user_id = int(user_data.get('user_id', 0))
    if not user_id:
        return error_response('Forbidden', 403)

    body = json.loads(event.get('body', '{}'))
    rating = int(body.get('rating', 0))
    comment = str(body.get('comment', '')).strip()

    if rating < 1 or rating > 5:
        return error_response('Rating must be 1-5')

    cid = int(complaint_id)
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute(f"SELECT * FROM complaints WHERE id = {cid}")
    complaint = cur.fetchone()
    if not complaint:
        cur.close(); conn.close()
        return error_response('Complaint not found', 404)
    if int(complaint['user_id']) != user_id:
        cur.close(); conn.close()
        return error_response('Forbidden', 403)
    if complaint['status'] != 'closed':
        cur.close(); conn.close()
        return error_response('Можно оценивать только закрытые темы', 400)
    if complaint.get('rating'):
        cur.close(); conn.close()
        return error_response('Вы уже оценили это обращение', 400)

    comment_sql = f"'{escape_sql(comment)}'" if comment else 'NULL'
    cur.execute(
        f"UPDATE complaints SET rating={rating}, rating_comment={comment_sql}, "
        f"rated_at=CURRENT_TIMESTAMP WHERE id={cid} RETURNING *"
    )
    updated = cur.fetchone()

    # Обновляем рейтинг модератора (если жалобу закрыл модератор из complaint_moderators)
    mod_steam = complaint.get('closed_by_steam_id', '')
    if mod_steam:
        sid = escape_sql(str(mod_steam))
        cur.execute(
            f"UPDATE complaint_moderators SET rating_sum = rating_sum + {rating}, "
            f"rating_count = rating_count + 1 WHERE steam_id = '{sid}'"
        )

    conn.commit(); cur.close(); conn.close()
    return ok_response({'complaint': dict(updated)})


def update_status(complaint_id: str, event: Dict[str, Any], user_data: Dict[str, Any]) -> Dict[str, Any]:
    if not user_data.get('can_close') and not user_data.get('is_adminpanel'):
        return error_response('Forbidden', 403)
    body = json.loads(event.get('body', '{}'))
    status = str(body.get('status', '')).strip()
    if status not in ('open', 'in_progress', 'closed'):
        return error_response('Invalid status')
    cid = int(complaint_id)
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(f"UPDATE complaints SET status='{status}', updated_at=CURRENT_TIMESTAMP WHERE id={cid} RETURNING *")
    complaint = cur.fetchone()
    conn.commit(); cur.close(); conn.close()
    return ok_response({'complaint': dict(complaint)})


def delete_complaint(complaint_id: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
    if not user_data.get('is_adminpanel'):
        return error_response('Forbidden', 403)
    cid = int(complaint_id)
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    cur.execute(f"DELETE FROM complaint_messages WHERE complaint_id = {cid}")
    cur.execute(f"DELETE FROM complaints WHERE id = {cid}")
    conn.commit(); cur.close(); conn.close()
    return ok_response({'success': True})


def edit_message(complaint_id: str, event: Dict[str, Any], user_data: Dict[str, Any]) -> Dict[str, Any]:
    """Редактирование сообщения жалобы. Пользователь редактирует своё, модератор/админ своё. Только если жалоба не закрыта."""
    cid = int(complaint_id)
    body = json.loads(event.get('body', '{}'))
    message_id = body.get('message_id')
    new_text = str(body.get('message', '')).strip()

    if not message_id or not new_text:
        return error_response('message_id and message are required')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute(f"SELECT status FROM complaints WHERE id = {cid}")
    complaint = cur.fetchone()
    if not complaint:
        cur.close(); conn.close()
        return error_response('Complaint not found', 404)
    if complaint['status'] == 'closed':
        cur.close(); conn.close()
        return error_response('Нельзя редактировать сообщения закрытой жалобы', 403)

    cur.execute(f"SELECT * FROM complaint_messages WHERE id = {int(message_id)} AND complaint_id = {cid}")
    msg = cur.fetchone()
    if not msg:
        cur.close(); conn.close()
        return error_response('Message not found', 404)

    is_mod = user_data.get('is_moderator') or user_data.get('is_adminpanel')
    if is_mod:
        if not msg['is_admin_reply']:
            cur.close(); conn.close()
            return error_response('Модератор может редактировать только свои сообщения', 403)
    else:
        if msg['is_admin_reply']:
            cur.close(); conn.close()
            return error_response('Вы можете редактировать только свои сообщения', 403)
        if msg['user_id'] != int(user_data.get('user_id', -1)):
            cur.close(); conn.close()
            return error_response('Вы можете редактировать только свои сообщения', 403)

    text_escaped = escape_sql(new_text)
    cur.execute(f"UPDATE complaint_messages SET message = '{text_escaped}' WHERE id = {int(message_id)} RETURNING *")
    updated = cur.fetchone()
    conn.commit(); cur.close(); conn.close()
    return ok_response({'message': dict(updated)})


def block_user(event: Dict[str, Any], user_data: Dict[str, Any]) -> Dict[str, Any]:
    if not user_data.get('is_adminpanel'):
        return error_response('Forbidden', 403)
    body = json.loads(event.get('body', '{}'))
    target_user_id = body.get('user_id')
    block = bool(body.get('block', True))
    if not target_user_id:
        return error_response('user_id is required')
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(f"UPDATE users SET is_blocked={'TRUE' if block else 'FALSE'} WHERE id={int(target_user_id)} RETURNING id, steam_username, is_blocked")
    user = cur.fetchone()
    conn.commit(); cur.close(); conn.close()
    if not user:
        return error_response('User not found', 404)
    return ok_response({'user': dict(user)})