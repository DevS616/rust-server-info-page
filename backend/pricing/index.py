import json
import os
import psycopg2
from datetime import datetime

def handler(event: dict, context) -> dict:
    """API для управления прайс-листом и сборами средств"""
    
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Authorization'
            },
            'body': ''
        }
    
    dsn = os.environ.get('DATABASE_URL')
    
    try:
        conn = psycopg2.connect(dsn)
        conn.autocommit = False
        cursor = conn.cursor()
        
        params = event.get('queryStringParameters') or {}
        action = params.get('action', '')
        
        # Получение всех прайс-позиций
        if method == 'GET' and action == 'get_prices':
            cursor.execute("""
                SELECT id, title, description, price, is_active, position, 
                       created_at, updated_at
                FROM price_items 
                ORDER BY position ASC, created_at DESC
            """)
            items = cursor.fetchall()
            
            result = []
            for item in items:
                result.append({
                    'id': item[0],
                    'title': item[1],
                    'description': item[2],
                    'price': item[3],
                    'is_active': item[4],
                    'position': item[5],
                    'created_at': item[6].isoformat() if item[6] else None,
                    'updated_at': item[7].isoformat() if item[7] else None
                })
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'items': result})
            }
        
        # Получение всех сборов
        if method == 'GET' and action == 'get_fundraisers':
            cursor.execute("""
                SELECT id, title, description, goal_amount, current_amount, 
                       is_active, status, created_at, updated_at, completed_at
                FROM fundraisers 
                ORDER BY is_active DESC, created_at DESC
            """)
            fundraisers = cursor.fetchall()
            
            result = []
            for f in fundraisers:
                result.append({
                    'id': f[0],
                    'title': f[1],
                    'description': f[2],
                    'goal_amount': f[3],
                    'current_amount': f[4],
                    'is_active': f[5],
                    'status': f[6],
                    'created_at': f[7].isoformat() if f[7] else None,
                    'updated_at': f[8].isoformat() if f[8] else None,
                    'completed_at': f[9].isoformat() if f[9] else None
                })
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'fundraisers': result})
            }
        
        # Получение донатов сбора
        if method == 'GET' and action == 'get_donations':
            fundraiser_id = params.get('fundraiser_id')
            
            cursor.execute("""
                SELECT id, steam_id, steam_username, amount, comment, created_at
                FROM fundraiser_donations 
                WHERE fundraiser_id = %s
                ORDER BY created_at DESC
            """, (fundraiser_id,))
            donations = cursor.fetchall()
            
            result = []
            for d in donations:
                result.append({
                    'id': d[0],
                    'steam_id': d[1],
                    'steam_username': d[2],
                    'amount': d[3],
                    'comment': d[4],
                    'created_at': d[5].isoformat() if d[5] else None
                })
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'donations': result})
            }
        
        # Создание прайс-позиции
        if method == 'POST' and action == 'create_price':
            data = json.loads(event.get('body', '{}'))
            
            cursor.execute("""
                INSERT INTO price_items (title, description, price, is_active, position)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (
                data['title'],
                data.get('description', ''),
                data['price'],
                data.get('is_active', True),
                data.get('position', 0)
            ))
            
            new_id = cursor.fetchone()[0]
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'id': new_id, 'message': 'Price item created'})
            }
        
        # Создание сбора
        if method == 'POST' and action == 'create_fundraiser':
            data = json.loads(event.get('body', '{}'))
            
            cursor.execute("""
                INSERT INTO fundraisers (title, description, goal_amount, current_amount, is_active, status)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                data['title'],
                data.get('description', ''),
                data['goal_amount'],
                data.get('current_amount', 0),
                data.get('is_active', True),
                data.get('status', 'active')
            ))
            
            new_id = cursor.fetchone()[0]
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'id': new_id, 'message': 'Fundraiser created'})
            }
        
        # Обновление прайс-позиции
        if method == 'PUT' and action == 'update_price':
            item_id = params.get('item_id')
            data = json.loads(event.get('body', '{}'))
            
            cursor.execute("""
                UPDATE price_items 
                SET title = %s, description = %s, price = %s, 
                    is_active = %s, position = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (
                data['title'],
                data.get('description', ''),
                data['price'],
                data.get('is_active', True),
                data.get('position', 0),
                item_id
            ))
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'message': 'Price item updated'})
            }
        
        # Обновление сбора
        if method == 'PUT' and action == 'update_fundraiser':
            fundraiser_id = params.get('fundraiser_id')
            data = json.loads(event.get('body', '{}'))
            
            cursor.execute("""
                UPDATE fundraisers 
                SET title = %s, description = %s, goal_amount = %s, 
                    current_amount = %s, is_active = %s, status = %s, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (
                data['title'],
                data.get('description', ''),
                data['goal_amount'],
                data.get('current_amount', 0),
                data.get('is_active', True),
                data.get('status', 'active'),
                fundraiser_id
            ))
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'message': 'Fundraiser updated'})
            }
        
        # Добавление доната
        if method == 'POST' and action == 'add_donation':
            fundraiser_id = params.get('fundraiser_id')
            data = json.loads(event.get('body', '{}'))
            
            cursor.execute("""
                INSERT INTO fundraiser_donations 
                (fundraiser_id, steam_id, steam_username, amount, comment)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (
                fundraiser_id,
                data.get('steam_id'),
                data.get('steam_username', 'Аноним'),
                data['amount'],
                data.get('comment', '')
            ))
            
            donation_id = cursor.fetchone()[0]
            
            # Обновляем текущую сумму сбора
            cursor.execute("""
                UPDATE fundraisers 
                SET current_amount = current_amount + %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (data['amount'], fundraiser_id))
            
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'id': donation_id, 'message': 'Donation added'})
            }
        
        cursor.close()
        conn.close()
        
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Route not found'})
        }
        
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }