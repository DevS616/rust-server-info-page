import json
import os
import jwt
import base64
import boto3
import uuid
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, Optional

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''API для управления новостями — публичный список и CRUD для админов'''
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
            'body': '',
            'isBase64Encoded': False
        }
    
    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')
    
    if method == 'GET' and action == 'admin-list':
        headers_dict = event.get('headers') or {}
        token = headers_dict.get('x-auth-token') or headers_dict.get('X-Auth-Token')
        admin_data = verify_admin_token(token)
        if not admin_data:
            return error_response('Unauthorized', 401)
        return get_all_news()
    
    if method == 'GET':
        return get_published_news()
    
    headers_dict = event.get('headers') or {}
    token = headers_dict.get('x-auth-token') or headers_dict.get('X-Auth-Token')
    admin_data = verify_admin_token(token)
    if not admin_data:
        return error_response('Unauthorized', 401)
    
    if method == 'POST' and action == 'upload':
        return upload_inline_image(event)
    if method == 'POST':
        return create_news(event)
    elif method == 'PUT':
        return update_news(event)
    elif method == 'DELETE':
        news_id = params.get('id', '')
        if news_id:
            return delete_news(news_id)
    
    return error_response('Not found', 404)


def escape_sql(value: str) -> str:
    return value.replace("'", "''")


def verify_admin_token(token: Optional[str]) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    try:
        secret = os.environ['JWT_SECRET']
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        if not payload.get('is_admin'):
            return None
        return payload
    except:
        return None


def upload_image(base64_data: str, image_type: str) -> str:
    file_data = base64.b64decode(base64_data)
    filename = f"news/{uuid.uuid4().hex}.{image_type}"
    
    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
    )
    
    content_types = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp'
    }
    content_type = content_types.get(image_type.lower(), 'image/jpeg')
    
    s3.put_object(
        Bucket='files',
        Key=filename,
        Body=file_data,
        ContentType=content_type
    )
    
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{filename}"


def upload_inline_image(event: Dict[str, Any]) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}') or '{}')
    image_base64 = body.get('image_base64')
    image_type = body.get('image_type', 'jpg')
    if not image_base64:
        return error_response('image_base64 is required')
    url = upload_image(image_base64, image_type)
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'url': url}),
        'isBase64Encoded': False
    }


def get_published_news() -> Dict[str, Any]:
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('''
        SELECT id, title, description, date, category, icon, image_url, button_text, button_url
        FROM news
        WHERE is_published = TRUE
        ORDER BY created_at DESC
    ''')
    
    news = [dict(row) for row in cur.fetchall()]
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(news, default=str),
        'isBase64Encoded': False
    }


def get_all_news() -> Dict[str, Any]:
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('SELECT * FROM news ORDER BY created_at DESC')
    
    news = [dict(row) for row in cur.fetchall()]
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(news, default=str),
        'isBase64Encoded': False
    }


def create_news(event: Dict[str, Any]) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}') or '{}')
    
    title = body.get('title', '').strip()
    description = body.get('description', '').strip()
    date = body.get('date', '').strip()
    category = body.get('category', 'news').strip()
    icon = body.get('icon', 'Newspaper').strip()
    is_published = body.get('is_published', True)
    image_url = body.get('image_url', '').strip()
    button_text = body.get('button_text', '').strip()
    button_url = body.get('button_url', '').strip()

    if not title or not description or not date:
        return error_response('Title, description and date are required')
    
    if body.get('image_base64'):
        image_type = body.get('image_type', 'jpg')
        image_url = upload_image(body['image_base64'], image_type)
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    title_safe = escape_sql(title)
    desc_safe = escape_sql(description)
    date_safe = escape_sql(date)
    category_safe = escape_sql(category)
    icon_safe = escape_sql(icon)
    image_url_safe = escape_sql(image_url) if image_url else ''
    is_pub = 'TRUE' if is_published else 'FALSE'
    image_sql = f"'{image_url_safe}'" if image_url else 'NULL'
    btn_text_sql = f"'{escape_sql(button_text)}'" if button_text else 'NULL'
    btn_url_sql = f"'{escape_sql(button_url)}'" if button_url else 'NULL'

    cur.execute(f"""
        INSERT INTO news (title, description, date, category, icon, is_published, image_url, button_text, button_url)
        VALUES ('{title_safe}', '{desc_safe}', '{date_safe}', '{category_safe}', '{icon_safe}', {is_pub}, {image_sql}, {btn_text_sql}, {btn_url_sql})
        RETURNING *
    """)
    
    news_item = dict(cur.fetchone())
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 201,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(news_item, default=str),
        'isBase64Encoded': False
    }


def update_news(event: Dict[str, Any]) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}') or '{}')
    
    news_id = body.get('id')
    if not news_id:
        return error_response('News ID is required')
    
    title = body.get('title', '').strip()
    description = body.get('description', '').strip()
    date = body.get('date', '').strip()
    category = body.get('category', 'news').strip()
    icon = body.get('icon', 'Newspaper').strip()
    is_published = body.get('is_published', True)
    image_url = body.get('image_url', '').strip()
    button_text = body.get('button_text', '').strip()
    button_url = body.get('button_url', '').strip()

    if body.get('image_base64'):
        image_type = body.get('image_type', 'jpg')
        image_url = upload_image(body['image_base64'], image_type)
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    news_id_int = int(news_id)
    title_safe = escape_sql(title)
    desc_safe = escape_sql(description)
    date_safe = escape_sql(date)
    category_safe = escape_sql(category)
    icon_safe = escape_sql(icon)
    is_pub = 'TRUE' if is_published else 'FALSE'
    image_url_safe = escape_sql(image_url) if image_url else ''
    image_sql = f"'{image_url_safe}'" if image_url else 'NULL'
    btn_text_sql = f"'{escape_sql(button_text)}'" if button_text else 'NULL'
    btn_url_sql = f"'{escape_sql(button_url)}'" if button_url else 'NULL'

    cur.execute(f"""
        UPDATE news SET
            title = '{title_safe}',
            description = '{desc_safe}',
            date = '{date_safe}',
            category = '{category_safe}',
            icon = '{icon_safe}',
            is_published = {is_pub},
            image_url = {image_sql},
            button_text = {btn_text_sql},
            button_url = {btn_url_sql},
            updated_at = NOW()
        WHERE id = {news_id_int}
        RETURNING *
    """)
    
    result = cur.fetchone()
    if not result:
        cur.close()
        conn.close()
        return error_response('News not found', 404)
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(dict(result), default=str),
        'isBase64Encoded': False
    }


def delete_news(news_id: str) -> Dict[str, Any]:
    try:
        news_id_int = int(news_id)
    except ValueError:
        return error_response('Invalid news ID')
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute(f"DELETE FROM news WHERE id = {news_id_int}")
    deleted = cur.rowcount > 0
    
    conn.commit()
    cur.close()
    conn.close()
    
    if not deleted:
        return error_response('News not found', 404)
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': True}),
        'isBase64Encoded': False
    }


def error_response(message: str, status: int = 400) -> Dict[str, Any]:
    return {
        'statusCode': status,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': message}),
        'isBase64Encoded': False
    }