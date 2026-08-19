import json
import os
import jwt
import bcrypt
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    API для админ-панели техподдержки.
    POST /login - авторизация администратора
    POST /admins - добавление нового администратора (требует токен)
    GET /admins - список администраторов (требует токен)
    DELETE /admins/{admin_id} - удаление администратора (требует токен)
    PUT /users/{user_id}/block - блокировка пользователя (требует токен)
    PUT /users/{user_id}/unblock - разблокировка пользователя (требует токен)
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
    
    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')
    
    if method == 'POST' and action == 'login':
        return admin_login(event)
    
    headers = event.get('headers') or {}
    token = headers.get('x-auth-token') or headers.get('X-Auth-Token')
    
    admin_data = verify_admin_token(token)
    if not admin_data:
        return error_response('Unauthorized', 401)
    
    user_id = params.get('user_id', '')
    admin_id = params.get('admin_id', '')
    
    if method == 'POST' and action == 'change_password':
        return change_password(event, admin_data)
    elif method == 'POST' and action == 'add_admin':
        return add_admin(event)
    elif method == 'GET' and action == 'list_admins':
        return list_admins()
    elif method == 'DELETE' and admin_id:
        return delete_admin(admin_id)
    elif method == 'PUT' and action == 'block' and user_id:
        return block_user(user_id)
    elif method == 'PUT' and action == 'unblock' and user_id:
        return unblock_user(user_id)
    
    return error_response('Not found', 404)


def escape_sql(value: str) -> str:
    """Escape single quotes for SQL strings"""
    return value.replace("'", "''")


MAX_ATTEMPTS = 5
LOCK_MINUTES = 15


def get_client_ip(event: Dict[str, Any]) -> str:
    ctx = event.get('requestContext') or {}
    ip = ((ctx.get('identity') or {}).get('sourceIp')) or ''
    return str(ip)[:64]


def check_lockout(cur, email: str, ip: str) -> Optional[int]:
    """Возвращает количество оставшихся минут блокировки или None."""
    cur.execute(
        f"SELECT attempts, locked_until FROM admin_login_attempts "
        f"WHERE email = '{escape_sql(email)}' AND ip = '{escape_sql(ip)}'"
    )
    row = cur.fetchone()
    if not row or not row['locked_until']:
        return None
    if row['locked_until'] > datetime.utcnow():
        delta = row['locked_until'] - datetime.utcnow()
        return max(1, int(delta.total_seconds() // 60) + 1)
    return None


def register_failure(cur, conn, email: str, ip: str) -> None:
    e, i = escape_sql(email), escape_sql(ip)
    cur.execute(
        f"INSERT INTO admin_login_attempts (email, ip, attempts, updated_at) "
        f"VALUES ('{e}', '{i}', 1, NOW()) "
        f"ON CONFLICT (email, ip) DO UPDATE SET "
        f"attempts = admin_login_attempts.attempts + 1, updated_at = NOW()"
    )
    cur.execute(
        f"UPDATE admin_login_attempts SET locked_until = NOW() + INTERVAL '{LOCK_MINUTES} minutes', attempts = 0 "
        f"WHERE email = '{e}' AND ip = '{i}' AND attempts >= {MAX_ATTEMPTS}"
    )
    conn.commit()


def clear_attempts(cur, conn, email: str, ip: str) -> None:
    cur.execute(
        f"DELETE FROM admin_login_attempts "
        f"WHERE email = '{escape_sql(email)}' AND ip = '{escape_sql(ip)}'"
    )
    conn.commit()


def admin_login(event: Dict[str, Any]) -> Dict[str, Any]:
    body_str = event.get('body', '{}') or '{}'
    body = json.loads(body_str) if body_str else {}
    email = body.get('email', '').strip().lower()
    password = body.get('password', '')
    
    if not email or not password:
        return error_response('Email and password are required')
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    ip = get_client_ip(event)
    locked_min = check_lockout(cur, email, ip)
    if locked_min:
        cur.close()
        conn.close()
        return error_response(
            f'Слишком много неудачных попыток. Вход заблокирован на {locked_min} мин.', 429
        )
    
    email_safe = escape_sql(email)
    cur.execute(f"SELECT * FROM admins WHERE email = '{email_safe}'")
    admin = cur.fetchone()
    
    if not admin:
        register_failure(cur, conn, email, ip)
        cur.close()
        conn.close()
        return error_response('Invalid credentials', 401)
    
    if admin['password_hash'] == 'PLACEHOLDER':
        register_failure(cur, conn, email, ip)
        cur.close()
        conn.close()
        return error_response('Invalid credentials', 401)
    
    try:
        if not bcrypt.checkpw(password.encode('utf-8'), admin['password_hash'].encode('utf-8')):
            register_failure(cur, conn, email, ip)
            cur.close()
            conn.close()
            return error_response('Invalid credentials', 401)
    except:
        register_failure(cur, conn, email, ip)
        cur.close()
        conn.close()
        return error_response('Invalid credentials', 401)
    
    clear_attempts(cur, conn, email, ip)
    
    secret = os.environ['JWT_SECRET']
    payload = {
        'admin_id': admin['id'],
        'email': admin['email'],
        'full_name': admin['full_name'],
        'role': admin['role'] or 'admin',
        'is_admin': True,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    token = jwt.encode(payload, secret, algorithm='HS256')
    token_safe = escape_sql(token)
    
    cur.execute(f"UPDATE admins SET token = '{token_safe}' WHERE id = {admin['id']}")
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
            'token': token,
            'admin': {
                'id': admin['id'],
                'email': admin['email'],
                'full_name': admin['full_name']
            }
        }),
        'isBase64Encoded': False
    }


def change_password(event: Dict[str, Any], admin_data: Dict[str, Any]) -> Dict[str, Any]:
    body_str = event.get('body', '{}') or '{}'
    body = json.loads(body_str) if body_str else {}
    current = body.get('current_password', '')
    new = body.get('new_password', '')

    if not current or not new:
        return error_response('Укажите текущий и новый пароль')
    if len(new) < 8:
        return error_response('Новый пароль должен быть не короче 8 символов')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute(f"SELECT id, password_hash FROM admins WHERE id = {int(admin_data['admin_id'])}")
    admin = cur.fetchone()

    if not admin:
        cur.close()
        conn.close()
        return error_response('Администратор не найден', 404)

    try:
        ok = bcrypt.checkpw(current.encode('utf-8'), admin['password_hash'].encode('utf-8'))
    except Exception:
        ok = False

    if not ok:
        cur.close()
        conn.close()
        return error_response('Текущий пароль указан неверно', 401)

    hashed = bcrypt.hashpw(new.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    cur.execute(
        f"UPDATE admins SET password_hash = '{escape_sql(hashed)}', token = NULL WHERE id = {admin['id']}"
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
        'body': json.dumps({'success': True, 'message': 'Пароль изменён'}),
        'isBase64Encoded': False
    }


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


def add_admin(event: Dict[str, Any]) -> Dict[str, Any]:
    body_str = event.get('body', '{}') or '{}'
    body = json.loads(body_str) if body_str else {}
    email = body.get('email', '').strip().lower()
    password = body.get('password', '')
    full_name = body.get('full_name', '').strip()
    
    if not email or not password:
        return error_response('Email and password are required')
    
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        email_safe = escape_sql(email)
        hashed_safe = escape_sql(hashed)
        full_name_safe = escape_sql(full_name)
        
        cur.execute(f"""
            INSERT INTO admins (email, password_hash, full_name) 
            VALUES ('{email_safe}', '{hashed_safe}', '{full_name_safe}') 
            RETURNING id, email, full_name, created_at
        """)
        admin = cur.fetchone()
        conn.commit()
        
        return {
            'statusCode': 201,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'admin': dict(admin)}, default=str),
            'isBase64Encoded': False
        }
    except psycopg2.IntegrityError:
        conn.rollback()
        return error_response('Admin with this email already exists', 409)
    finally:
        cur.close()
        conn.close()


def list_admins() -> Dict[str, Any]:
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute("SELECT id, email, full_name, created_at FROM admins ORDER BY created_at DESC")
    admins = cur.fetchall()
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'admins': [dict(a) for a in admins]}, default=str),
        'isBase64Encoded': False
    }


def delete_admin(admin_id: str) -> Dict[str, Any]:
    try:
        admin_id_int = int(admin_id)
    except ValueError:
        return error_response('Invalid admin ID', 400)
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    cur.execute(f"SELECT email FROM admins WHERE id = {admin_id_int}")
    admin = cur.fetchone()
    
    if not admin:
        cur.close()
        conn.close()
        return error_response('Admin not found', 404)
    
    if admin[0] == 'ad.alex1995@yandex.ru':
        cur.close()
        conn.close()
        return error_response('Cannot delete main admin', 403)
    
    cur.execute(f"UPDATE ticket_messages SET admin_id = NULL WHERE admin_id = {admin_id_int}")
    cur.execute(f"DELETE FROM admins WHERE id = {admin_id_int}")
    
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


def block_user(user_id: str) -> Dict[str, Any]:
    try:
        user_id_int = int(user_id)
    except ValueError:
        return error_response('Invalid user ID', 400)
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute(f"UPDATE users SET is_blocked = TRUE WHERE id = {user_id_int} RETURNING *")
    user = cur.fetchone()
    
    if not user:
        cur.close()
        conn.close()
        return error_response('User not found', 404)
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'user': dict(user)}, default=str),
        'isBase64Encoded': False
    }


def unblock_user(user_id: str) -> Dict[str, Any]:
    try:
        user_id_int = int(user_id)
    except ValueError:
        return error_response('Invalid user ID', 400)
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute(f"UPDATE users SET is_blocked = FALSE WHERE id = {user_id_int} RETURNING *")
    user = cur.fetchone()
    
    if not user:
        cur.close()
        conn.close()
        return error_response('User not found', 404)
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'user': dict(user)}, default=str),
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