import json
import os
import urllib.request
import urllib.parse
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Отправка уведомлений в Telegram о новых тикетах.
    POST / - отправка уведомления
    Body: {"ticket_id": 123, "server": "Server Name", "subject": "Тема обращения", "url": "https://..."}
    '''
    method = event.get('httpMethod', 'POST')
    
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
        return error_response('Method not allowed', 405)
    
    body = json.loads(event.get('body', '{}'))
    ticket_id = body.get('ticket_id')
    server = body.get('server', 'Не указан')
    subject = body.get('subject', 'Без темы')
    ticket_url = body.get('url', '')
    
    if not ticket_id:
        return error_response('Ticket ID is required')
    
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    chat_id = os.environ.get('TELEGRAM_CHAT_ID')
    
    if not bot_token or not chat_id:
        return error_response('Telegram credentials not configured', 500)
    
    message_text = f"🎫 На сайте play.devilrust.ru новое обращение:\n\n" \
                   f"📍 Сервер: {server}\n" \
                   f"📋 Тема: {subject}"
    
    keyboard = None
    if ticket_url:
        keyboard = {
            "inline_keyboard": [[
                {"text": "Перейти к обращению", "url": ticket_url}
            ]]
        }
    
    telegram_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    
    payload = {
        'chat_id': chat_id,
        'text': message_text,
        'parse_mode': 'HTML'
    }
    
    if keyboard:
        payload['reply_markup'] = json.dumps(keyboard)
    
    data = urllib.parse.urlencode(payload).encode('utf-8')
    req = urllib.request.Request(telegram_url, data=data)
    
    try:
        response = urllib.request.urlopen(req)
        result = json.loads(response.read().decode('utf-8'))
        
        if result.get('ok'):
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'success': True}),
                'isBase64Encoded': False
            }
        else:
            return error_response(f"Telegram API error: {result}", 500)
            
    except Exception as e:
        return error_response(f'Failed to send notification: {str(e)}', 500)


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
