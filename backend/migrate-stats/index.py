import os
import json
from typing import Dict, Any

import pymysql

SRC = dict(
    host='37.230.228.84', port=3306, database='s7315_Stats',
    user='u7315_lHfgYPuWwf', password='@nwL6S!rxXGn76+.muKR^kg^',
)


def resp(status: int, body: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'statusCode': status,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'isBase64Encoded': False,
        'body': json.dumps(body, ensure_ascii=False, default=str),
    }


def src_conn():
    return pymysql.connect(charset='utf8mb4', connect_timeout=10, **SRC)


def dst_conn():
    return pymysql.connect(
        host=os.environ['NEW_MYSQL_HOST'],
        port=int(os.environ.get('NEW_MYSQL_PORT', '3306')),
        user=os.environ['NEW_MYSQL_USER'],
        password=os.environ['NEW_MYSQL_PASSWORD'],
        database=os.environ['NEW_MYSQL_STATS_DB'],
        charset='utf8mb4',
        connect_timeout=10,
    )


def explore() -> Dict[str, Any]:
    conn = src_conn()
    try:
        with conn.cursor() as cur:
            cur.execute('SHOW TABLES')
            tables = [r[0] for r in cur.fetchall()]
            out = {}
            for t in tables:
                cur.execute(f'SHOW CREATE TABLE `{t}`')
                ddl = cur.fetchone()[1]
                cur.execute(f'SELECT COUNT(*) FROM `{t}`')
                cnt = cur.fetchone()[0]
                cur.execute(f'SELECT * FROM `{t}` LIMIT 3')
                cols = [d[0] for d in cur.description]
                rows = [list(map(str, r)) for r in cur.fetchall()]
                out[t] = {'ddl': ddl, 'count': cnt, 'columns': cols, 'rows': rows}
    finally:
        conn.close()
    return {'ok': True, 'tables': tables, 'info': out}


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''Временный мигратор статистики: разведка структуры старой базы s7315_Stats'''
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*'}, 'isBase64Encoded': False, 'body': ''}
    params = event.get('queryStringParameters') or {}
    action = params.get('action', 'explore')
    try:
        if action == 'explore':
            return resp(200, explore())
        return resp(400, {'error': 'unknown action'})
    except Exception as e:
        return resp(500, {'ok': False, 'error': str(e)})
