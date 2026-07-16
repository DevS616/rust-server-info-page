import os
import json
from typing import Dict, Any

import psycopg2
from psycopg2.extras import RealDictCursor
import pymysql

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
}


def resp(status: int, body: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'statusCode': status,
        'headers': {'Content-Type': 'application/json', **CORS_HEADERS},
        'isBase64Encoded': False,
        'body': json.dumps(body, ensure_ascii=False, default=str),
    }


def new_mysql():
    return pymysql.connect(
        host=os.environ['NEW_MYSQL_HOST'],
        port=int(os.environ.get('NEW_MYSQL_PORT', '3306')),
        user=os.environ['NEW_MYSQL_USER'],
        password=os.environ['NEW_MYSQL_PASSWORD'],
        database=os.environ['NEW_MYSQL_DB'],
        charset='utf8mb4',
        connect_timeout=10,
    )


def source_mysql():
    return pymysql.connect(
        host=os.environ['SOURCE_MYSQL_HOST'],
        port=int(os.environ['SOURCE_MYSQL_PORT']),
        user=os.environ['SOURCE_MYSQL_USER'],
        password=os.environ['SOURCE_MYSQL_PASSWORD'],
        database=os.environ['SOURCE_MYSQL_DB_ECONOMY'],
        charset='utf8mb4',
        connect_timeout=10,
    )


def ping_new() -> Dict[str, Any]:
    conn = new_mysql()
    try:
        with conn.cursor() as cur:
            cur.execute('SELECT VERSION()')
            ver = cur.fetchone()[0]
    finally:
        conn.close()
    return {'ok': True, 'mysql_version': ver}


def source_ddl() -> Dict[str, Any]:
    conn = source_mysql()
    try:
        with conn.cursor() as cur:
            cur.execute('SHOW TABLES')
            tables = [r[0] for r in cur.fetchall()]
            ddls = {}
            for t in tables:
                cur.execute(f'SHOW CREATE TABLE `{t}`')
                row = cur.fetchone()
                ddls[t] = row[1]
    finally:
        conn.close()
    return {'ok': True, 'tables': tables, 'ddl': ddls}


CREATE_SQL = (
    "CREATE TABLE IF NOT EXISTS `IQEconomic_Db` ("
    "`id` int(11) NOT NULL AUTO_INCREMENT,"
    "`steamid` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,"
    "`balance` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,"
    "`limit_balance` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,"
    "`time` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,"
    "`last_connection` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,"
    "`is_hide` varchar(6) COLLATE utf8mb4_unicode_ci NOT NULL,"
    "PRIMARY KEY (`id`),"
    "UNIQUE KEY `ux_steamid` (`steamid`)"
    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
)


def pg_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'], cursor_factory=RealDictCursor)


def migrate() -> Dict[str, Any]:
    s = os.environ['MAIN_DB_SCHEMA']
    pg = pg_conn()
    try:
        with pg.cursor() as cur:
            cur.execute(
                f'SELECT steamid, balance, limit_balance, play_time, '
                f'last_connection, is_hide FROM {s}.economy_balances'
            )
            rows = cur.fetchall()
    finally:
        pg.close()

    data = []
    for r in rows:
        data.append((
            str(r['steamid']),
            str(int(r['balance'])),
            str(int(r['limit_balance'] or 0)),
            str(int(r['play_time'] or 0)),
            str(r['last_connection'] or ''),
            'true' if r['is_hide'] else 'false',
        ))

    conn = new_mysql()
    try:
        with conn.cursor() as cur:
            cur.execute(CREATE_SQL)
            conn.commit()
            cur.executemany(
                "INSERT INTO `IQEconomic_Db` "
                "(steamid, balance, limit_balance, `time`, last_connection, is_hide) "
                "VALUES (%s, %s, %s, %s, %s, %s) "
                "ON DUPLICATE KEY UPDATE "
                "balance=VALUES(balance), limit_balance=VALUES(limit_balance), "
                "`time`=VALUES(`time`), last_connection=VALUES(last_connection), "
                "is_hide=VALUES(is_hide)",
                data,
            )
            conn.commit()
            cur.execute('SELECT COUNT(*) FROM `IQEconomic_Db`')
            total = cur.fetchone()[0]
    finally:
        conn.close()

    return {'ok': True, 'source_rows': len(data), 'total_in_new_db': total}


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''Временный мигратор экономики: проверка новой MySQL и чтение структуры старой базы'''
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'isBase64Encoded': False, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', 'ping')

    try:
        if action == 'ping':
            return resp(200, ping_new())
        if action == 'source_ddl':
            return resp(200, source_ddl())
        if action == 'migrate':
            return resp(200, migrate())
        return resp(400, {'error': 'unknown action'})
    except Exception as e:
        return resp(500, {'ok': False, 'error': str(e)})