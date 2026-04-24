import json
import os
import jwt
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, Optional

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400'
}

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''API для управления дорожной картой — публичный список и CRUD для админов'''
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')

    if method == 'GET' and action == 'admin-list':
        headers_dict = event.get('headers') or {}
        token = headers_dict.get('x-auth-token') or headers_dict.get('X-Auth-Token')
        if not verify_admin_token(token):
            return error_response('Unauthorized', 401)
        return get_all_items()

    if method == 'GET':
        return get_published_items()

    headers_dict = event.get('headers') or {}
    token = headers_dict.get('x-auth-token') or headers_dict.get('X-Auth-Token')
    if not verify_admin_token(token):
        return error_response('Unauthorized', 401)

    if method == 'POST':
        return create_item(event)
    elif method == 'PUT':
        return update_item(event)
    elif method == 'DELETE':
        item_id = params.get('id', '')
        if item_id:
            return delete_item(item_id)

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
    except:
        return None


def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def json_response(data, status=200):
    return {
        'statusCode': status,
        'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
        'body': json.dumps(data, ensure_ascii=False, default=str)
    }


def error_response(message, status=400):
    return json_response({'error': message}, status)


def get_published_items():
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("""
        SELECT id, title, description, status, icon, sort_order,
               TO_CHAR(updated_at, 'DD.MM.YYYY') as updated_at
        FROM roadmap
        WHERE is_published = TRUE
        ORDER BY sort_order ASC, created_at ASC
    """)
    items = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()
    return json_response({'items': items})


def get_all_items():
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("""
        SELECT id, title, description, status, icon, sort_order, is_published,
               TO_CHAR(updated_at, 'DD.MM.YYYY') as updated_at,
               created_at
        FROM roadmap
        ORDER BY sort_order ASC, created_at ASC
    """)
    items = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()
    return json_response({'items': items})


def create_item(event):
    body = json.loads(event.get('body') or '{}')
    title = escape_sql(body.get('title', '').strip())
    description = escape_sql(body.get('description', '').strip())
    status = body.get('status', 'planned')
    icon = escape_sql(body.get('icon', 'Map').strip())
    sort_order = int(body.get('sort_order', 0))
    is_published = body.get('is_published', True)
    updated_at = escape_sql(body.get('updated_at', '').strip()) or 'CURRENT_DATE'

    if not title or not description:
        return error_response('title and description are required')

    if status not in ('planned', 'in_progress', 'done'):
        return error_response('Invalid status')

    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    updated_at_val = f"'{updated_at}'" if updated_at != 'CURRENT_DATE' else 'CURRENT_DATE'
    cur.execute(f"""
        INSERT INTO roadmap (title, description, status, icon, sort_order, is_published, updated_at)
        VALUES ('{title}', '{description}', '{status}', '{icon}', {sort_order}, {is_published}, {updated_at_val})
        RETURNING id, title, description, status, icon, sort_order, is_published,
                  TO_CHAR(updated_at, 'DD.MM.YYYY') as updated_at
    """)
    item = dict(cur.fetchone())
    conn.commit()
    cur.close()
    conn.close()
    return json_response({'item': item}, 201)


def update_item(event):
    params = event.get('queryStringParameters') or {}
    item_id = params.get('id', '')
    if not item_id:
        return error_response('id is required')

    body = json.loads(event.get('body') or '{}')
    title = escape_sql(body.get('title', '').strip())
    description = escape_sql(body.get('description', '').strip())
    status = body.get('status', 'planned')
    icon = escape_sql(body.get('icon', 'Map').strip())
    sort_order = int(body.get('sort_order', 0))
    is_published = body.get('is_published', True)
    updated_at = escape_sql(body.get('updated_at', '').strip())

    if not title or not description:
        return error_response('title and description are required')

    if status not in ('planned', 'in_progress', 'done'):
        return error_response('Invalid status')

    updated_at_val = f"'{updated_at}'" if updated_at else 'CURRENT_DATE'

    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(f"""
        UPDATE roadmap
        SET title='{title}', description='{description}', status='{status}',
            icon='{icon}', sort_order={sort_order}, is_published={is_published},
            updated_at={updated_at_val}
        WHERE id={item_id}
        RETURNING id, title, description, status, icon, sort_order, is_published,
                  TO_CHAR(updated_at, 'DD.MM.YYYY') as updated_at
    """)
    item = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not item:
        return error_response('Not found', 404)
    return json_response({'item': dict(item)})


def delete_item(item_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(f"DELETE FROM roadmap WHERE id={item_id}")
    conn.commit()
    cur.close()
    conn.close()
    return json_response({'success': True})
