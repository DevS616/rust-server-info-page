import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any
import jwt
import requests

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Привязка Telegram аккаунта к пользователю
    POST /?action=link - генерация ссылки для привязки
    GET /?action=verify&token=... - верификация привязки от Telegram бота
    GET / - проверка статуса привязки
    DELETE / - отвязка Telegram
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')
    
    headers = event.get('headers') or {}
    token = headers.get('x-auth-token') or headers.get('X-Auth-Token')
    
    if not token and action != 'verify':
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Unauthorized'}),
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        if action == 'verify':
            verify_token = params.get('token', '')
            if not verify_token:
                return error_response('Token required', 400)
            
            try:
                secret = os.environ['JWT_SECRET']
                payload = jwt.decode(verify_token, secret, algorithms=['HS256'])
                user_id = payload.get('user_id')
                telegram_chat_id = payload.get('telegram_chat_id')
                telegram_username = payload.get('telegram_username')
                
                if not user_id or not telegram_chat_id:
                    return error_response('Invalid token', 400)
                
                cur.execute(
                    "UPDATE users SET telegram_chat_id = %s, telegram_username = %s WHERE id = %s RETURNING id",
                    (telegram_chat_id, telegram_username, user_id)
                )
                result = cur.fetchone()
                conn.commit()
                
                if not result:
                    return error_response('User not found', 404)
                
                bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
                if bot_token:
                    try:
                        requests.post(
                            f'https://api.telegram.org/bot{bot_token}/sendMessage',
                            json={
                                'chat_id': telegram_chat_id,
                                'text': '✅ Telegram успешно привязан! Теперь вы будете получать уведомления о ваших обращениях.'
                            }
                        )
                    except:
                        pass
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*'},
                    'body': '''
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <title>Telegram привязан</title>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                height: 100vh;
                                margin: 0;
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            }
                            .container {
                                text-align: center;
                                background: white;
                                padding: 40px;
                                border-radius: 10px;
                                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                            }
                            h1 { color: #10b981; margin: 0 0 20px 0; }
                            p { color: #666; margin: 0 0 30px 0; }
                            button {
                                background: #10b981;
                                color: white;
                                border: none;
                                padding: 12px 30px;
                                border-radius: 5px;
                                font-size: 16px;
                                cursor: pointer;
                            }
                            button:hover { background: #059669; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>✅ Успешно!</h1>
                            <p>Ваш Telegram успешно привязан к аккаунту.<br>Теперь вы будете получать уведомления.</p>
                            <button onclick="window.close()">Закрыть</button>
                        </div>
                    </body>
                    </html>
                    ''',
                    'isBase64Encoded': False
                }
            except jwt.ExpiredSignatureError:
                return error_response('Link expired', 400)
            except jwt.InvalidTokenError:
                return error_response('Invalid token', 400)
        
        if method == 'GET' and not action:
            try:
                secret = os.environ['JWT_SECRET']
                payload = jwt.decode(token, secret, algorithms=['HS256'])
                user_id = payload.get('user_id')
                
                if not user_id:
                    return error_response('Invalid token', 401)
                
                cur.execute(
                    "SELECT telegram_chat_id, telegram_username FROM users WHERE id = %s",
                    (user_id,)
                )
                result = cur.fetchone()
                
                if not result:
                    return error_response('User not found', 404)
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'linked': result['telegram_chat_id'] is not None,
                        'telegram_username': result.get('telegram_username')
                    }),
                    'isBase64Encoded': False
                }
            except jwt.InvalidTokenError:
                return error_response('Invalid token', 401)
        
        if method == 'POST' and action == 'link':
            try:
                secret = os.environ['JWT_SECRET']
                payload = jwt.decode(token, secret, algorithms=['HS256'])
                user_id = payload.get('user_id')
                
                if not user_id:
                    return error_response('Invalid token', 401)
                
                cur.execute("SELECT id, steam_id FROM users WHERE id = %s", (user_id,))
                user = cur.fetchone()
                
                if not user:
                    return error_response('User not found', 404)
                
                link_token = jwt.encode({
                    'user_id': user['id'],
                    'steam_id': user['steam_id']
                }, secret, algorithm='HS256')
            except jwt.InvalidTokenError:
                return error_response('Invalid token', 401)
            
            bot_username = 'DevilRustBot'
            link_url = f'https://t.me/{bot_username}?start={link_token}'
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'link_url': link_url}),
                'isBase64Encoded': False
            }
        
        if method == 'DELETE':
            try:
                secret = os.environ['JWT_SECRET']
                payload = jwt.decode(token, secret, algorithms=['HS256'])
                user_id = payload.get('user_id')
                
                if not user_id:
                    return error_response('Invalid token', 401)
                
                cur.execute(
                    "UPDATE users SET telegram_chat_id = NULL, telegram_username = NULL WHERE id = %s",
                    (user_id,)
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True}),
                    'isBase64Encoded': False
                }
            except jwt.InvalidTokenError:
                return error_response('Invalid token', 401)
        
        return error_response('Invalid request', 400)
        
    finally:
        cur.close()
        conn.close()


def error_response(message: str, status_code: int = 400) -> Dict[str, Any]:
    return {
        'statusCode': status_code,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': message}),
        'isBase64Encoded': False
    }