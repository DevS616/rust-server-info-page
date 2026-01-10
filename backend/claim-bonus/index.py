"""
Выдача ежедневного бонуса игроку через API devilrust.ru.
Использует секретные ключи для защиты от несанкционированного доступа.
"""

import json
import os
from urllib.parse import quote
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError


def handler(event: dict, context) -> dict:
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': ''
        }
    
    if method != 'POST':
        return response(405, {'error': 'Method not allowed'})
    
    try:
        body_str = event.get('body', '{}')
        body = json.loads(body_str) if isinstance(body_str, str) else body_str
        
        steam_id = body.get('steam_id')
        amount = body.get('amount')
        
        if not steam_id or not amount:
            return response(400, {'error': 'steam_id and amount required'})
        
        secret_key = os.environ.get('DEVILRUST_API_SECRET')
        store_id = os.environ.get('DEVILRUST_STORE_ID')
        
        if not secret_key or not store_id:
            return response(500, {'error': 'Server configuration error'})
        
        message = quote('Ежедневный бонус')
        api_url = (
            f'https://api.yrsproject.ru/public/service/gamestores/GetBalance/'
            f'{steam_id}/{secret_key}/{store_id}'
            f'?type=plus&amount={amount}&message={message}'
        )
        
        print(f'Calling API: {api_url}')
        req = Request(api_url)
        with urlopen(req, timeout=10) as res:
            result_text = res.read().decode('utf-8')
            print(f'API response [{res.status}]: {result_text}')
            if res.status == 200:
                return response(200, {'success': True, 'api_response': result_text})
            else:
                return response(res.status, {'error': 'Failed to credit bonus', 'details': result_text})
                
    except (URLError, HTTPError) as e:
        return response(500, {'error': f'API request failed: {str(e)}'})
    except Exception as e:
        return response(500, {'error': str(e)})


def response(status: int, data: dict) -> dict:
    return {
        'statusCode': status,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(data)
    }