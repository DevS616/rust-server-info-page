import json
import os
import jwt
import requests
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Webhook для Telegram бота - обработка команды /start с токеном привязки
    Принимает обновления от Telegram API и обрабатывает команду /start
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
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'ok': True}),
            'isBase64Encoded': False
        }
    
    try:
        body = json.loads(event.get('body', '{}'))
        
        if 'message' not in body:
            return success_response()
        
        message = body['message']
        text = message.get('text', '')
        chat_id = message['chat']['id']
        username = message['chat'].get('username', '')
        
        if not text.startswith('/start'):
            return success_response()
        
        parts = text.split(' ')
        if len(parts) < 2:
            send_telegram_message(
                chat_id,
                '👋 Привет! Для привязки Telegram используйте ссылку из личного кабинета на сайте.'
            )
            return success_response()
        
        link_token = parts[1]
        
        try:
            secret = os.environ['JWT_SECRET']
            payload = jwt.decode(link_token, secret, algorithms=['HS256'])
            user_id = payload.get('user_id')
            
            if not user_id:
                send_telegram_message(chat_id, '❌ Неверная ссылка привязки.')
                return success_response()
            
            verify_token = jwt.encode({
                'user_id': user_id,
                'telegram_chat_id': str(chat_id),
                'telegram_username': username
            }, secret, algorithm='HS256')
            
            verify_url = f"https://functions.poehali.dev/92e13203-5190-4bb5-b08b-d287ef896899/?action=verify&token={verify_token}"
            
            verify_response = requests.get(verify_url)
            
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
            print(f'Error processing telegram update: {e}')
            send_telegram_message(
                chat_id,
                '❌ Произошла ошибка. Попробуйте позже.'
            )
        
        return success_response()
    
    except Exception as e:
        print(f'Webhook error: {e}')
        return success_response()


def send_telegram_message(chat_id: int, text: str):
    '''Отправка сообщения в Telegram'''
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    if not bot_token:
        return
    
    try:
        requests.post(
            f'https://api.telegram.org/bot{bot_token}/sendMessage',
            json={'chat_id': chat_id, 'text': text}
        )
    except Exception as e:
        print(f'Failed to send telegram message: {e}')


def success_response() -> Dict[str, Any]:
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({'ok': True}),
        'isBase64Encoded': False
    }
