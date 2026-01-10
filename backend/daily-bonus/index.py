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
            if not steam_id:
                return response(400, {'error': 'steam_id required'})
            
            cur.execute(
                "SELECT last_spin_time FROM daily_bonus_claims WHERE steam_id = %s",
                (steam_id,)
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
            except (json.JSONDecodeError, AttributeError):
                return response(400, {'error': 'Invalid request body'})
            
            if not steam_id:
                return response(400, {'error': 'steam_id required'})
            
            now = datetime.utcnow()
            
            cur.execute(
                "SELECT last_spin_time FROM daily_bonus_claims WHERE steam_id = %s",
                (steam_id,)
            )
            row = cur.fetchone()
            
            if row:
                last_spin = row['last_spin_time']
                hours_since = (now - last_spin).total_seconds() / 3600
                
                if hours_since < 24:
                    time_left = int((24 * 3600) - (hours_since * 3600))
                    return response(429, {
                        'error': 'Too early',
                        'time_left': time_left
                    })
                
                cur.execute(
                    "UPDATE daily_bonus_claims SET last_spin_time = %s WHERE steam_id = %s",
                    (now, steam_id)
                )
            else:
                cur.execute(
                    "INSERT INTO daily_bonus_claims (steam_id, last_spin_time) VALUES (%s, %s)",
                    (steam_id, now)
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