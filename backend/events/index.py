import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

def get_schema(dsn: str) -> str:
    '''Получение имени схемы из DSN или автоопределение'''
    schema = os.environ.get('MAIN_DB_SCHEMA')
    if schema:
        return schema
    
    # Автоматическое определение схемы по наличию таблицы admins
    try:
        with psycopg2.connect(dsn) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT schemaname 
                    FROM pg_tables 
                    WHERE tablename = 'admins'
                    LIMIT 1
                """)
                result = cur.fetchone()
                if result:
                    return result[0]
    except Exception as e:
        print(f"Schema detection error: {e}")
    
    return 'public'

def handler(event: dict, context) -> dict:
    '''API для управления календарем событий'''
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    dsn = os.environ.get('DATABASE_URL')
    if not dsn:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Database not configured'})
        }
    
    params = event.get('queryStringParameters') or {}
    action = params.get('action', 'list')
    
    # Только список событий доступен всем, остальное - только админам
    if action != 'list':
        token = event.get('headers', {}).get('X-Auth-Token') or event.get('headers', {}).get('x-auth-token')
        if not token or not verify_admin(dsn, token):
            return {
                'statusCode': 403,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Forbidden'})
            }
    
    if method == 'GET':
        return get_events(dsn)
    elif method == 'POST':
        if action == 'create':
            return create_event(dsn, event)
        elif action == 'update':
            return update_event(dsn, event, params)
    elif method == 'DELETE':
        return delete_event(dsn, params)
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }

def verify_admin(dsn: str, token: str) -> bool:
    '''Проверка админского токена'''
    schema = get_schema(dsn)
    try:
        with psycopg2.connect(dsn) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Simple Query Protocol - escape single quotes
                safe_token = token.replace("'", "''")
                cur.execute(
                    f"SELECT id FROM {schema}.admins WHERE token = '{safe_token}'"
                )
                result = cur.fetchone()
                print(f"[AUTH] verify_admin: schema={schema}, token_found={result is not None}")
                return result is not None
    except Exception as e:
        print(f"[AUTH] verify_admin ERROR: {e}")
        return False

def get_events(dsn: str) -> dict:
    '''Получение всех событий'''
    schema = get_schema(dsn)
    try:
        with psycopg2.connect(dsn) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(f"""
                    SELECT id, date, title, description, color
                    FROM {schema}.calendar_events
                    ORDER BY date
                """)
                events = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'events': [dict(e) for e in events]}, default=str)
                }
    except Exception as e:
        print(f"Get events error: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }

def create_event(dsn: str, event: dict) -> dict:
    '''Создание нового события'''
    schema = get_schema(dsn)
    try:
        data = json.loads(event.get('body', '{}'))
        date = data.get('date')
        title = data.get('title')
        description = data.get('description')
        color = data.get('color', '#DC2626')
        
        if not all([date, title, description]):
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing required fields'})
            }
        
        with psycopg2.connect(dsn) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Escape single quotes for Simple Query Protocol
                safe_date = date.replace("'", "''")
                safe_title = title.replace("'", "''")
                safe_description = description.replace("'", "''")
                safe_color = color.replace("'", "''")
                
                cur.execute(f"""
                    INSERT INTO {schema}.calendar_events (date, title, description, color)
                    VALUES ('{safe_date}', '{safe_title}', '{safe_description}', '{safe_color}')
                    RETURNING id, date, title, description, color
                """)
                
                new_event = cur.fetchone()
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'event': dict(new_event)}, default=str)
                }
    except Exception as e:
        print(f"Create event error: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }

def update_event(dsn: str, event: dict, params: dict) -> dict:
    '''Обновление события'''
    schema = get_schema(dsn)
    try:
        event_id = params.get('id')
        if not event_id:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing event ID'})
            }
        
        data = json.loads(event.get('body', '{}'))
        date = data.get('date')
        title = data.get('title')
        description = data.get('description')
        color = data.get('color')
        
        if not all([date, title, description, color]):
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing required fields'})
            }
        
        with psycopg2.connect(dsn) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Escape single quotes for Simple Query Protocol
                safe_date = date.replace("'", "''")
                safe_title = title.replace("'", "''")
                safe_description = description.replace("'", "''")
                safe_color = color.replace("'", "''")
                safe_id = str(event_id).replace("'", "''")
                
                cur.execute(f"""
                    UPDATE {schema}.calendar_events
                    SET date = '{safe_date}', title = '{safe_title}', description = '{safe_description}', color = '{safe_color}'
                    WHERE id = '{safe_id}'
                    RETURNING id, date, title, description, color
                """)
                
                updated_event = cur.fetchone()
                conn.commit()
                
                if not updated_event:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Event not found'})
                    }
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'event': dict(updated_event)}, default=str)
                }
    except Exception as e:
        print(f"Update event error: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }

def delete_event(dsn: str, params: dict) -> dict:
    '''Удаление события'''
    schema = get_schema(dsn)
    try:
        event_id = params.get('id')
        if not event_id:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing event ID'})
            }
        
        with psycopg2.connect(dsn) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Escape single quotes for Simple Query Protocol
                safe_id = str(event_id).replace("'", "''")
                
                cur.execute(f"""
                    DELETE FROM {schema}.calendar_events WHERE id = '{safe_id}'
                    RETURNING id
                """)
                
                deleted = cur.fetchone()
                conn.commit()
                
                if not deleted:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Event not found'})
                    }
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True})
                }
    except Exception as e:
        print(f"Delete event error: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }