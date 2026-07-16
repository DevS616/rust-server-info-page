import os
import json
from typing import Dict, Any, List

import pymysql


def inspect_db(host: str, port: int, user: str, password: str, db: str) -> Dict[str, Any]:
    result: Dict[str, Any] = {'database': db, 'tables': {}}
    conn = pymysql.connect(
        host=host, port=port, user=user, password=password, database=db,
        connect_timeout=15, cursorclass=pymysql.cursors.DictCursor,
        charset='utf8mb4'
    )
    try:
        with conn.cursor() as cur:
            cur.execute('SHOW TABLES')
            rows = cur.fetchall()
            table_names: List[str] = [list(r.values())[0] for r in rows]

            for t in table_names:
                info: Dict[str, Any] = {}
                cur.execute(f'DESCRIBE `{t}`')
                cols = cur.fetchall()
                info['columns'] = [
                    {'field': c['Field'], 'type': c['Type'], 'null': c['Null'], 'key': c['Key']}
                    for c in cols
                ]
                cur.execute(f'SELECT COUNT(*) AS cnt FROM `{t}`')
                info['row_count'] = cur.fetchone()['cnt']
                cur.execute(f'SELECT * FROM `{t}` LIMIT 3')
                sample = cur.fetchall()
                info['sample'] = json.loads(json.dumps(sample, default=str, ensure_ascii=False))
                result['tables'][t] = info
    finally:
        conn.close()
    return result


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''Временный инспектор: показывает структуру внешних баз MySQL (Экономика, Банлист)'''
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            'body': '',
        }

    params = event.get('queryStringParameters') or {}
    target = params.get('target', 'economy')

    if target == 'banlist':
        prefix = 'BANLIST_MYSQL_'
        db = os.environ.get('BANLIST_MYSQL_DB')
    else:
        prefix = 'SOURCE_MYSQL_'
        db = os.environ.get('SOURCE_MYSQL_DB_ECONOMY')

    try:
        data = inspect_db(
            host=os.environ[f'{prefix}HOST'],
            port=int(os.environ[f'{prefix}PORT']),
            user=os.environ[f'{prefix}USER'],
            password=os.environ[f'{prefix}PASSWORD'],
            db=db,
        )
        body = {'ok': True, 'data': data}
    except Exception as e:
        body = {'ok': False, 'error': str(e), 'target': target}

    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        'isBase64Encoded': False,
        'body': json.dumps(body, ensure_ascii=False),
    }
