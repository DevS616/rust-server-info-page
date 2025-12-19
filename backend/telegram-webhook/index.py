import json
import os
import jwt
import requests
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Webhook для Telegram бота - обработка команды /start и callback кнопок
    Принимает обновления от Telegram API
    '''
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return success_response()
    
    try:
        body = json.loads(event.get('body', '{}'))
        print(f'Received telegram update: {json.dumps(body)}')
        
        # Обработка callback от inline кнопки
        if 'callback_query' in body:
            return handle_callback(body['callback_query'])
        
        # Обработка текстового сообщения
        if 'message' not in body:
            print('No message in update')
            return success_response()
        
        message = body['message']
        text = message.get('text', '')
        chat_id = message['chat']['id']
        username = message['chat'].get('username', '')
        
        print(f'Message from chat_id={chat_id}, username={username}, text={text}')
        
        if not text.startswith('/start'):
            print('Not a /start command')
            return success_response()
        
        parts = text.split(' ')
        print(f'Command parts: {parts}')
        
        # Если есть токен в команде - обработать его
        if len(parts) >= 2:
            link_token = parts[1]
            process_link_token(chat_id, username, link_token)
            return success_response()
        
        # Если токена нет - проверить базу данных
        handle_start_without_token(chat_id)
        return success_response()
    
    except Exception as e:
        print(f'Webhook error: {e}')
        return success_response()


def handle_start_without_token(chat_id: int):
    '''Обработка /start без токена - проверка БД'''
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Проверяем, привязан ли уже этот chat_id
        cur.execute(
            "SELECT id FROM users WHERE telegram_chat_id = %s",
            (str(chat_id),)
        )
        existing = cur.fetchone()
        
        if existing:
            send_telegram_message(
                chat_id,
                '✅ Ваш Telegram уже привязан к аккаунту!\n\nВы получаете уведомления об ответах в ваших обращениях.'
            )
            return
        
        # Ищем пользователя с активным токеном привязки
        cur.execute(
            "SELECT id, telegram_link_token FROM users WHERE telegram_link_token IS NOT NULL AND telegram_chat_id IS NULL ORDER BY updated_at DESC LIMIT 1"
        )
        pending = cur.fetchone()
        
        if pending and pending['telegram_link_token']:
            send_telegram_message_with_button(
                chat_id,
                '👋 Привет! Для привязки вашего аккаунта нажмите кнопку ниже:',
                pending['telegram_link_token']
            )
        else:
            send_telegram_message(
                chat_id,
                '👋 Привет! Для привязки Telegram используйте кнопку "Подключить" на сайте в разделе Техподдержка.'
            )
    finally:
        cur.close()
        conn.close()


def handle_callback(callback_query: Dict[str, Any]) -> Dict[str, Any]:
    '''Обработка нажатия на inline кнопку'''
    chat_id = callback_query['message']['chat']['id']
    username = callback_query['message']['chat'].get('username', '')
    callback_data = callback_query.get('data', '')
    callback_id = callback_query['id']
    
    print(f'Callback from chat_id={chat_id}, data={callback_data[:30]}...')
    
    if callback_data.startswith('link_'):
        user_id_str = callback_data[5:]  # Убираем префикс 'link_'
        try:
            user_id = int(user_id_str)
            process_link_by_user_id(chat_id, username, user_id)
            answer_callback(callback_id, '✅ Обработка...')
        except ValueError:
            print(f'Invalid user_id in callback: {user_id_str}')
            answer_callback(callback_id, '❌ Ошибка')
    
    return success_response()


def process_link_by_user_id(chat_id: int, username: str, user_id: int):
    '''Обработка привязки по user_id из кнопки'''
    try:
        secret = os.environ['JWT_SECRET']
        print(f'Processing link for user_id={user_id}')
        
        verify_token = jwt.encode({
            'user_id': user_id,
            'telegram_chat_id': str(chat_id),
            'telegram_username': username
        }, secret, algorithm='HS256')
        
        verify_url = f"https://functions.poehali.dev/92e13203-5190-4bb5-b08b-d287ef896899/?action=verify&token={verify_token}"
        print(f'Calling verify endpoint...')
        
        verify_response = requests.get(verify_url, timeout=10)
        print(f'Verify response status: {verify_response.status_code}')
        
        if verify_response.status_code == 200:
            send_telegram_message(
                chat_id,
                '✅ Telegram успешно привязан!\n\nТеперь вы будете получать уведомления о новых ответах в ваших обращениях в техподдержку.'
            )
        else:
            send_telegram_message(
                chat_id,
                '❌ Ошибка при привязке. Попробуйте получить новую ссылку на сайте.'
            )
    except Exception as e:
        print(f'Error processing link: {e}')
        send_telegram_message(
            chat_id,
            '❌ Произошла ошибка. Попробуйте позже.'
        )


def process_link_token(chat_id: int, username: str, link_token: str):
    '''Обработка токена привязки из параметра /start'''
    try:
        secret = os.environ['JWT_SECRET']
        print(f'Processing link token: {link_token[:20]}...')
        payload = jwt.decode(link_token, secret, algorithms=['HS256'])
        user_id = payload.get('user_id')
        print(f'Decoded user_id: {user_id}')
        
        if not user_id:
            print('No user_id in token')
            send_telegram_message(chat_id, '❌ Неверная ссылка привязки.')
            return
        
        process_link_by_user_id(chat_id, username, user_id)
    
    except jwt.ExpiredSignatureError:
        send_telegram_message(
            chat_id,
            '❌ Ссылка привязки устарела. Получите новую ссылку в личном кабинете на сайте.'
        )
    except jwt.InvalidTokenError:
        send_telegram_message(
            chat_id,
            '❌ Неверная ссылка привязки. Используйте ссылку из личного кабинета на сайте.'
        )
    except Exception as e:
        print(f'Error processing link token: {e}')
        send_telegram_message(
            chat_id,
            '❌ Произошла ошибка. Попробуйте позже.'
        )


def send_telegram_message(chat_id: int, text: str):
    '''Отправка текстового сообщения в Telegram'''
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    if not bot_token:
        print('No TELEGRAM_BOT_TOKEN found!')
        return
    
    try:
        print(f'Sending message to chat_id={chat_id}: {text[:50]}...')
        response = requests.post(
            f'https://api.telegram.org/bot{bot_token}/sendMessage',
            json={'chat_id': chat_id, 'text': text},
            timeout=10
        )
        print(f'Send message response: {response.status_code}')
        if response.status_code != 200:
            print(f'Error response: {response.text}')
    except Exception as e:
        print(f'Failed to send telegram message: {e}')


def send_telegram_message_with_button(chat_id: int, text: str, link_token: str):
    '''Отправка сообщения с inline кнопкой'''
    # Извлекаем user_id из токена для короткого callback_data (лимит 64 байта)
    try:
        secret = os.environ['JWT_SECRET']
        payload = jwt.decode(link_token, secret, algorithms=['HS256'])
        user_id = payload.get('user_id')
        
        if not user_id:
            print('No user_id in token for button')
            return
        
        bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
        if not bot_token:
            print('No TELEGRAM_BOT_TOKEN found!')
            return
        
        print(f'Sending message with button to chat_id={chat_id}, user_id={user_id}')
        keyboard = {
            'inline_keyboard': [[
                {'text': '✅ Привязать аккаунт', 'callback_data': f'link_{user_id}'}
            ]]
        }
        
        response = requests.post(
            f'https://api.telegram.org/bot{bot_token}/sendMessage',
            json={
                'chat_id': chat_id,
                'text': text,
                'reply_markup': keyboard
            },
            timeout=10
        )
        print(f'Send button response: {response.status_code}')
        if response.status_code != 200:
            print(f'Error response: {response.text}')
    except Exception as e:
        print(f'Failed to send message with button: {e}')


def answer_callback(callback_id: str, text: str):
    '''Ответ на callback query'''
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    if not bot_token:
        return
    
    try:
        requests.post(
            f'https://api.telegram.org/bot{bot_token}/answerCallbackQuery',
            json={'callback_query_id': callback_id, 'text': text},
            timeout=5
        )
    except Exception as e:
        print(f'Failed to answer callback: {e}')


def success_response() -> Dict[str, Any]:
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({'ok': True}),
        'isBase64Encoded': False
    }