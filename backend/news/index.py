import json
import os
import base64
import uuid
import boto3
import psycopg2
import jwt
from psycopg2.extras import RealDictCursor

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

def handler(event: dict, context) -> dict:
    '''API для управления новостями сайта (с JWT авторизацией)'''
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token'
            },
            'body': ''
        }
    
    try:
        dsn = os.environ.get('DATABASE_URL')
        schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
        
        conn = psycopg2.connect(dsn, options=f'-c search_path={schema}')
        conn.autocommit = True
        
        if method == 'GET':
            action = event.get('queryStringParameters', {}).get('action', 'list')
            
            if action == 'list':
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute('''
                        SELECT id, title, description, date, category, icon, 
                               image_url, is_published, created_at, updated_at
                        FROM news
                        WHERE is_published = TRUE
                        ORDER BY created_at DESC
                    ''')
                    news = cur.fetchall()
                
                conn.close()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps([dict(row) for row in news], default=str)
                }
            
            elif action == 'admin-list':
                token = event.get('headers', {}).get('X-Auth-Token') or event.get('headers', {}).get('x-auth-token')
                if not token or not verify_admin_token(token):
                    conn.close()
                    return {
                        'statusCode': 401,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Unauthorized'})
                    }
                
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute('''
                        SELECT id, title, description, date, category, icon, 
                               image_url, is_published, created_at, updated_at
                        FROM news
                        ORDER BY created_at DESC
                    ''')
                    news = cur.fetchall()
                
                conn.close()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps([dict(row) for row in news], default=str)
                }
        
        elif method == 'POST':
            token = event.get('headers', {}).get('X-Auth-Token') or event.get('headers', {}).get('x-auth-token')
            if not token or not verify_admin_token(token):
                conn.close()
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Unauthorized'})
                }
            
            data = json.loads(event.get('body', '{}'))
            title = data.get('title', '')
            description = data.get('description', '')
            date = data.get('date', '')
            category = data.get('category', 'news')
            icon = data.get('icon', 'Newspaper')
            is_published = data.get('is_published', True)
            
            image_url = None
            if data.get('image_base64'):
                s3 = boto3.client('s3',
                    endpoint_url='https://bucket.poehali.dev',
                    aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                    aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
                )
                
                image_data = base64.b64decode(data['image_base64'])
                image_ext = data.get('image_type', 'jpg')
                image_filename = f"news/{uuid.uuid4()}.{image_ext}"
                
                s3.put_object(
                    Bucket='files',
                    Key=image_filename,
                    Body=image_data,
                    ContentType=f'image/{image_ext}'
                )
                
                image_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{image_filename}"
            
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                safe_title = str(title).replace("'", "''")
                safe_desc = str(description).replace("'", "''")
                safe_date = str(date).replace("'", "''")
                safe_cat = str(category).replace("'", "''")
                safe_icon = str(icon).replace("'", "''")
                safe_url = 'NULL' if image_url is None else f"'{str(image_url).replace("'", "''")}'" 
                cur.execute(f'''
                    INSERT INTO news (title, description, date, category, icon, image_url, is_published)
                    VALUES ('{safe_title}', '{safe_desc}', '{safe_date}', '{safe_cat}', '{safe_icon}', {safe_url}, {is_published})
                    RETURNING id, title, description, date, category, icon, image_url, is_published, created_at, updated_at
                ''')
                news_item = cur.fetchone()
            
            conn.close()
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps(dict(news_item), default=str)
            }
        
        elif method == 'PUT':
            token = event.get('headers', {}).get('X-Auth-Token') or event.get('headers', {}).get('x-auth-token')
            if not token or not verify_admin_token(token):
                conn.close()
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Unauthorized'})
                }
            
            data = json.loads(event.get('body', '{}'))
            news_id = data.get('id')
            title = data.get('title')
            description = data.get('description')
            date = data.get('date')
            category = data.get('category')
            icon = data.get('icon')
            is_published = data.get('is_published')
            
            image_url = data.get('image_url')
            if data.get('image_base64'):
                s3 = boto3.client('s3',
                    endpoint_url='https://bucket.poehali.dev',
                    aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                    aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
                )
                
                image_data = base64.b64decode(data['image_base64'])
                image_ext = data.get('image_type', 'jpg')
                image_filename = f"news/{uuid.uuid4()}.{image_ext}"
                
                s3.put_object(
                    Bucket='files',
                    Key=image_filename,
                    Body=image_data,
                    ContentType=f'image/{image_ext}'
                )
                
                image_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{image_filename}"
            
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                safe_title = str(title).replace("'", "''")
                safe_desc = str(description).replace("'", "''")
                safe_date = str(date).replace("'", "''")
                safe_cat = str(category).replace("'", "''")
                safe_icon = str(icon).replace("'", "''")
                safe_url = 'NULL' if image_url is None else f"'{str(image_url).replace("'", "''")}'" 
                safe_id = int(news_id)
                cur.execute(f'''
                    UPDATE news
                    SET title = '{safe_title}', description = '{safe_desc}', date = '{safe_date}', category = '{safe_cat}', 
                        icon = '{safe_icon}', image_url = {safe_url}, is_published = {is_published}, updated_at = CURRENT_TIMESTAMP
                    WHERE id = {safe_id}
                    RETURNING id, title, description, date, category, icon, image_url, is_published, created_at, updated_at
                ''')
                news_item = cur.fetchone()
            
            conn.close()
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps(dict(news_item), default=str)
            }
        
        elif method == 'DELETE':
            token = event.get('headers', {}).get('X-Auth-Token') or event.get('headers', {}).get('x-auth-token')
            if not token or not verify_admin_token(token):
                conn.close()
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Unauthorized'})
                }
            
            params = event.get('queryStringParameters', {})
            news_id = params.get('id')
            
            with conn.cursor() as cur:
                safe_id = int(news_id)
                cur.execute(f'DELETE FROM news WHERE id = {safe_id}')
            
            conn.close()
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True})
            }
        
        conn.close()
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