"""
Выдача ежедневного бонуса игроку через API devilrust.ru.
Использует секретные ключи для защиты от несанкционированного доступа.
Обновляет счетчики total_spins и total_winnings в daily_bonus_claims.
"""

import json
import os
from urllib.parse import quote
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError
import psycopg2


def handler(event: dict, context) -> dict:
    """Обработчик выдачи бонуса с обновлением статистики"""
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
        
        print(f'Crediting bonus: steam_id={steam_id}, amount={amount}')
        req = Request(api_url)
        with urlopen(req, timeout=10) as res:
            result_text = res.read().decode('utf-8')
            print(f'API response [{res.status}]: {result_text}')

            api_status = None
            try:
                api_status = json.loads(result_text).get('status')
            except (ValueError, AttributeError):
                pass

            if res.status == 200 and api_status != 'error':
                save_bonus_history(steam_id, amount)
                return response(200, {'success': True, 'api_response': result_text})
            return response(502, {'error': 'Failed to credit bonus', 'details': result_text})
                
    except (URLError, HTTPError) as e:
        return response(500, {'error': f'API request failed: {str(e)}'})
    except Exception as e:
        return response(500, {'error': str(e)})


def save_bonus_history(steam_id: str, amount: int):
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        safe_id = str(steam_id).replace("'", "''")
        safe_amount = int(amount)

        cur.execute(
            f"INSERT INTO t_p48919527_rust_server_info_pag.bonus_history (steam_id, amount) VALUES ('{safe_id}', {safe_amount})"
        )

        cur.execute(
            f"UPDATE t_p48919527_rust_server_info_pag.daily_bonus_claims SET total_spins = total_spins + 1, total_winnings = total_winnings + {safe_amount} WHERE steam_id = '{safe_id}'"
        )
        
        conn.commit()
    except Exception as e:
        print(f'Failed to save bonus history: {str(e)}')
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


def response(status: int, data: dict) -> dict:
    return {
        'statusCode': status,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(data)
    }