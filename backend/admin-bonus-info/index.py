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
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
    elif method == 'DELETE':
        return handle_delete_no_username()
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
                last_weekly_bonus,
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
        print(f'[RESET] Raw event: {json.dumps(event)}')
        
        body_str = event.get('body', '{}')
        print(f'[RESET] Body string: {body_str}')
        
        body = json.loads(body_str) if isinstance(body_str, str) else body_str
        print(f'[RESET] Parsed body: {body}')
        
        steam_id = body.get('steam_id')
        bonus_type = body.get('bonus_type', 'daily')
        
        print(f'[RESET] Extracted steam_id: {steam_id}, bonus_type: {bonus_type}')
        
        if not steam_id:
            print('[RESET] ERROR: No steam_id provided')
            return response(400, {'error': 'steam_id required'})
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        print(f'[RESET] Database connected')
        
        # Escape single quotes for Simple Query Protocol
        safe_steam_id = str(steam_id).replace("'", "''")
        cur.execute(f"SELECT steam_id, last_spin_time, last_weekly_bonus FROM daily_bonus_claims WHERE steam_id = '{safe_steam_id}'")
        existing = cur.fetchone()
        print(f'[RESET] Existing record: {existing}')
        
        if not existing:
            print(f'[RESET] ERROR: Record not found for steam_id {steam_id}')
            return response(404, {'error': 'Player not found in database'})
        
        past_time = datetime.utcnow() - timedelta(days=8)
        print(f'[RESET] Will set time to: {past_time}')
        
        if bonus_type == 'weekly':
            print(f'[RESET] Executing UPDATE for weekly bonus')
            safe_steam_id = str(steam_id).replace("'", "''")
            cur.execute(
                f"UPDATE daily_bonus_claims SET last_weekly_bonus = '{past_time}' WHERE steam_id = '{safe_steam_id}'"
            )
            print(f'[RESET] UPDATE executed, rows affected: {cur.rowcount}')
        elif bonus_type == 'daily':
            print(f'[RESET] Executing UPDATE for daily bonus')
            safe_steam_id = str(steam_id).replace("'", "''")
            cur.execute(
                f"UPDATE daily_bonus_claims SET last_spin_time = '{past_time}' WHERE steam_id = '{safe_steam_id}'"
            )
            print(f'[RESET] UPDATE executed, rows affected: {cur.rowcount}')
        else:
            print(f'[RESET] ERROR: Invalid bonus_type: {bonus_type}')
            return response(400, {'error': 'Invalid bonus_type'})
        
        if cur.rowcount == 0:
            print(f'[RESET] ERROR: UPDATE affected 0 rows')
            return response(404, {'error': 'Update failed - no rows affected'})
        
        conn.commit()
        print(f'[RESET] Transaction committed successfully')
        
        safe_steam_id = str(steam_id).replace("'", "''")
        cur.execute(f"SELECT steam_id, last_spin_time, last_weekly_bonus FROM daily_bonus_claims WHERE steam_id = '{safe_steam_id}'")
        updated = cur.fetchone()
        print(f'[RESET] Record after update: {updated}')
        
        return response(200, {
            'success': True, 
            'message': f'{bonus_type.capitalize()} limit reset successfully',
            'updated_record': {
                'steam_id': updated[0] if updated else None,
                'last_spin_time': str(updated[1]) if updated and updated[1] else None,
                'last_weekly_bonus': str(updated[2]) if updated and updated[2] else None
            }
        })
        
    except Exception as e:
        print(f'[RESET] EXCEPTION: {type(e).__name__}: {str(e)}')
        import traceback
        print(f'[RESET] Traceback: {traceback.format_exc()}')
        return response(500, {'error': str(e)})
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


def handle_delete_no_username() -> dict:
    conn = None
    cur = None
    
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        cur.execute("DELETE FROM daily_bonus_claims WHERE steam_username IS NULL")
        deleted_count = cur.rowcount
        
        conn.commit()
        
        return response(200, {
            'success': True,
            'deleted_count': deleted_count,
            'message': f'Deleted {deleted_count} records without username'
        })
        
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
        
        safe_token = str(token).replace("'", "''")
        cur.execute(f"SELECT id FROM admins WHERE token = '{safe_token}'")
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