import json
import os
import urllib.parse
import urllib.request
import re
import jwt
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Авторизация пользователей через Steam OpenID.
    GET /login - начало авторизации (редирект на Steam)
    GET /callback - обработка ответа от Steam и создание JWT токена
    '''
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    params = event.get('queryStringParameters') or {}
    path = event.get('path', '')
    
    base_url = urllib.parse.unquote(params.get('base_url', os.environ.get('BASE_URL', 'https://play.devilrust.ru')))
    api_url = params.get('api_url', '')
    
    if 'openid.mode' in params:
        return handle_callback(params, api_url, base_url)
    else:
        return handle_login(api_url, base_url)


def handle_login(api_url: str, base_url: str) -> Dict[str, Any]:
    if not base_url:
        base_url = 'https://play.devilrust.ru'
    
    # Извлекаем origin из полного URL если передан
    from urllib.parse import urlparse
    parsed = urlparse(base_url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    
    return_url = f"{origin}/steam-callback"
    
    steam_params = {
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.return_to': return_url,
        'openid.realm': origin,
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
    }
    
    query_string = urllib.parse.urlencode(steam_params)
    redirect_url = f"https://steamcommunity.com/openid/login?{query_string}"
    
    return {
        'statusCode': 302,
        'headers': {
            'Location': redirect_url,
            'Access-Control-Allow-Origin': '*'
        },
        'body': '',
        'isBase64Encoded': False
    }


def handle_callback(params: Dict[str, Any], api_url: str, base_url: str) -> Dict[str, Any]:
    if not base_url:
        base_url = 'https://play.devilrust.ru'
    
    # Извлекаем origin из полного URL если передан
    from urllib.parse import urlparse
    parsed = urlparse(base_url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    
    if params.get('openid.mode') != 'id_res':
        return error_response('Invalid OpenID mode')
    
    validation_params = dict(params)
    validation_params['openid.mode'] = 'check_authentication'
    
    validation_data = urllib.parse.urlencode(validation_params).encode('utf-8')
    req = urllib.request.Request('https://steamcommunity.com/openid/login', data=validation_data)
    
    try:
        response = urllib.request.urlopen(req)
        validation_result = response.read().decode('utf-8')
        
        if 'is_valid:true' not in validation_result:
            return error_response('Steam validation failed')
        
        claimed_id = params.get('openid.claimed_id', '')
        match = re.search(r'https://steamcommunity.com/openid/id/(\d+)', claimed_id)
        
        if not match:
            return error_response('Invalid Steam ID')
        
        steam_id = match.group(1)
        
        steam_user = get_steam_user_info(steam_id)
        
        user = save_or_update_user(steam_id, steam_user)
        
        if user.get('is_blocked'):
            return error_response('User is blocked', 403)
        
        token = generate_jwt_token(user)
        
        # Определяем куда редиректить - если пришли с главной, то туда же
        if 'support' in base_url or 'ticket' in base_url:
            redirect_url = f"{origin}/support?token={token}"
        else:
            redirect_url = f"{origin}/?token={token}"
        
        return {
            'statusCode': 302,
            'headers': {
                'Location': redirect_url,
                'Access-Control-Allow-Origin': '*'
            },
            'body': '',
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return error_response(f'Authentication error: {str(e)}')


def get_steam_user_info(steam_id: str) -> Dict[str, Any]:
    api_key = os.environ.get('STEAM_API_KEY')
    url = f"https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key={api_key}&steamids={steam_id}"
    
    try:
        req = urllib.request.Request(url)
        response = urllib.request.urlopen(req)
        data = json.loads(response.read().decode('utf-8'))
        
        players = data.get('response', {}).get('players', [])
        if players:
            player = players[0]
            return {
                'username': player.get('personaname', 'Unknown'),
                'avatar': player.get('avatarfull', '')
            }
    except:
        pass
    
    return {'username': f'Player_{steam_id}', 'avatar': ''}


def escape_sql(value: str) -> str:
    """Escape single quotes for SQL strings"""
    return value.replace("'", "''")


def save_or_update_user(steam_id: str, steam_user: Dict[str, Any]) -> Dict[str, Any]:
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    steam_id_safe = escape_sql(steam_id)
    cur.execute(f"SELECT * FROM users WHERE steam_id = '{steam_id_safe}'")
    existing_user = cur.fetchone()
    
    username_safe = escape_sql(steam_user['username'])
    avatar_safe = escape_sql(steam_user['avatar'])
    
    if existing_user:
        cur.execute(f"""
            UPDATE users 
            SET steam_username = '{username_safe}', 
                steam_avatar = '{avatar_safe}', 
                updated_at = CURRENT_TIMESTAMP 
            WHERE steam_id = '{steam_id_safe}' 
            RETURNING *
        """)
        user = cur.fetchone()
    else:
        cur.execute(f"""
            INSERT INTO users (steam_id, steam_username, steam_avatar) 
            VALUES ('{steam_id_safe}', '{username_safe}', '{avatar_safe}') 
            RETURNING *
        """)
        user = cur.fetchone()
    
    conn.commit()
    cur.close()
    conn.close()
    
    return dict(user)


def generate_jwt_token(user: Dict[str, Any]) -> str:
    secret = os.environ['JWT_SECRET']
    payload = {
        'user_id': user['id'],
        'steam_id': user['steam_id'],
        'username': user['steam_username'],
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, secret, algorithm='HS256')


def error_response(message: str, status_code: int = 400) -> Dict[str, Any]:
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'error': message}),
        'isBase64Encoded': False
    }