import os
import json
import urllib.request
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


def _steam_profiles(steamids) -> Dict[str, Dict[str, str]]:
    '''Подтягивает ник и аватар напрямую из Steam API (до 100 id за запрос).'''
    key = os.environ.get('STEAM_API_KEY')
    if not key or not steamids:
        return {}
    result: Dict[str, Dict[str, str]] = {}
    ids = list(steamids)
    for i in range(0, len(ids), 100):
        chunk = ids[i:i + 100]
        url = (
            'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/'
            f'?key={key}&steamids={",".join(chunk)}'
        )
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode('utf-8'))
            for pl in data.get('response', {}).get('players', []):
                result[str(pl.get('steamid'))] = {
                    'username': pl.get('personaname') or '',
                    'avatar': pl.get('avatarfull') or '',
                }
        except Exception:
            continue
    return result


def enrich_profiles(steamids) -> Dict[str, Dict[str, str]]:
    ids = list({s for s in steamids if s})
    if not ids:
        return {}
    s = schema()
    conn = pg_conn()
    try:
        # 1) Профили авторизованных на сайте (самые точные)
        with conn.cursor() as cur:
            cur.execute(
                f'SELECT steam_id, steam_username, steam_avatar '
                f'FROM {s}.users WHERE steam_id = ANY(%s)',
                (ids,),
            )
            user_rows = cur.fetchall()
        profiles = {
            r['steam_id']: {
                'username': r['steam_username'] or '',
                'avatar': r['steam_avatar'] or '',
            }
            for r in user_rows
        }

        # 2) Steam-кэш из БД (свежесть 24 часа) для остальных
        need_cache = [sid for sid in ids
                      if not profiles.get(sid) or not profiles[sid].get('avatar')]
        fresh_cached = set()
        if need_cache:
            with conn.cursor() as cur:
                cur.execute(
                    f'SELECT steam_id, username, avatar, '
                    f'(updated_at > NOW() - INTERVAL \'24 hours\') AS fresh '
                    f'FROM {s}.steam_profile_cache WHERE steam_id = ANY(%s)',
                    (need_cache,),
                )
                for r in cur.fetchall():
                    if not profiles.get(r['steam_id']) or not profiles[r['steam_id']].get('avatar'):
                        profiles[r['steam_id']] = {
                            'username': r['username'] or '',
                            'avatar': r['avatar'] or '',
                        }
                    if r['fresh']:
                        fresh_cached.add(r['steam_id'])

        # 3) Steam API только для тех, кого нет в свежем кэше
        need_steam = [sid for sid in need_cache if sid not in fresh_cached]
        if need_steam:
            steam = _steam_profiles(need_steam)
            for sid, data in steam.items():
                existing = profiles.get(sid) or {}
                profiles[sid] = {
                    'username': existing.get('username') or data['username'],
                    'avatar': existing.get('avatar') or data['avatar'],
                }
                # Сохраняем в кэш
                with conn.cursor() as cur:
                    cur.execute(
                        f'INSERT INTO {s}.steam_profile_cache (steam_id, username, avatar, updated_at) '
                        f'VALUES (%s, %s, %s, NOW()) '
                        f'ON CONFLICT (steam_id) DO UPDATE SET '
                        f'username = EXCLUDED.username, avatar = EXCLUDED.avatar, updated_at = NOW()',
                        (sid, data['username'][:255], data['avatar']),
                    )
            conn.commit()
    finally:
        conn.close()

    return profiles


# Таблицы статистики по каждому серверу (объединяем оба)
PLAYERSTATS_TABLES = ['uleaderboard_dbplayerstats', 'uleaderboard_db_srv2playerstats']
STORAGE_TABLES = ['uleaderboard_dbstatsstorage', 'uleaderboard_db_srv2statsstorage']


def stats_names(steamids) -> Dict[str, str]:
    '''Ник игрока (LastName) из таблиц статистики сервера по steamid.'''
    ids = [s for s in steamids if s]
    if not ids:
        return {}
    placeholders = ', '.join(['%s'] * len(ids))
    union = " UNION ALL ".join(
        f"SELECT UserId, LastName FROM `{t}`" for t in PLAYERSTATS_TABLES
    )
    sql = (
        f"SELECT UserId, MAX(LastName) AS LastName FROM ({union}) u "
        f"WHERE UserId IN ({placeholders}) GROUP BY UserId"
    )
    conn = stats_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, ids)
            rows = cur.fetchall()
    finally:
        conn.close()
    return {str(r['UserId']): (r['LastName'] or '') for r in rows}


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

    steamids = [r['steamid'] for r in rows]
    profiles = enrich_profiles(steamids)
    # Фолбэк-ники из плагина статистики для тех, у кого нет профиля
    need_name = [sid for sid in steamids if not (profiles.get(sid) or {}).get('username')]
    names = stats_names(need_name) if need_name else {}

    top = []
    for i, r in enumerate(rows):
        sid = r['steamid']
        p = profiles.get(sid, {})
        top.append({
            'rank': i + 1,
            'steamid': sid,
            'balance': _to_int(r['balance']),
            'username': p.get('username') or names.get(sid) or 'Игрок',
            'avatar': p.get('avatar') or '',
        })
    return {'top': top, 'total': len(top)}


def _to_float(v) -> float:
    try:
        return float(str(v))
    except (ValueError, TypeError):
        return 0.0


def _servers_list(raw) -> list:
    if raw is None:
        return []
    if isinstance(raw, (bytes, bytearray)):
        raw = raw.decode('utf-8', 'ignore')
    nums = sorted({int(x) for x in str(raw).split(',') if x.strip().isdigit()})
    return nums


def get_stats_top(field: str, limit: int) -> Dict[str, Any]:
    order_col = 'points' if field == 'points' else 'playtime'
    union = " UNION ALL ".join(
        f"SELECT UserId, LastName, Points, TotalPlayTime, {idx + 1} AS srv FROM `{t}` "
        f"WHERE HiddenFromLeaderboard = 0"
        for idx, t in enumerate(PLAYERSTATS_TABLES)
    )
    sql = (
        f"SELECT UserId, "
        f"MAX(LastName) AS LastName, "
        f"SUM(Points) AS points, "
        f"SUM(CAST(TotalPlayTime AS DECIMAL(20,4))) AS playtime, "
        f"CAST(GROUP_CONCAT(DISTINCT srv ORDER BY srv) AS CHAR) AS servers "
        f"FROM ({union}) u "
        f"GROUP BY UserId "
        f"ORDER BY {order_col} DESC LIMIT %s"
    )
    conn = stats_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, (limit,))
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
            'points': round(_to_float(r['points']), 1),
            'playtime_minutes': round(_to_float(r['playtime']), 1),
            'servers': _servers_list(r['servers']),
        })
    return {'top': top, 'total': len(top)}


def get_dp_top(limit: int) -> Dict[str, Any]:
    union = " UNION ALL ".join(
        f"SELECT UserId, ItemValue, {idx + 1} AS srv FROM `{t}` WHERE ShortName = 'Economics'"
        for idx, t in enumerate(STORAGE_TABLES)
    )
    sql = (
        f"SELECT UserId, SUM(ItemValue) AS total, "
        f"CAST(GROUP_CONCAT(DISTINCT srv ORDER BY srv) AS CHAR) AS servers "
        f"FROM ({union}) u "
        f"GROUP BY UserId "
        f"ORDER BY total DESC LIMIT %s"
    )
    conn = stats_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, (limit,))
            rows = cur.fetchall()
    finally:
        conn.close()

    steamids = list({str(r['UserId']) for r in rows})
    profiles = enrich_profiles(steamids)
    need_name = [sid for sid in steamids if not (profiles.get(sid) or {}).get('username')]
    names = stats_names(need_name) if need_name else {}
    items = []
    for i, r in enumerate(rows):
        sid = str(r['UserId'])
        p = profiles.get(sid, {})
        items.append({
            'rank': i + 1,
            'steamid': sid,
            'username': p.get('username') or names.get(sid) or 'Игрок',
            'avatar': p.get('avatar') or '',
            'balance': _to_int(r['total']),
            'servers': _servers_list(r['servers']),
        })
    return {'top': items, 'total': len(items)}


# Условия отбора для агрегированных топов по таблице statsstorage.
# LootType: 3=события/боссы, 6=убийства+бочки, 1/8/16=строительство, 11=ящики.
LOOT_TOPS = {
    'kills': "(LootType = 3 OR (LootType = 6 AND (ShortName = 'kills' OR ShortName LIKE 'scientistnpc%%')))",
    'building': "(LootType IN (1, 8, 16))",
    'crates': "((LootType = 11) OR (LootType = 6 AND (ShortName LIKE 'loot_barrel%%' OR ShortName = 'oil_barrel')))",
}


def get_loot_top(cond: str, limit: int) -> Dict[str, Any]:
    union = " UNION ALL ".join(
        f"SELECT UserId, LootType, ShortName, ItemValue, {idx + 1} AS srv FROM `{t}`"
        for idx, t in enumerate(STORAGE_TABLES)
    )
    sql = (
        f"SELECT UserId, SUM(ItemValue) AS total, "
        f"CAST(GROUP_CONCAT(DISTINCT srv ORDER BY srv) AS CHAR) AS servers "
        f"FROM ({union}) u "
        f"WHERE {cond} "
        f"GROUP BY UserId "
        f"HAVING total > 0 "
        f"ORDER BY total DESC LIMIT %s"
    )
    conn = stats_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, (limit,))
            rows = cur.fetchall()
    finally:
        conn.close()

    steamids = list({str(r['UserId']) for r in rows})
    profiles = enrich_profiles(steamids)
    need_name = [sid for sid in steamids if not (profiles.get(sid) or {}).get('username')]
    names = stats_names(need_name) if need_name else {}
    items = []
    for i, r in enumerate(rows):
        sid = str(r['UserId'])
        p = profiles.get(sid, {})
        items.append({
            'rank': i + 1,
            'steamid': sid,
            'username': p.get('username') or names.get(sid) or 'Игрок',
            'avatar': p.get('avatar') or '',
            'amount': _to_int(r['total']),
            'servers': _servers_list(r['servers']),
        })
    return {'top': items, 'total': len(items)}


CATEGORIES = ('top', 'dp', 'points', 'playtime', 'kills', 'building', 'crates')


def fetch_category(cat: str, limit: int) -> list:
    '''Единый формат: список игроков с полем value (число) по категории.'''
    if cat == 'top':
        raw = get_top(limit)['top']
        return [{'steamid': r['steamid'], 'username': r['username'],
                 'avatar': r['avatar'], 'value': r['balance'], 'servers': []} for r in raw]
    if cat == 'dp':
        raw = get_dp_top(limit)['top']
        return [{'steamid': r['steamid'], 'username': r['username'],
                 'avatar': r['avatar'], 'value': r['balance'],
                 'servers': r.get('servers', [])} for r in raw]
    if cat == 'points':
        raw = get_stats_top('points', limit)['top']
        return [{'steamid': r['steamid'], 'username': r['username'],
                 'avatar': r['avatar'], 'value': int(r['points'] * 10),
                 'servers': r.get('servers', [])} for r in raw]
    if cat == 'playtime':
        raw = get_stats_top('playtime', limit)['top']
        return [{'steamid': r['steamid'], 'username': r['username'],
                 'avatar': r['avatar'], 'value': int(r['playtime_minutes']),
                 'servers': r.get('servers', [])} for r in raw]
    if cat in LOOT_TOPS:
        raw = get_loot_top(LOOT_TOPS[cat], limit)['top']
        return [{'steamid': r['steamid'], 'username': r['username'],
                 'avatar': r['avatar'], 'value': int(r['amount']),
                 'servers': r.get('servers', [])} for r in raw]
    return []


def value_to_output(cat: str, value: int) -> Dict[str, Any]:
    '''Обратное преобразование value в поле фронтенда.'''
    if cat == 'points':
        return {'points': round(value / 10, 1)}
    if cat == 'playtime':
        return {'playtime_minutes': value}
    if cat in LOOT_TOPS:
        return {'amount': value}
    return {'balance': value}


def save_snapshot_if_needed() -> None:
    '''Сохраняет срез топ-10 по всем категориям за сегодня, если ещё не сохранён.'''
    s = schema()
    conn = pg_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT COUNT(*) AS c FROM {s}.stats_daily_snapshots "
                f"WHERE snapshot_date = CURRENT_DATE"
            )
            if cur.fetchone()['c'] > 0:
                return
        for cat in CATEGORIES:
            players = fetch_category(cat, 10)
            with conn.cursor() as cur:
                for i, p in enumerate(players):
                    cur.execute(
                        f"INSERT INTO {s}.stats_daily_snapshots "
                        f"(snapshot_date, category, rank, steamid, username, avatar, value) "
                        f"VALUES (CURRENT_DATE, %s, %s, %s, %s, %s, %s) "
                        f"ON CONFLICT (snapshot_date, category, rank) DO NOTHING",
                        (cat, i + 1, p['steamid'], p['username'][:255],
                         p['avatar'], p['value']),
                    )
            conn.commit()
    except Exception:
        conn.rollback()
    finally:
        conn.close()


def get_snapshot_top(cat: str, day_offset: int) -> Dict[str, Any]:
    '''Топ-10 из снапшота: day_offset=0 сегодня, 1 вчера.'''
    s = schema()
    conn = pg_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT rank, steamid, username, avatar, value "
                f"FROM {s}.stats_daily_snapshots "
                f"WHERE category = %s AND snapshot_date = CURRENT_DATE - %s "
                f"ORDER BY rank ASC LIMIT 10",
                (cat, day_offset),
            )
            rows = cur.fetchall()
    finally:
        conn.close()
    top = []
    for r in rows:
        item = {
            'rank': r['rank'],
            'steamid': r['steamid'],
            'username': r['username'] or 'Игрок',
            'avatar': r['avatar'] or '',
        }
        item.update(value_to_output(cat, int(r['value'])))
        top.append(item)
    return {'top': top, 'total': len(top)}


def get_snapshot_today(cat: str) -> Dict[str, Any]:
    '''Живой топ-10 за сегодня (актуальные данные).'''
    players = fetch_category(cat, 10)
    top = []
    for i, p in enumerate(players):
        item = {
            'rank': i + 1,
            'steamid': p['steamid'],
            'username': p['username'] or 'Игрок',
            'avatar': p['avatar'] or '',
            'servers': p.get('servers', []),
        }
        item.update(value_to_output(cat, int(p['value'])))
        top.append(item)
    return {'top': top, 'total': len(top)}


def get_legends(cat: str) -> Dict[str, Any]:
    '''Полный список всех игроков категории (Легенды вайпа).'''
    players = fetch_category(cat, 500)
    top = []
    for i, p in enumerate(players):
        item = {
            'rank': i + 1,
            'steamid': p['steamid'],
            'username': p['username'] or 'Игрок',
            'avatar': p['avatar'] or '',
            'servers': p.get('servers', []),
        }
        item.update(value_to_output(cat, int(p['value'])))
        top.append(item)
    return {'top': top, 'total': len(top)}


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


TOP_CACHE_TTL_MIN = 5


def cache_get(cache_key: str) -> Optional[Dict[str, Any]]:
    '''Читает готовый топ из кэша, если он свежий (< TTL минут).'''
    s = schema()
    conn = pg_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT payload FROM {s}.stats_top_cache "
                f"WHERE cache_key = %s "
                f"AND updated_at > NOW() - INTERVAL '{TOP_CACHE_TTL_MIN} minutes'",
                (cache_key,),
            )
            row = cur.fetchone()
    finally:
        conn.close()
    return row['payload'] if row else None


def cache_set(cache_key: str, payload: Dict[str, Any]) -> None:
    s = schema()
    conn = pg_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"INSERT INTO {s}.stats_top_cache (cache_key, payload, updated_at) "
                f"VALUES (%s, %s, NOW()) "
                f"ON CONFLICT (cache_key) DO UPDATE SET "
                f"payload = EXCLUDED.payload, updated_at = NOW()",
                (cache_key, json.dumps(payload, ensure_ascii=False, default=str)),
            )
        conn.commit()
    except Exception:
        conn.rollback()
    finally:
        conn.close()


def cached_stats(cat: str, period: str) -> Dict[str, Any]:
    '''Топ по категории/периоду с кэшированием на бэкенде (кроме "вчера" — оно стабильно).'''
    key = f"{cat}:{period}"
    if period != 'yesterday':
        cached = cache_get(key)
        if cached is not None:
            return cached
    if period == 'today':
        save_snapshot_if_needed()
        result = get_snapshot_today(cat)
    elif period == 'yesterday':
        return get_snapshot_top(cat, 1)
    else:
        result = get_legends(cat)
    cache_set(key, result)
    return result


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
        direct = {
            'top': lambda lim: get_top(lim),
            'points': lambda lim: get_stats_top('points', lim),
            'playtime': lambda lim: get_stats_top('playtime', lim),
            'dp': lambda lim: get_dp_top(lim),
            'npc': lambda lim: get_npc_top(lim),
        }
        if action in direct:
            limit = min(int(params.get('limit', 100)), 500)
            key = f"direct:{action}:{limit}"
            cached = cache_get(key)
            if cached is not None:
                return resp(200, cached)
            result = direct[action](limit)
            cache_set(key, result)
            return resp(200, result)
        if action == 'stats':
            cat = params.get('category', 'top')
            if cat not in CATEGORIES:
                return resp(400, {'error': 'unknown category'})
            period = params.get('period', 'today')
            if period not in ('today', 'yesterday', 'legends'):
                return resp(400, {'error': 'unknown period'})
            return resp(200, cached_stats(cat, period))
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