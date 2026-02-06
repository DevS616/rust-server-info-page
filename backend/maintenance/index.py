import json
import os
import psycopg2
import jwt
from psycopg2.extras import RealDictCursor
from typing import Dict, Any

def verify_admin_token(token: str) -> bool:
    '''Проверка админского JWT токена'''
    try:
        secret = os.environ.get('JWT_SECRET')
        if not secret:
            return False
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        return payload.get('is_admin', False)
    except:
        return False

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
                SELECT is_maintenance, maintenance_title, maintenance_subtitle,
                       newyear_snow_enabled, newyear_lights_enabled, active_holiday
                FROM site_settings WHERE id = 1
            """)
            result = cur.fetchone()
            
            if not result:
                cur.execute("""
                    INSERT INTO site_settings (id, is_maintenance, maintenance_title, maintenance_subtitle) 
                    VALUES (1, False, 'Сайт временно закрыт на технические работы', 
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
                    'maintenance_subtitle': result['maintenance_subtitle'],
                    'newyear_snow_enabled': result.get('newyear_snow_enabled', True),
                    'newyear_lights_enabled': result.get('newyear_lights_enabled', True),
                    'active_holiday': result.get('active_holiday')
                })
            }
        
        if method == 'PUT':
            token = event.get('headers', {}).get('X-Auth-Token') or event.get('headers', {}).get('x-auth-token')
            if not token or not verify_admin_token(token):
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Unauthorized'})
                }
            
            body_data = json.loads(event.get('body', '{}'))
            print(f'Body data: {body_data}')
            
            is_maintenance = body_data.get('is_maintenance', False)
            maintenance_title = body_data.get('maintenance_title', 'Сайт временно закрыт на технические работы')
            maintenance_subtitle = body_data.get('maintenance_subtitle', 'Подпишитесь на наш Telegram, чтобы узнать больше о завершении работ')
            newyear_snow = body_data.get('newyear_snow_enabled')
            newyear_lights = body_data.get('newyear_lights_enabled')
            active_holiday = body_data.get('active_holiday')
            
            print(f'Active holiday to save: {active_holiday}')
            
            safe_update_parts = []
            
            if 'is_maintenance' in body_data:
                safe_update_parts.append(f"is_maintenance = {is_maintenance}")
            if 'maintenance_title' in body_data:
                safe_val = str(maintenance_title).replace("'", "''")
                safe_update_parts.append(f"maintenance_title = '{safe_val}'")
            if 'maintenance_subtitle' in body_data:
                safe_val = str(maintenance_subtitle).replace("'", "''")
                safe_update_parts.append(f"maintenance_subtitle = '{safe_val}'")
            if 'newyear_snow_enabled' in body_data:
                safe_update_parts.append(f"newyear_snow_enabled = {newyear_snow}")
            if 'newyear_lights_enabled' in body_data:
                safe_update_parts.append(f"newyear_lights_enabled = {newyear_lights}")
            if 'active_holiday' in body_data:
                if active_holiday is None:
                    safe_update_parts.append("active_holiday = NULL")
                else:
                    safe_val = str(active_holiday).replace("'", "''")
                    safe_update_parts.append(f"active_holiday = '{safe_val}'")
            
            safe_update_parts.append('updated_at = NOW()')
            
            query = f"""
                UPDATE site_settings 
                SET {', '.join(safe_update_parts)}
                WHERE id = 1
            """
            print(f'Update query: {query}')
            
            cur.execute(query)
            conn.commit()
            
            print('Update committed successfully')
            
            cur.execute("""
                SELECT is_maintenance, maintenance_title, maintenance_subtitle,
                       newyear_snow_enabled, newyear_lights_enabled, active_holiday
                FROM site_settings WHERE id = 1
            """)
            updated = cur.fetchone()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({
                    'success': True,
                    'is_maintenance': updated['is_maintenance'],
                    'maintenance_title': updated['maintenance_title'],
                    'maintenance_subtitle': updated['maintenance_subtitle'],
                    'newyear_snow_enabled': updated.get('newyear_snow_enabled', True),
                    'newyear_lights_enabled': updated.get('newyear_lights_enabled', True),
                    'active_holiday': updated.get('active_holiday')
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