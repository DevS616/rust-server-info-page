import os
import json
import pymysql
import urllib.request
import urllib.error
from typing import Dict, Any, List


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Объединенная API функция для DevilRust проекта.
    Маршрутизация по path:
    - /banlist - список банов из MySQL
    - /monitoring - данные мониторинга (прокси к devilrust.ru API)
    
    Args:
        event - dict с httpMethod, path
        context - объект с request_id, function_name
    
    Returns:
        HTTP response dict с данными в формате JSON
    """
    method: str = event.get('httpMethod', 'GET')
    path: str = event.get('path', '/')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    query_params = event.get('queryStringParameters') or {}
    endpoint = query_params.get('type', 'banlist')
    
    if endpoint == 'monitoring':
        return get_monitoring()
    else:
        return get_banlist()


def get_banlist() -> Dict[str, Any]:
    """Получает список банов из MySQL базы данных"""
    connection = None
    try:
        connection = pymysql.connect(
            host=os.environ['BANLIST_MYSQL_HOST'],
            port=int(os.environ['BANLIST_MYSQL_PORT']),
            user=os.environ['BANLIST_MYSQL_USER'],
            password=os.environ['BANLIST_MYSQL_PASSWORD'],
            database=os.environ['BANLIST_MYSQL_DB'],
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=5
        )
        
        with connection.cursor() as cursor:
            sql = """
                SELECT 
                    id,
                    steamid,
                    ipAdress,
                    permanent,
                    timeUnbanned,
                    reason,
                    serverName,
                    serverAdress,
                    owner,
                    nameHistory,
                    ipHistory,
                    steamIdHistory
                FROM IQBanSystem_Db
                ORDER BY id DESC
            """
            cursor.execute(sql)
            bans: List[Dict[str, Any]] = cursor.fetchall()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'bans': bans,
                'total': len(bans)
            }, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    except pymysql.MySQLError as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Database error',
                'message': str(e)
            }),
            'isBase64Encoded': False
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            }),
            'isBase64Encoded': False
        }
    
    finally:
        if connection:
            connection.close()


def get_monitoring() -> Dict[str, Any]:
    """Прокси для API мониторинга devilrust.ru"""
    try:
        req = urllib.request.Request(
            'https://devilrust.ru/api/v1/widgets.monitoring',
            headers={
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            data = response.read().decode('utf-8')
            
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=30'
            },
            'isBase64Encoded': False,
            'body': data
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({
                'result': 'error',
                'data': {'total': {'players': 0}, 'servers': []},
                'error': str(e)
            })
        }