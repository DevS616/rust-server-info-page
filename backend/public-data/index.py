import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Объединенный публичный API для фронтенда
    Возвращает все публичные данные одним запросом:
    - Настройки акции
    - Статус технических работ
    - Количество онлайн игроков
    - Количество непрочитанных тикетов (если авторизован)
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    if not dsn:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Database connection not configured'}),
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(dsn)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        result = {}
        
        cur.execute('''
            SELECT promotion_data, is_maintenance, maintenance_title, maintenance_subtitle 
            FROM t_p48919527_rust_server_info_pag.site_settings 
            LIMIT 1
        ''')
        settings = cur.fetchone()
        
        if settings:
            result['promotion'] = settings['promotion_data'] if settings['promotion_data'] else None
            result['maintenance'] = {
                'enabled': settings['is_maintenance'],
                'title': settings['maintenance_title'],
                'subtitle': settings['maintenance_subtitle']
            }
        
        result['online_players'] = 0
        
        user_id_header = event.get('headers', {}).get('X-User-Id') or event.get('headers', {}).get('x-user-id')
        
        if user_id_header:
            try:
                user_id = int(user_id_header)
                safe_user_id = int(user_id)
                cur.execute(f'''
                    SELECT COUNT(*) as unread_count
                    FROM t_p48919527_rust_server_info_pag.tickets t
                    WHERE t.user_id = {safe_user_id} 
                    AND t.status != 'closed'
                    AND EXISTS (
                        SELECT 1 FROM t_p48919527_rust_server_info_pag.ticket_messages tm
                        WHERE tm.ticket_id = t.id 
                        AND tm.is_admin_reply = true
                        AND tm.created_at > t.last_user_view
                    )
                ''')
                unread = cur.fetchone()
                result['unread_tickets'] = unread['unread_count'] if unread else 0
            except (ValueError, TypeError):
                result['unread_tickets'] = 0
        else:
            result['unread_tickets'] = 0
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json', 
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=120'
            },
            'body': json.dumps(result),
            'isBase64Encoded': False
        }
    
    finally:
        cur.close()
        conn.close()