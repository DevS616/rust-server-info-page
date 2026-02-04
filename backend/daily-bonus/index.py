"""
Система управления ежедневными бонусами игроков.
Отслеживает последнее время получения бонуса по Steam ID.
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
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': ''
        }
    
    conn = None
    cur = None
    
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if method == 'GET':
            steam_id = event.get('queryStringParameters', {}).get('steam_id')
            bonus_type = event.get('queryStringParameters', {}).get('bonus_type', 'daily')
            
            if not steam_id:
                return response(400, {'error': 'steam_id required'})
            
            if bonus_type == 'weekly':
                safe_steam_id = str(steam_id).replace("'", "''")
                cur.execute(
                    f"SELECT last_weekly_bonus FROM daily_bonus_claims WHERE steam_id = '{safe_steam_id}'"
                )
                row = cur.fetchone()
                
                if not row or not row['last_weekly_bonus']:
                    return response(200, {'can_claim': True, 'time_left': 0})
                
                last_bonus = row['last_weekly_bonus']
                now = datetime.utcnow()
                next_available = last_bonus + timedelta(days=7)
                
                if now >= next_available:
                    return response(200, {'can_claim': True, 'time_left': 0})
                
                time_left_seconds = int((next_available - now).total_seconds())
                return response(200, {
                    'can_claim': False,
                    'time_left': time_left_seconds,
                    'next_available': next_available.isoformat()
                })
            else:
                safe_steam_id = str(steam_id).replace("'", "''")
                cur.execute(
                    f"SELECT last_spin_time FROM daily_bonus_claims WHERE steam_id = '{safe_steam_id}'"
                )
                row = cur.fetchone()
                
                if not row:
                    return response(200, {'can_claim': True, 'time_left': 0})
                
                last_spin = row['last_spin_time']
                now = datetime.utcnow()
                next_available = last_spin + timedelta(hours=24)
                
                if now >= next_available:
                    return response(200, {'can_claim': True, 'time_left': 0})
                
                time_left_seconds = int((next_available - now).total_seconds())
                return response(200, {
                    'can_claim': False,
                    'time_left': time_left_seconds,
                    'next_available': next_available.isoformat()
                })
        
        elif method == 'POST':
            body_str = event.get('body', '{}')
            try:
                body = json.loads(body_str) if isinstance(body_str, str) else body_str
                steam_id = body.get('steam_id') if isinstance(body, dict) else None
                amount = body.get('amount', 0) if isinstance(body, dict) else 0
                username = body.get('username') if isinstance(body, dict) else None
                avatar = body.get('avatar') if isinstance(body, dict) else None
                bonus_type = body.get('bonus_type', 'daily') if isinstance(body, dict) else 'daily'
            except (json.JSONDecodeError, AttributeError):
                return response(400, {'error': 'Invalid request body'})
            
            if not steam_id:
                return response(400, {'error': 'steam_id required'})
            
            now = datetime.utcnow()
            
            if bonus_type == 'weekly':
                safe_steam_id = str(steam_id).replace("'", "''")
                cur.execute(
                    f"SELECT last_weekly_bonus FROM daily_bonus_claims WHERE steam_id = '{safe_steam_id}'"
                )
                row = cur.fetchone()
                
                if row and row['last_weekly_bonus']:
                    last_bonus = row['last_weekly_bonus']
                    days_since = (now - last_bonus).total_seconds() / 86400
                    
                    if days_since < 7:
                        time_left = int((7 * 86400) - (days_since * 86400))
                        return response(429, {
                            'error': 'Too early',
                            'time_left': time_left
                        })
                    
                    safe_steam_id = str(steam_id).replace("'", "''")
                    safe_username = str(username).replace("'", "''")
                    safe_avatar = str(avatar).replace("'", "''")
                    cur.execute(
                        f"UPDATE daily_bonus_claims SET last_weekly_bonus = '{now}', total_spins = total_spins + 1, total_winnings = total_winnings + {amount}, steam_username = '{safe_username}', steam_avatar = '{safe_avatar}' WHERE steam_id = '{safe_steam_id}'"
                    )
                else:
                    if row:
                        safe_steam_id = str(steam_id).replace("'", "''")
                        safe_username = str(username).replace("'", "''")
                        safe_avatar = str(avatar).replace("'", "''")
                        cur.execute(
                            f"UPDATE daily_bonus_claims SET last_weekly_bonus = '{now}', total_spins = total_spins + 1, total_winnings = total_winnings + {amount}, steam_username = '{safe_username}', steam_avatar = '{safe_avatar}' WHERE steam_id = '{safe_steam_id}'"
                        )
                    else:
                        safe_steam_id = str(steam_id).replace("'", "''")
                        safe_username = str(username).replace("'", "''")
                        safe_avatar = str(avatar).replace("'", "''")
                        cur.execute(
                            f"INSERT INTO daily_bonus_claims (steam_id, last_weekly_bonus, total_spins, total_winnings, steam_username, steam_avatar) VALUES ('{safe_steam_id}', '{now}', 1, {amount}, '{safe_username}', '{safe_avatar}')"
                        )
                
                conn.commit()
                return response(200, {'success': True, 'next_available': (now + timedelta(days=7)).isoformat()})
            else:
                safe_steam_id = str(steam_id).replace("'", "''")
                cur.execute(
                    f"SELECT last_spin_time FROM daily_bonus_claims WHERE steam_id = '{safe_steam_id}'"
                )
                row = cur.fetchone()
                
                if row and row['last_spin_time']:
                    last_spin = row['last_spin_time']
                    hours_since = (now - last_spin).total_seconds() / 3600
                    
                    if hours_since < 24:
                        time_left = int((24 * 3600) - (hours_since * 3600))
                        return response(429, {
                            'error': 'Too early',
                            'time_left': time_left
                        })
                    
                    safe_steam_id = str(steam_id).replace("'", "''")
                    safe_username = str(username).replace("'", "''")
                    safe_avatar = str(avatar).replace("'", "''")
                    cur.execute(
                        f"UPDATE daily_bonus_claims SET last_spin_time = '{now}', total_spins = total_spins + 1, total_winnings = total_winnings + {amount}, steam_username = '{safe_username}', steam_avatar = '{safe_avatar}' WHERE steam_id = '{safe_steam_id}'"
                    )
                elif row:
                    safe_steam_id = str(steam_id).replace("'", "''")
                    safe_username = str(username).replace("'", "''")
                    safe_avatar = str(avatar).replace("'", "''")
                    cur.execute(
                        f"UPDATE daily_bonus_claims SET last_spin_time = '{now}', total_spins = total_spins + 1, total_winnings = total_winnings + {amount}, steam_username = '{safe_username}', steam_avatar = '{safe_avatar}' WHERE steam_id = '{safe_steam_id}'"
                    )
                else:
                    safe_steam_id = str(steam_id).replace("'", "''")
                    safe_username = str(username).replace("'", "''")
                    safe_avatar = str(avatar).replace("'", "''")
                    cur.execute(
                        f"INSERT INTO daily_bonus_claims (steam_id, last_spin_time, total_spins, total_winnings, steam_username, steam_avatar) VALUES ('{safe_steam_id}', '{now}', 1, {amount}, '{safe_username}', '{safe_avatar}')"
                    )
                
                conn.commit()
                return response(200, {'success': True, 'next_available': (now + timedelta(hours=24)).isoformat()})
        
        return response(405, {'error': 'Method not allowed'})
        
    except Exception as e:
        return response(500, {'error': str(e)})
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