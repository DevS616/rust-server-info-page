import json
import os
import jwt
import base64
import boto3
import uuid
import hashlib
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, Optional, List

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400'
}


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''API опросов и голосований: публичный просмотр/голосование и CRUD для админов'''
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': '', 'isBase64Encoded': False}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')
    headers_dict = event.get('headers') or {}
    token = headers_dict.get('x-auth-token') or headers_dict.get('X-Auth-Token')

    if method == 'GET' and action == 'admin-list':
        if not verify_admin_token(token):
            return error_response('Unauthorized', 401)
        return get_admin_polls()

    if method == 'GET':
        poll_id = params.get('id')
        if poll_id:
            return get_poll(poll_id, event)
        return get_active_polls(event)

    if method == 'POST' and action == 'vote':
        return vote(event)

    if not verify_admin_token(token):
        return error_response('Unauthorized', 401)

    if method == 'POST' and action == 'upload':
        return upload_inline_image(event)
    if method == 'POST':
        return create_poll(event)
    if method == 'PUT':
        return update_poll(event)
    if method == 'DELETE':
        poll_id = params.get('id', '')
        if poll_id:
            return delete_poll(poll_id)

    return error_response('Not found', 404)


def escape_sql(value: str) -> str:
    return value.replace("'", "''")


def verify_admin_token(token: Optional[str]) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    try:
        secret = os.environ['JWT_SECRET']
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        if not payload.get('is_admin'):
            return None
        return payload
    except Exception:
        return None


def error_response(message: str, status_code: int = 400) -> Dict[str, Any]:
    return {
        'statusCode': status_code,
        'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
        'body': json.dumps({'error': message}),
        'isBase64Encoded': False
    }


def json_response(data: Any, status_code: int = 200) -> Dict[str, Any]:
    return {
        'statusCode': status_code,
        'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
        'body': json.dumps(data, default=str),
        'isBase64Encoded': False
    }


def get_voter_key(event: Dict[str, Any], body: Dict[str, Any]) -> str:
    steam_id = (body.get('steam_id') or '').strip()
    if steam_id:
        return f"steam:{steam_id}"
    ip = ((event.get('requestContext') or {}).get('identity') or {}).get('sourceIp', '')
    ua = (event.get('headers') or {}).get('user-agent', '') or (event.get('headers') or {}).get('User-Agent', '')
    raw = f"{ip}|{ua}"
    return "ip:" + hashlib.sha256(raw.encode()).hexdigest()[:32]


def upload_image(base64_data: str, image_type: str) -> str:
    file_data = base64.b64decode(base64_data)
    filename = f"polls/{uuid.uuid4().hex}.{image_type}"
    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
    )
    content_types = {
        'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
        'gif': 'image/gif', 'webp': 'image/webp'
    }
    content_type = content_types.get(image_type.lower(), 'image/jpeg')
    s3.put_object(Bucket='files', Key=filename, Body=file_data, ContentType=content_type)
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{filename}"


def upload_inline_image(event: Dict[str, Any]) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}') or '{}')
    image_base64 = body.get('image_base64')
    image_type = body.get('image_type', 'jpg')
    if not image_base64:
        return error_response('image_base64 is required')
    url = upload_image(image_base64, image_type)
    return json_response({'url': url})


def _connect():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def _poll_with_options(cur, poll_row: Dict[str, Any], voter_key: Optional[str], include_admin: bool = False) -> Dict[str, Any]:
    poll = dict(poll_row)
    pid = poll['id']

    note_col = ', o.admin_note' if include_admin else ''
    cur.execute(f"""
        SELECT o.id, o.text, o.image_url, o.position{note_col},
               (SELECT COUNT(*) FROM poll_votes v WHERE v.option_id = o.id) AS votes
        FROM poll_options o
        WHERE o.poll_id = {int(pid)}
        ORDER BY o.position ASC, o.id ASC
    """)
    options = [dict(r) for r in cur.fetchall()]
    for o in options:
        o['votes'] = int(o['votes'])

    for o in options:
        cur.execute(f"""
            SELECT voter_name, voter_avatar, voter_steam_id, created_at
            FROM poll_votes
            WHERE option_id = {int(o['id'])}
            ORDER BY created_at ASC, id ASC
        """)
        voters = []
        for vr in cur.fetchall():
            voters.append({
                'name': vr['voter_name'] or 'Игрок',
                'avatar': vr['voter_avatar'] or '',
                'steam_id': vr['voter_steam_id'] or '',
            })
        o['voters'] = voters
        o['voters_preview'] = voters[:5]

    total = sum(o['votes'] for o in options)
    poll['total_votes'] = total

    my_votes: List[int] = []
    if voter_key:
        cur.execute(f"""
            SELECT option_id FROM poll_votes
            WHERE poll_id = {int(pid)} AND voter_key = '{escape_sql(voter_key)}'
        """)
        my_votes = [int(r['option_id']) for r in cur.fetchall()]
    poll['my_votes'] = my_votes
    poll['has_voted'] = len(my_votes) > 0

    ends_at = poll.get('ends_at')
    is_finished = False
    if ends_at:
        try:
            end_dt = ends_at if isinstance(ends_at, datetime) else datetime.fromisoformat(str(ends_at))
            is_finished = datetime.utcnow() >= end_dt
        except Exception:
            is_finished = False
    poll['is_finished'] = is_finished

    winner_id = None
    if is_finished and options:
        max_votes = max(o['votes'] for o in options)
        if max_votes > 0:
            top = [o['id'] for o in options if o['votes'] == max_votes]
            if len(top) == 1:
                winner_id = top[0]
            else:
                placeholders = ','.join(str(int(x)) for x in top)
                cur.execute(f"""
                    SELECT option_id FROM poll_votes
                    WHERE poll_id = {int(pid)} AND option_id IN ({placeholders})
                    ORDER BY created_at DESC, id DESC LIMIT 1
                """)
                row = cur.fetchone()
                if row:
                    winner_id = int(row['option_id'])
    poll['winner_option_id'] = winner_id

    poll['options'] = options
    return poll


def get_active_polls(event: Dict[str, Any]) -> Dict[str, Any]:
    conn = _connect()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM polls WHERE is_active = TRUE ORDER BY created_at DESC")
    rows = cur.fetchall()
    result = [_poll_with_options(cur, r, None) for r in rows]
    cur.close()
    conn.close()
    return json_response({'polls': result})


def get_poll(poll_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    try:
        pid = int(poll_id)
    except ValueError:
        return error_response('Invalid id')
    params = event.get('queryStringParameters') or {}
    steam_id = (params.get('steam_id') or '').strip()
    voter_key = f"steam:{steam_id}" if steam_id else None

    conn = _connect()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(f"SELECT * FROM polls WHERE id = {pid}")
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return error_response('Poll not found', 404)
    poll = _poll_with_options(cur, row, voter_key)
    cur.close()
    conn.close()
    return json_response({'poll': poll})


def get_admin_polls() -> Dict[str, Any]:
    conn = _connect()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM polls ORDER BY created_at DESC")
    rows = cur.fetchall()
    result = [_poll_with_options(cur, r, None, include_admin=True) for r in rows]
    cur.close()
    conn.close()
    return json_response({'polls': result})


def vote(event: Dict[str, Any]) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}') or '{}')
    poll_id = body.get('poll_id')
    option_ids = body.get('option_ids') or []
    if not poll_id or not option_ids:
        return error_response('poll_id and option_ids are required')
    try:
        pid = int(poll_id)
        option_ids = [int(x) for x in option_ids]
    except (ValueError, TypeError):
        return error_response('Invalid ids')

    steam_id = (body.get('steam_id') or '').strip()
    if not steam_id:
        return error_response('Authorization required', 401)

    voter_name = escape_sql((body.get('username') or '').strip())
    voter_avatar = escape_sql((body.get('avatar') or '').strip())
    voter_steam = escape_sql(steam_id)
    voter_key = f"steam:{steam_id}"

    conn = _connect()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute(f"SELECT * FROM polls WHERE id = {pid}")
    poll = cur.fetchone()
    if not poll:
        cur.close(); conn.close()
        return error_response('Poll not found', 404)
    if not poll['is_active']:
        cur.close(); conn.close()
        return error_response('Poll is not active', 403)

    ends_at = poll.get('ends_at')
    if ends_at:
        try:
            end_dt = ends_at if isinstance(ends_at, datetime) else datetime.fromisoformat(str(ends_at))
            if datetime.utcnow() >= end_dt:
                cur.close(); conn.close()
                return error_response('Poll has ended', 403)
        except Exception:
            pass

    if not poll['multiple_choice'] and len(option_ids) > 1:
        option_ids = option_ids[:1]

    cur.execute(f"SELECT id FROM poll_options WHERE poll_id = {pid}")
    valid_ids = {int(r['id']) for r in cur.fetchall()}
    option_ids = [oid for oid in option_ids if oid in valid_ids]
    if not option_ids:
        cur.close(); conn.close()
        return error_response('Invalid option')

    vk = escape_sql(voter_key)
    cur.execute(f"DELETE FROM poll_votes WHERE poll_id = {pid} AND voter_key = '{vk}'")
    for oid in option_ids:
        cur.execute(f"""
            INSERT INTO poll_votes (poll_id, option_id, voter_key, voter_name, voter_avatar, voter_steam_id)
            VALUES ({pid}, {oid}, '{vk}', '{voter_name}', '{voter_avatar}', '{voter_steam}')
        """)
    conn.commit()

    poll = _poll_with_options(cur, poll, voter_key)
    cur.close()
    conn.close()
    return json_response({'poll': poll})


def _save_options(cur, pid: int, options: List[Dict[str, Any]]):
    for idx, opt in enumerate(options):
        text = escape_sql((opt.get('text') or '').strip())
        if not text:
            continue
        image_url = opt.get('image_url')
        if opt.get('image_base64'):
            image_url = upload_image(opt['image_base64'], opt.get('image_type', 'jpg'))
        img_sql = f"'{escape_sql(image_url)}'" if image_url else 'NULL'
        note = escape_sql((opt.get('admin_note') or '').strip())
        cur.execute(f"""
            INSERT INTO poll_options (poll_id, text, image_url, position, admin_note)
            VALUES ({pid}, '{text}', {img_sql}, {idx}, '{note}')
        """)


def create_poll(event: Dict[str, Any]) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}') or '{}')
    title = (body.get('title') or '').strip()
    if not title:
        return error_response('Title is required')
    options = body.get('options') or []
    valid_options = [o for o in options if (o.get('text') or '').strip()]
    if len(valid_options) < 2:
        return error_response('At least 2 options are required')

    description = escape_sql((body.get('description') or '').strip())
    multiple = 'TRUE' if body.get('multiple_choice') else 'FALSE'
    is_map = 'TRUE' if body.get('is_map_vote') else 'FALSE'
    is_active = 'TRUE' if body.get('is_active', True) else 'FALSE'
    ends_at = body.get('ends_at')
    ends_sql = f"'{escape_sql(ends_at)}'" if ends_at else 'NULL'

    conn = _connect()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(f"""
        INSERT INTO polls (title, description, multiple_choice, is_map_vote, is_active, ends_at)
        VALUES ('{escape_sql(title)}', '{description}', {multiple}, {is_map}, {is_active}, {ends_sql})
        RETURNING id
    """)
    pid = int(cur.fetchone()['id'])
    _save_options(cur, pid, valid_options)
    conn.commit()

    cur.execute(f"SELECT * FROM polls WHERE id = {pid}")
    poll = _poll_with_options(cur, cur.fetchone(), None)
    cur.close()
    conn.close()
    return json_response({'poll': poll}, 201)


def update_poll(event: Dict[str, Any]) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}') or '{}')
    poll_id = body.get('id')
    if not poll_id:
        return error_response('id is required')
    pid = int(poll_id)

    title = (body.get('title') or '').strip()
    if not title:
        return error_response('Title is required')
    options = body.get('options') or []
    valid_options = [o for o in options if (o.get('text') or '').strip()]
    if len(valid_options) < 2:
        return error_response('At least 2 options are required')

    description = escape_sql((body.get('description') or '').strip())
    multiple = 'TRUE' if body.get('multiple_choice') else 'FALSE'
    is_map = 'TRUE' if body.get('is_map_vote') else 'FALSE'
    is_active = 'TRUE' if body.get('is_active', True) else 'FALSE'
    ends_at = body.get('ends_at')
    ends_sql = f"'{escape_sql(ends_at)}'" if ends_at else 'NULL'

    conn = _connect()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(f"""
        UPDATE polls SET
            title = '{escape_sql(title)}',
            description = '{description}',
            multiple_choice = {multiple},
            is_map_vote = {is_map},
            is_active = {is_active},
            ends_at = {ends_sql},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = {pid}
    """)

    cur.execute(f"SELECT id FROM poll_options WHERE poll_id = {pid}")
    old_ids = [int(r['id']) for r in cur.fetchall()]
    keep_ids = []
    for idx, opt in enumerate(valid_options):
        oid = opt.get('id')
        text = escape_sql((opt.get('text') or '').strip())
        image_url = opt.get('image_url')
        if opt.get('image_base64'):
            image_url = upload_image(opt['image_base64'], opt.get('image_type', 'jpg'))
        img_sql = f"'{escape_sql(image_url)}'" if image_url else 'NULL'
        note = escape_sql((opt.get('admin_note') or '').strip())
        if oid and int(oid) in old_ids:
            cur.execute(f"""
                UPDATE poll_options SET text = '{text}', image_url = {img_sql}, position = {idx}, admin_note = '{note}'
                WHERE id = {int(oid)}
            """)
            keep_ids.append(int(oid))
        else:
            cur.execute(f"""
                INSERT INTO poll_options (poll_id, text, image_url, position, admin_note)
                VALUES ({pid}, '{text}', {img_sql}, {idx}, '{note}') RETURNING id
            """)
            keep_ids.append(int(cur.fetchone()['id']))

    removed = [oid for oid in old_ids if oid not in keep_ids]
    for oid in removed:
        cur.execute(f"DELETE FROM poll_votes WHERE option_id = {oid}")
        cur.execute(f"DELETE FROM poll_options WHERE id = {oid}")

    conn.commit()
    cur.execute(f"SELECT * FROM polls WHERE id = {pid}")
    poll = _poll_with_options(cur, cur.fetchone(), None)
    cur.close()
    conn.close()
    return json_response({'poll': poll})


def delete_poll(poll_id: str) -> Dict[str, Any]:
    try:
        pid = int(poll_id)
    except ValueError:
        return error_response('Invalid id')
    conn = _connect()
    cur = conn.cursor()
    cur.execute(f"DELETE FROM poll_votes WHERE poll_id = {pid}")
    cur.execute(f"DELETE FROM poll_options WHERE poll_id = {pid}")
    cur.execute(f"DELETE FROM polls WHERE id = {pid}")
    conn.commit()
    cur.close()
    conn.close()
    return json_response({'success': True})