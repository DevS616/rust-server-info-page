import os
import json
from typing import Dict, Any, Optional

import psycopg2
from psycopg2.extras import RealDictCursor
import jwt

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
}


def pg_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'], cursor_factory=RealDictCursor)


def schema() -> str:
    return os.environ['MAIN_DB_SCHEMA']


def resp(status: int, body: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'statusCode': status,
        'headers': {'Content-Type': 'application/json', **CORS_HEADERS},
        'isBase64Encoded': False,
        'body': json.dumps(body, ensure_ascii=False, default=str),
    }


def verify_admin(token: Optional[str]) -> bool:
    if not token:
        return False
    try:
        payload = jwt.decode(token, os.environ['JWT_SECRET'], algorithms=['HS256'])
        return bool(payload.get('is_admin'))
    except Exception:
        return False


def get_top(limit: int) -> Dict[str, Any]:
    s = schema()
    conn = pg_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f'SELECT e.steamid, e.balance, u.steam_username, u.steam_avatar '
                f'FROM {s}.economy_balances e '
                f'LEFT JOIN {s}.users u ON u.steam_id = e.steamid '
                f'WHERE e.is_hide = FALSE '
                f'ORDER BY e.balance DESC LIMIT %s',
                (limit,),
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    top = []
    for i, r in enumerate(rows):
        top.append({
            'rank': i + 1,
            'steamid': r['steamid'],
            'balance': int(r['balance']),
            'username': r['steam_username'] or 'Игрок',
            'avatar': r['steam_avatar'] or '',
        })
    return {'top': top, 'total': len(top)}


def get_player(steamid: str) -> Dict[str, Any]:
    s = schema()
    conn = pg_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f'SELECT steamid, balance FROM {s}.economy_balances WHERE steamid = %s',
                (steamid,),
            )
            row = cur.fetchone()
    finally:
        conn.close()
    if not row:
        return {'found': False}
    return {'found': True, 'steamid': row['steamid'], 'balance': int(row['balance'])}


def set_balance(steamid: str, balance: int) -> Dict[str, Any]:
    s = schema()
    conn = pg_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f'UPDATE {s}.economy_balances SET balance = %s, updated_at = CURRENT_TIMESTAMP '
                f'WHERE steamid = %s',
                (balance, steamid),
            )
            if cur.rowcount == 0:
                conn.rollback()
                return {'ok': False, 'error': 'not_found'}
        conn.commit()
    finally:
        conn.close()
    return {'ok': True, 'steamid': steamid, 'balance': balance}


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''Экономика: топ богачей (публично), чтение и изменение баланса игрока (админ)'''
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    token = headers.get('x-auth-token') or headers.get('X-Auth-Token')

    if method == 'GET':
        action = params.get('action', 'top')
        if action == 'top':
            limit = min(int(params.get('limit', 100)), 500)
            return resp(200, get_top(limit))
        if action == 'get':
            if not verify_admin(token):
                return resp(403, {'error': 'forbidden'})
            steamid = (params.get('steamid') or '').strip()
            if not steamid:
                return resp(400, {'error': 'steamid required'})
            return resp(200, get_player(steamid))
        return resp(400, {'error': 'unknown action'})

    if method == 'POST':
        if not verify_admin(token):
            return resp(403, {'error': 'forbidden'})
        body = json.loads(event.get('body') or '{}')
        steamid = (body.get('steamid') or '').strip()
        if not steamid or 'balance' not in body:
            return resp(400, {'error': 'steamid and balance required'})
        try:
            balance = int(body['balance'])
        except (ValueError, TypeError):
            return resp(400, {'error': 'balance must be integer'})
        result = set_balance(steamid, balance)
        return resp(200 if result.get('ok') else 404, result)

    return resp(405, {'error': 'method not allowed'})
