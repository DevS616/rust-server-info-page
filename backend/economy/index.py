import os
import json
from typing import Dict, Any, List, Optional

import pymysql
import psycopg2
import jwt

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
}


def mysql_conn():
    return pymysql.connect(
        host=os.environ['SOURCE_MYSQL_HOST'],
        port=int(os.environ['SOURCE_MYSQL_PORT']),
        user=os.environ['SOURCE_MYSQL_USER'],
        password=os.environ['SOURCE_MYSQL_PASSWORD'],
        database=os.environ['SOURCE_MYSQL_DB_ECONOMY'],
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=8,
    )


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


def enrich_names(steamids: List[str]) -> Dict[str, Dict[str, str]]:
    '''Подтягивает ник и аватар игроков из основной базы сайта по steam_id'''
    if not steamids:
        return {}
    schema = os.environ['MAIN_DB_SCHEMA']
    ids_sql = ','.join("'" + s.replace("'", "") + "'" for s in steamids)
    result: Dict[str, Dict[str, str]] = {}
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        with conn.cursor() as cur:
            cur.execute(
                f'SELECT steam_id, steam_username, steam_avatar '
                f'FROM {schema}.users WHERE steam_id IN ({ids_sql})'
            )
            for row in cur.fetchall():
                result[row[0]] = {'username': row[1], 'avatar': row[2] or ''}
    finally:
        conn.close()
    return result


def get_top(limit: int) -> Dict[str, Any]:
    conn = mysql_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                'SELECT steamid, balance FROM IQEconomic_Db '
                "WHERE is_hide != 'true' "
                'ORDER BY CAST(balance AS SIGNED) DESC LIMIT %s',
                (limit,),
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    steamids = [r['steamid'] for r in rows]
    names = enrich_names(steamids)
    top = []
    for i, r in enumerate(rows):
        info = names.get(r['steamid'], {})
        top.append({
            'rank': i + 1,
            'steamid': r['steamid'],
            'balance': int(r['balance']) if str(r['balance']).lstrip('-').isdigit() else 0,
            'username': info.get('username') or 'Игрок',
            'avatar': info.get('avatar', ''),
        })
    return {'top': top, 'total': len(top)}


def get_player(steamid: str) -> Dict[str, Any]:
    conn = mysql_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                'SELECT steamid, balance, time, last_connection FROM IQEconomic_Db WHERE steamid = %s',
                (steamid,),
            )
            row = cur.fetchone()
    finally:
        conn.close()
    if not row:
        return {'found': False}
    return {
        'found': True,
        'steamid': row['steamid'],
        'balance': int(row['balance']) if str(row['balance']).lstrip('-').isdigit() else 0,
    }


def set_balance(steamid: str, balance: int) -> Dict[str, Any]:
    conn = mysql_conn()
    try:
        with conn.cursor() as cur:
            cur.execute('SELECT id FROM IQEconomic_Db WHERE steamid = %s', (steamid,))
            if not cur.fetchone():
                return {'ok': False, 'error': 'not_found'}
            cur.execute(
                'UPDATE IQEconomic_Db SET balance = %s WHERE steamid = %s',
                (str(balance), steamid),
            )
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
