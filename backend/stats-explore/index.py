import os
import json
from typing import Dict, Any

import pymysql


def resp(status: int, body: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'statusCode': status,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'isBase64Encoded': False,
        'body': json.dumps(body, ensure_ascii=False, default=str),
    }


def stats_conn():
    return pymysql.connect(
        host=os.environ['NEW_MYSQL_HOST'],
        port=int(os.environ.get('NEW_MYSQL_PORT', '3306')),
        user=os.environ['NEW_MYSQL_USER'],
        password=os.environ['NEW_MYSQL_PASSWORD'],
        database=os.environ['NEW_MYSQL_STATS_DB'],
        charset='utf8mb4',
        connect_timeout=10,
    )


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''Временный разведчик структуры базы статистики'''
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*'}, 'isBase64Encoded': False, 'body': ''}
    try:
        conn = stats_conn()
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
        return resp(200, {'ok': True, 'tables': tables, 'info': out})
    except Exception as e:
        return resp(500, {'ok': False, 'error': str(e)})
