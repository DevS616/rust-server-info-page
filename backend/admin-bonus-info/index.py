"""
Получение статистики по ежедневным бонусам для админ-панели.
Возвращает список игроков с историей прокруток.
POST: сброс лимита для конкретного игрока.
"""

import json
import os
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor


def handler(event: dict, context) -> dict:
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    headers = event.get('headers', {})
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token')
    
    if not token or not verify_admin_token(token):
        return response(403, {'error': 'Access denied'})
    
    if method == 'GET':
        return handle_get_records()
    elif method == 'POST':
        return handle_reset_limit(event)
    else:
        return response(405, {'error': 'Method not allowed'})


def handle_get_records() -> dict:
    conn = None
    cur = None
    
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT 
                id,
                steam_id,
                steam_username,
                steam_avatar,
                last_spin_time,
                total_spins,
                total_winnings
            FROM daily_bonus_claims
            ORDER BY last_spin_time DESC
        """)
        
        records = cur.fetchall()
        
        return response(200, {
            'records': [dict(r) for r in records]
        })
        
    except Exception as e:
        print(f'Error: {str(e)}')
        return response(500, {'error': str(e)})
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


def handle_reset_limit(event: dict) -> dict:
    conn = None
    cur = None
    
    try:
        body_str = event.get('body', '{}')
        body = json.loads(body_str) if isinstance(body_str, str) else body_str
        
        steam_id = body.get('steam_id')
        
        if not steam_id:
            return response(400, {'error': 'steam_id required'})
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        past_time = datetime.utcnow() - timedelta(days=8)
        
        cur.execute(
            "UPDATE daily_bonus_claims SET last_spin_time = %s, last_weekly_bonus = %s WHERE steam_id = %s",
            (past_time, past_time, steam_id)
        )
        
        if cur.rowcount == 0:
            return response(404, {'error': 'Player not found'})
        
        conn.commit()
        
        return response(200, {'success': True, 'message': 'Limit reset successfully'})
        
    except Exception as e:
        print(f'Error: {str(e)}')
        return response(500, {'error': str(e)})
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


def verify_admin_token(token: str) -> bool:
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        cur.execute("SELECT id FROM admins WHERE token = %s", (token,))
        return cur.fetchone() is not None
    except:
        return False
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
        'body': json.dumps(data, default=str),
        'isBase64Encoded': False
    }