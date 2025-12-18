import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Управление режимом технических работ
    GET / - получить статус
    PUT / - изменить статус (только админ)
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        if method == 'GET':
            cur.execute("""
                SELECT is_maintenance, maintenance_title, maintenance_subtitle 
                FROM site_settings WHERE id = 1
            """)
            result = cur.fetchone()
            
            if not result:
                cur.execute("""
                    INSERT INTO site_settings (id, is_maintenance, maintenance_title, maintenance_subtitle) 
                    VALUES (1, FALSE, 'Сайт временно закрыт на технические работы', 
                            'Подпишитесь на наш Telegram, чтобы узнать больше о завершении работ')
                """)
                conn.commit()
                result = {
                    'is_maintenance': False,
                    'maintenance_title': 'Сайт временно закрыт на технические работы',
                    'maintenance_subtitle': 'Подпишитесь на наш Telegram, чтобы узнать больше о завершении работ'
                }
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({
                    'is_maintenance': result['is_maintenance'],
                    'maintenance_title': result['maintenance_title'],
                    'maintenance_subtitle': result['maintenance_subtitle']
                })
            }
        
        if method == 'PUT':
            token = event.get('headers', {}).get('X-Auth-Token') or event.get('headers', {}).get('x-auth-token')
            
            if not token:
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Unauthorized'})
                }
            
            cur.execute("SELECT id, role FROM admins WHERE token = %s", (token,))
            admin = cur.fetchone()
            
            if not admin:
                return {
                    'statusCode': 403,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Access denied'})
                }
            
            body_data = json.loads(event.get('body', '{}'))
            is_maintenance = body_data.get('is_maintenance', False)
            maintenance_title = body_data.get('maintenance_title', 'Сайт временно закрыт на технические работы')
            maintenance_subtitle = body_data.get('maintenance_subtitle', 'Подпишитесь на наш Telegram, чтобы узнать больше о завершении работ')
            
            cur.execute("""
                INSERT INTO site_settings (id, is_maintenance, maintenance_title, maintenance_subtitle) 
                VALUES (1, %s, %s, %s) 
                ON CONFLICT (id) 
                DO UPDATE SET 
                    is_maintenance = %s, 
                    maintenance_title = %s, 
                    maintenance_subtitle = %s, 
                    updated_at = NOW()
            """, (is_maintenance, maintenance_title, maintenance_subtitle,
                  is_maintenance, maintenance_title, maintenance_subtitle))
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({
                    'success': True,
                    'is_maintenance': is_maintenance,
                    'maintenance_title': maintenance_title,
                    'maintenance_subtitle': maintenance_subtitle
                })
            }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
    finally:
        cur.close()
        conn.close()