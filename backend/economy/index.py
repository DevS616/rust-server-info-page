import os
import json
from typing import Dict, Any, Optional

import psycopg2
from psycopg2.extras import RealDictCursor
import pymysql
import jwt

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
}

ECO_TABLE = 'IQEconomic_Db'


def pg_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'], cursor_factory=RealDictCursor)


def my_conn():
    return pymysql.connect(
        host=os.environ['NEW_MYSQL_HOST'],
        port=int(os.environ.get('NEW_MYSQL_PORT', '3306')),
        user=os.environ['NEW_MYSQL_USER'],
        password=os.environ['NEW_MYSQL_PASSWORD'],
        database=os.environ['NEW_MYSQL_DB'],
        charset='utf8mb4',
        connect_timeout=10,
        cursorclass=pymysql.cursors.DictCursor,
    )


def stats_conn():
    return pymysql.connect(
        host=os.environ['NEW_MYSQL_HOST'],
        port=int(os.environ.get('NEW_MYSQL_PORT', '3306')),
        user=os.environ['NEW_MYSQL_USER'],
        password=os.environ['NEW_MYSQL_PASSWORD'],
        database=os.environ['NEW_MYSQL_STATS_DB'],
        charset='utf8mb4',
        connect_timeout=10,
        cursorclass=pymysql.cursors.DictCursor,
    )


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


def _to_int(v) -> int:
    try:
        return int(float(str(v)))
    except (ValueError, TypeError):
        return 0


def enrich_profiles(steamids) -> Dict[str, Dict[str, str]]:
    ids = [s for s in steamids if s]
    if not ids:
        return {}
    s = schema()
    conn = pg_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f'SELECT steam_id, steam_username, steam_avatar '
                f'FROM {s}.users WHERE steam_id = ANY(%s)',
                (ids,),
            )
            rows = cur.fetchall()
    finally:
        conn.close()
    return {
        r['steam_id']: {
            'username': r['steam_username'] or '',
            'avatar': r['steam_avatar'] or '',
        }
        for r in rows
    }


def get_top(limit: int) -> Dict[str, Any]:
    conn = my_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT steamid, balance FROM `{ECO_TABLE}` "
                f"WHERE is_hide = 'false' "
                f"ORDER BY CAST(balance AS SIGNED) DESC LIMIT %s",
                (limit,),
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    profiles = enrich_profiles([r['steamid'] for r in rows])
    top = []
    for i, r in enumerate(rows):
        p = profiles.get(r['steamid'], {})
        top.append({
            'rank': i + 1,
            'steamid': r['steamid'],
            'balance': _to_int(r['balance']),
            'username': p.get('username') or 'Игрок',
            'avatar': p.get('avatar') or '',
        })
    return {'top': top, 'total': len(top)}


PLAYERSTATS_TABLE = 'uleaderboard_dbplayerstats'
STORAGE_TABLE = 'uleaderboard_dbstatsstorage'


def _to_float(v) -> float:
    try:
        return float(str(v))
    except (ValueError, TypeError):
        return 0.0


def get_stats_top(field: str, limit: int) -> Dict[str, Any]:
    order = 'Points' if field == 'points' else 'CAST(TotalPlayTime AS DECIMAL(20,4))'
    conn = stats_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT UserId, LastName, Points, TotalPlayTime "
                f"FROM `{PLAYERSTATS_TABLE}` "
                f"WHERE HiddenFromLeaderboard = 0 "
                f"ORDER BY {order} DESC LIMIT %s",
                (limit,),
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    steamids = [str(r['UserId']) for r in rows]
    profiles = enrich_profiles(steamids)
    top = []
    for i, r in enumerate(rows):
        sid = str(r['UserId'])
        p = profiles.get(sid, {})
        top.append({
            'rank': i + 1,
            'steamid': sid,
            'username': p.get('username') or r['LastName'] or 'Игрок',
            'avatar': p.get('avatar') or '',
            'points': round(_to_float(r['Points']), 1),
            'playtime_minutes': round(_to_float(r['TotalPlayTime']), 1),
        })
    return {'top': top, 'total': len(top)}


def get_dp_top(limit: int) -> Dict[str, Any]:
    conn = stats_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT UserId, SUM(ItemValue) AS total "
                f"FROM `{STORAGE_TABLE}` "
                f"WHERE ShortName = 'Economics' "
                f"GROUP BY UserId "
                f"ORDER BY total DESC LIMIT %s",
                (limit,),
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    steamids = list({str(r['UserId']) for r in rows})
    profiles = enrich_profiles(steamids)
    items = []
    for i, r in enumerate(rows):
        sid = str(r['UserId'])
        p = profiles.get(sid, {})
        items.append({
            'rank': i + 1,
            'steamid': sid,
            'username': p.get('username') or 'Игрок',
            'avatar': p.get('avatar') or '',
            'balance': _to_int(r['total']),
        })
    return {'top': items, 'total': len(items)}


def get_player(steamid: str) -> Dict[str, Any]:
    conn = my_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT steamid, balance FROM `{ECO_TABLE}` WHERE steamid = %s",
                (steamid,),
            )
            row = cur.fetchone()
    finally:
        conn.close()
    if not row:
        return {'found': False}
    return {'found': True, 'steamid': row['steamid'], 'balance': _to_int(row['balance'])}


def set_balance(steamid: str, balance: int) -> Dict[str, Any]:
    conn = my_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE `{ECO_TABLE}` SET balance = %s WHERE steamid = %s",
                (str(int(balance)), steamid),
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
        if action == 'points':
            limit = min(int(params.get('limit', 100)), 500)
            return resp(200, get_stats_top('points', limit))
        if action == 'playtime':
            limit = min(int(params.get('limit', 100)), 500)
            return resp(200, get_stats_top('playtime', limit))
        if action == 'dp':
            limit = min(int(params.get('limit', 100)), 500)
            return resp(200, get_dp_top(limit))
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