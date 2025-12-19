import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any
import urllib.request
import urllib.error

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
        
        # Получаем список активных серверов с их Battlemetrics ID и кешированными данными
        cur.execute('''
            SELECT id, battlemetrics_id, cached_players 
            FROM t_p48919527_rust_server_info_pag.servers 
            WHERE is_active = true
        ''')
        servers = cur.fetchall()
        
        # Суммируем онлайн игроков со всех серверов
        total_online = 0
        servers_updated = []
        
        for server in servers:
            server_id = server['id']
            bm_id = server['battlemetrics_id']
            cached = server['cached_players'] or 0
            
            # Пытаемся получить актуальные данные от Battlemetrics
            players_count = None
            if bm_id and bm_id not in ['13371337', '13371338', '13371339', '13371340', '13371341', '13371342', '13371343', '13371344', '13371345']:
                try:
                    req = urllib.request.Request(
                        f'https://api.battlemetrics.com/servers/{bm_id}',
                        headers={'User-Agent': 'DevilRust-Monitor/1.0'}
                    )
                    with urllib.request.urlopen(req, timeout=2) as response:
                        data = json.loads(response.read().decode())
                        players_count = data.get('data', {}).get('attributes', {}).get('players', 0)
                        # Обновляем кеш в БД
                        servers_updated.append((players_count, server_id))
                except (urllib.error.URLError, urllib.error.HTTPError, Exception):
                    pass
            
            # Используем актуальные данные или кеш
            total_online += players_count if players_count is not None else cached
        
        # Обновляем кеш в БД для успешно обновленных серверов
        for players, srv_id in servers_updated:
            cur.execute('''
                UPDATE t_p48919527_rust_server_info_pag.servers
                SET cached_players = %s, players_updated_at = NOW()
                WHERE id = %s
            ''', (players, srv_id))
        
        if servers_updated:
            conn.commit()
        
        result['online_players'] = total_online
        
        user_id_header = event.get('headers', {}).get('X-User-Id') or event.get('headers', {}).get('x-user-id')
        
        if user_id_header:
            try:
                user_id = int(user_id_header)
                cur.execute('''
                    SELECT COUNT(*) as unread_count
                    FROM t_p48919527_rust_server_info_pag.tickets t
                    WHERE t.user_id = %s 
                    AND t.status != 'closed'
                    AND EXISTS (
                        SELECT 1 FROM t_p48919527_rust_server_info_pag.ticket_messages tm
                        WHERE tm.ticket_id = t.id 
                        AND tm.is_admin_reply = true
                        AND tm.created_at > t.last_user_view
                    )
                ''', (user_id,))
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