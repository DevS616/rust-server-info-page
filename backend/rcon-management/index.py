import json
import os
import socket
import struct
import time
from typing import Dict, List, Optional, Tuple

def handler(event: dict, context) -> dict:
    '''Backend для RCON управления игроками на Rust серверах'''
    
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token'
            },
            'body': ''
        }
    
    auth_token = event.get('headers', {}).get('X-Auth-Token', '')
    jwt_secret = os.environ.get('JWT_SECRET', '')
    
    if not verify_admin_token(auth_token, jwt_secret):
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Unauthorized'})
        }
    
    query_params = event.get('queryStringParameters') or {}
    action = query_params.get('action', 'list_players')
    
    if method == 'GET' and action == 'list_players':
        return list_all_players()
    
    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')
        
        if action == 'kick':
            return kick_player(body)
        elif action == 'ban':
            return ban_player(body)
        elif action == 'mute':
            return mute_player(body)
    
    return {
        'statusCode': 400,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Invalid action'})
    }


def verify_admin_token(token: str, secret: str) -> bool:
    if not token:
        return False
    
    try:
        import jwt
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        
        if not payload.get('is_admin'):
            print('Token is valid but is_admin flag is missing')
            return False
        
        return True
    except Exception as e:
        print(f'JWT verification failed: {e}')
        return False


def get_rcon_credentials() -> List[Dict[str, str]]:
    '''Получает список серверов с RCON данными из секретов'''
    servers = []
    
    # Ожидаем формат: RCON_SERVER_1=ip:port:password, RCON_SERVER_2=ip:port:password и т.д.
    for i in range(1, 11):  # Поддержка до 10 серверов
        env_key = f'RCON_SERVER_{i}'
        rcon_data = os.environ.get(env_key, '')
        
        if rcon_data:
            try:
                parts = rcon_data.split(':')
                if len(parts) >= 3:
                    ip = parts[0]
                    port = int(parts[1])
                    password = ':'.join(parts[2:])  # На случай если в пароле есть :
                    
                    servers.append({
                        'name': f'Сервер {i}',
                        'ip': ip,
                        'port': port,
                        'password': password
                    })
            except Exception as e:
                print(f'Error parsing RCON_SERVER_{i}: {e}')
    
    return servers


class RCONClient:
    '''Простой RCON клиент для Source-based игр (Rust)'''
    
    SERVERDATA_AUTH = 3
    SERVERDATA_EXECCOMMAND = 2
    SERVERDATA_AUTH_RESPONSE = 2
    SERVERDATA_RESPONSE_VALUE = 0
    
    def __init__(self, host: str, port: int, password: str, timeout: float = 2.0):
        self.host = host
        self.port = port
        self.password = password
        self.timeout = timeout
        self.socket = None
        self.request_id = 0
    
    def connect(self) -> bool:
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.settimeout(self.timeout)
            self.socket.connect((self.host, self.port))
            return self._authenticate()
        except Exception as e:
            print(f'RCON connection error: {e}')
            return False
    
    def _authenticate(self) -> bool:
        self.request_id += 1
        packet = self._build_packet(self.request_id, self.SERVERDATA_AUTH, self.password)
        self.socket.send(packet)
        
        # Ждем ответ аутентификации
        time.sleep(0.1)
        response = self._read_packet()
        
        return response is not None and response[0] == self.request_id
    
    def _build_packet(self, req_id: int, req_type: int, body: str) -> bytes:
        body_bytes = body.encode('utf-8') + b'\x00'
        size = len(body_bytes) + 10
        
        packet = struct.pack('<i', size)
        packet += struct.pack('<i', req_id)
        packet += struct.pack('<i', req_type)
        packet += body_bytes
        packet += b'\x00'
        
        return packet
    
    def _read_packet(self) -> Optional[Tuple[int, int, str]]:
        try:
            size_data = self.socket.recv(4)
            if len(size_data) < 4:
                return None
            
            size = struct.unpack('<i', size_data)[0]
            data = self.socket.recv(size)
            
            req_id = struct.unpack('<i', data[0:4])[0]
            req_type = struct.unpack('<i', data[4:8])[0]
            body = data[8:-2].decode('utf-8', errors='ignore')
            
            return (req_id, req_type, body)
        except Exception as e:
            print(f'Error reading RCON packet: {e}')
            return None
    
    def execute(self, command: str) -> Optional[str]:
        if not self.socket:
            return None
        
        try:
            self.request_id += 1
            packet = self._build_packet(self.request_id, self.SERVERDATA_EXECCOMMAND, command)
            self.socket.send(packet)
            
            time.sleep(0.1)
            response = self._read_packet()
            
            if response:
                return response[2]
            return None
        except Exception as e:
            print(f'Error executing RCON command: {e}')
            return None
    
    def close(self):
        if self.socket:
            self.socket.close()


def execute_rcon_command(server: Dict[str, str], command: str) -> Optional[str]:
    '''Выполняет RCON команду на сервере'''
    try:
        client = RCONClient(server['ip'], server['port'], server['password'], timeout=2.0)
        
        if client.connect():
            result = client.execute(command)
            client.close()
            return result
        
        return None
    except Exception as e:
        print(f'RCON command error for {server["name"]}: {e}')
        return None


def list_all_players() -> dict:
    '''Получает список всех игроков со всех серверов'''
    servers = get_rcon_credentials()
    all_players = []
    
    if not servers:
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'players': [], 'message': 'No RCON servers configured'})
        }
    
    for server in servers:
        try:
            print(f'Connecting to {server["name"]} at {server["ip"]}:{server["port"]}')
            response = execute_rcon_command(server, 'status')
            
            if response:
                players = parse_status_response(response, server['name'])
                print(f'Found {len(players)} players on {server["name"]}')
                all_players.extend(players)
            else:
                print(f'No response from {server["name"]}')
        except Exception as e:
            print(f'Error querying {server["name"]}: {e}')
            continue
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'players': all_players, 'total_servers': len(servers)})
    }


def parse_status_response(response: str, server_name: str) -> List[Dict]:
    '''Парсит вывод команды status и извлекает информацию об игроках'''
    players = []
    lines = response.split('\n')
    
    # Формат: "hostname: Server Name"
    # "players : 5 (100 max) (0 queued) (0 joining)"
    # Затем список игроков в формате: "playerid name ping connected address"
    
    parsing_players = False
    for line in lines:
        line = line.strip()
        
        if 'playerid' in line.lower() and 'name' in line.lower():
            parsing_players = True
            continue
        
        if parsing_players and line:
            parts = line.split()
            if len(parts) >= 4:
                try:
                    player_id = parts[0]
                    # Имя может содержать пробелы, берем все до предпоследних 3 полей
                    name = ' '.join(parts[1:-3])
                    ping = parts[-3]
                    connected_time = parts[-2]
                    
                    players.append({
                        'server': server_name,
                        'player_id': player_id,
                        'name': name,
                        'ping': ping,
                        'connected_time': connected_time
                    })
                except:
                    continue
    
    return players


def kick_player(data: dict) -> dict:
    '''Кикает игрока с сервера'''
    player_id = data.get('player_id')
    reason = data.get('reason', 'Kicked by admin')
    server_name = data.get('server')
    
    if not player_id or not server_name:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Missing player_id or server'})
        }
    
    servers = get_rcon_credentials()
    target_server = next((s for s in servers if s['name'] == server_name), None)
    
    if not target_server:
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Server not found'})
        }
    
    command = f'kick {player_id} "{reason}"'
    result = execute_rcon_command(target_server, command)
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': True, 'message': f'Player kicked: {result}'})
    }


def ban_player(data: dict) -> dict:
    '''Банит игрока'''
    player_id = data.get('player_id')
    reason = data.get('reason', 'Banned by admin')
    duration = data.get('duration', 0)  # 0 = permanent
    server_name = data.get('server')
    
    if not player_id or not server_name:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Missing player_id or server'})
        }
    
    servers = get_rcon_credentials()
    target_server = next((s for s in servers if s['name'] == server_name), None)
    
    if not target_server:
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Server not found'})
        }
    
    # Rust ban format: ban playerid "reason" duration(minutes, 0=permanent)
    if duration > 0:
        command = f'ban {player_id} "{reason}" {duration}'
    else:
        command = f'ban {player_id} "{reason}"'
    
    result = execute_rcon_command(target_server, command)
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': True, 'message': f'Player banned: {result}'})
    }


def mute_player(data: dict) -> dict:
    '''Блокирует чат игроку'''
    player_id = data.get('player_id')
    reason = data.get('reason', 'Muted by admin')
    duration = data.get('duration', 60)  # В минутах
    server_name = data.get('server')
    
    if not player_id or not server_name:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Missing player_id or server'})
        }
    
    servers = get_rcon_credentials()
    target_server = next((s for s in servers if s['name'] == server_name), None)
    
    if not target_server:
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Server not found'})
        }
    
    # Rust mute format: mute playerid duration(seconds)
    duration_seconds = duration * 60
    command = f'mute {player_id} {duration_seconds}'
    result = execute_rcon_command(target_server, command)
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': True, 'message': f'Player muted: {result}'})
    }