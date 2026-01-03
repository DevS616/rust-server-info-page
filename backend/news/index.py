import json
import os
import base64
import uuid
import boto3
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: dict, context) -> dict:
    '''API для управления новостями сайта'''
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password'
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
                admin_password = event.get('headers', {}).get('x-admin-password', '')
                if admin_password != os.environ.get('ADMIN_PASSWORD', ''):
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
            admin_password = event.get('headers', {}).get('x-admin-password', '')
            if admin_password != os.environ.get('ADMIN_PASSWORD', ''):
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
                cur.execute('''
                    INSERT INTO news (title, description, date, category, icon, image_url, is_published)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, title, description, date, category, icon, image_url, is_published, created_at, updated_at
                ''', (title, description, date, category, icon, image_url, is_published))
                news_item = cur.fetchone()
            
            conn.close()
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps(dict(news_item), default=str)
            }
        
        elif method == 'PUT':
            admin_password = event.get('headers', {}).get('x-admin-password', '')
            if admin_password != os.environ.get('ADMIN_PASSWORD', ''):
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
                cur.execute('''
                    UPDATE news
                    SET title = %s, description = %s, date = %s, category = %s, 
                        icon = %s, image_url = %s, is_published = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    RETURNING id, title, description, date, category, icon, image_url, is_published, created_at, updated_at
                ''', (title, description, date, category, icon, image_url, is_published, news_id))
                news_item = cur.fetchone()
            
            conn.close()
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps(dict(news_item), default=str)
            }
        
        elif method == 'DELETE':
            admin_password = event.get('headers', {}).get('x-admin-password', '')
            if admin_password != os.environ.get('ADMIN_PASSWORD', ''):
                conn.close()
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Unauthorized'})
                }
            
            params = event.get('queryStringParameters', {})
            news_id = params.get('id')
            
            with conn.cursor() as cur:
                cur.execute('DELETE FROM news WHERE id = %s', (news_id,))
            
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