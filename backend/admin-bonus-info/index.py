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
            'body': ''
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
                dbc.id,
                dbc.steam_id,
                u.steam_username,
                u.steam_avatar,
                dbc.last_spin_time,
                COUNT(bh.id) as total_spins,
                COALESCE(SUM(bh.amount), 0) as total_winnings
            FROM daily_bonus_claims dbc
            LEFT JOIN users u ON u.steam_id = dbc.steam_id
            LEFT JOIN bonus_history bh ON bh.steam_id = dbc.steam_id
            GROUP BY dbc.id, dbc.steam_id, u.steam_username, u.steam_avatar, dbc.last_spin_time
            ORDER BY dbc.last_spin_time DESC
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
    try:
        body_str = event.get('body', '{}')
        body = json.loads(body_str) if isinstance(body_str, str) else body_str
        
        steam_id = body.get('steam_id')
        
        if not steam_id:
            return response(400, {'error': 'steam_id required'})
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        past_time = datetime.utcnow() - timedelta(hours=24)
        
        cur.execute(
            f"UPDATE daily_bonus_claims SET last_spin_time = %s WHERE steam_id = '{steam_id.replace(\"'\", \"''\")}'"
            , (past_time,)
        )
        
        if cur.rowcount == 0:
            return response(404, {'error': 'Player not found'})
        
        conn.commit()
        cur.close()
        conn.close()
        
        return response(200, {'success': True, 'message': 'Limit reset successfully'})
        
    except Exception as e:
        print(f'Error: {str(e)}')
        return response(500, {'error': str(e)})


def verify_admin_token(token: str) -> bool:
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        cur.execute(f"SELECT id FROM admins WHERE token = '{token.replace(\"'\", \"''\")}'")
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
        'body': json.dumps(data, default=str)
    }
