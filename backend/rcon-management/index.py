import json
import os
import socket
import struct
import time
from typing import Dict, List, Optional, Tuple

def handler(event: dict, context) -> dict:
    '''Backend для RCON управления игроками на Rust серверах через Oxide плагин'''
    
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
    
    for i in range(1, 11):
        env_key = f'RCON_SERVER_{i}'
        rcon_data = os.environ.get(env_key, '')
        
        if rcon_data:
            try:
                parts = rcon_data.split(':')
                if len(parts) >= 3:
                    ip = parts[0]
                    port = int(parts[1])
                    password = ':'.join(parts[2:])
                    
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
    
    def __init__(self, host: str, port: int, password: str, timeout: float = 3.0):
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
            print(f'RCON connection error to {self.host}:{self.port}: {e}')
            return False
    
    def _authenticate(self) -> bool:
        self.request_id += 1
        packet = self._build_packet(self.request_id, self.SERVERDATA_AUTH, self.password)
        self.socket.send(packet)
        
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
            
            time.sleep(0.15)
            response = self._read_packet()
            
            if response:
                return response[2]
            return None
        except Exception as e:
            print(f'Error executing RCON command: {e}')
            return None
    
    def close(self):
        if self.socket:
            try:
                self.socket.close()
            except:
                pass


def execute_rcon_command(server: Dict[str, str], command: str) -> Optional[str]:
    '''Выполняет RCON команду на сервере'''
    try:
        client = RCONClient(server['ip'], server['port'], server['password'], timeout=3.0)
        
        if client.connect():
            result = client.execute(command)
            client.close()
            return result
        else:
            print(f'Failed to connect to {server["name"]} ({server["ip"]}:{server["port"]})')
        
        return None
    except Exception as e:
        print(f'RCON command error for {server["name"]}: {e}')
        return None


def parse_plugin_response(raw_response: str) -> Optional[dict]:
    '''Извлекает JSON из ответа плагина с префиксом [PLAYERAPI_RESPONSE]'''
    if not raw_response:
        return None
    
    lines = raw_response.split('\n')
    for line in lines:
        if '[PLAYERAPI_RESPONSE]' in line:
            try:
                json_str = line.split('[PLAYERAPI_RESPONSE]', 1)[1].strip()
                return json.loads(json_str)
            except (json.JSONDecodeError, IndexError) as e:
                print(f'Failed to parse plugin response: {e}')
                print(f'Line: {line}')
                return None
    
    return None


def list_all_players() -> dict:
    '''Получает список всех игроков со всех серверов через Oxide плагин'''
    servers = get_rcon_credentials()
    api_key = os.environ.get('PLAYER_API_KEY', '')
    
    if not servers:
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'players': [], 'message': 'No RCON servers configured'})
        }
    
    if not api_key:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'PLAYER_API_KEY not configured'})
        }
    
    all_players = []
    
    for server in servers:
        try:
            print(f'Querying {server["name"]} at {server["ip"]}:{server["port"]}')
            command = f'playerapi.list {api_key}'
            response = execute_rcon_command(server, command)
            
            if response:
                data = parse_plugin_response(response)
                if data and data.get('success'):
                    players = data.get('players', [])
                    for player in players:
                        player['server'] = server['name']
                    all_players.extend(players)
                    print(f'Found {len(players)} players on {server["name"]}')
                elif data:
                    print(f'API error on {server["name"]}: {data.get("error", "Unknown")}')
                else:
                    print(f'No parseable response from {server["name"]}')
                    print(f'Raw response: {response[:300]}')
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


def kick_player(data: dict) -> dict:
    '''Кикает игрока с сервера через Oxide плагин'''
    player_id = data.get('player_id')
    reason = data.get('reason', 'Kicked by admin')
    server_name = data.get('server')
    api_key = os.environ.get('PLAYER_API_KEY', '')
    
    if not player_id or not server_name:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Missing player_id or server'})
        }
    
    if not api_key:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'PLAYER_API_KEY not configured'})
        }
    
    servers = get_rcon_credentials()
    target_server = next((s for s in servers if s['name'] == server_name), None)
    
    if not target_server:
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Server not found'})
        }
    
    command = f'playerapi.kick {player_id} "{reason}" {api_key}'
    result = execute_rcon_command(target_server, command)
    
    if result:
        data = parse_plugin_response(result)
        if data:
            if data.get('success'):
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'message': data.get('message', 'Player kicked')})
                }
            else:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': data.get('error', 'Failed to kick player')})
                }
    
    return {
        'statusCode': 500,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'No response from server'})
    }


def ban_player(data: dict) -> dict:
    '''Банит игрока через Oxide плагин'''
    player_id = data.get('player_id')
    reason = data.get('reason', 'Banned by admin')
    duration = data.get('duration', 0)
    server_name = data.get('server')
    api_key = os.environ.get('PLAYER_API_KEY', '')
    
    if not player_id or not server_name:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Missing player_id or server'})
        }
    
    if not api_key:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'PLAYER_API_KEY not configured'})
        }
    
    servers = get_rcon_credentials()
    target_server = next((s for s in servers if s['name'] == server_name), None)
    
    if not target_server:
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Server not found'})
        }
    
    command = f'playerapi.ban {player_id} "{reason}" {duration} {api_key}'
    result = execute_rcon_command(target_server, command)
    
    if result:
        data = parse_plugin_response(result)
        if data:
            if data.get('success'):
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'message': data.get('message', 'Player banned')})
                }
            else:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': data.get('error', 'Failed to ban player')})
                }
    
    return {
        'statusCode': 500,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'No response from server'})
    }


def mute_player(data: dict) -> dict:
    '''Блокирует чат игроку через Oxide плагин'''
    player_id = data.get('player_id')
    duration = data.get('duration', 60)
    server_name = data.get('server')
    api_key = os.environ.get('PLAYER_API_KEY', '')
    
    if not player_id or not server_name:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Missing player_id or server'})
        }
    
    if not api_key:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'PLAYER_API_KEY not configured'})
        }
    
    servers = get_rcon_credentials()
    target_server = next((s for s in servers if s['name'] == server_name), None)
    
    if not target_server:
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Server not found'})
        }
    
    command = f'playerapi.mute {player_id} {duration} {api_key}'
    result = execute_rcon_command(target_server, command)
    
    if result:
        data = parse_plugin_response(result)
        if data:
            if data.get('success'):
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'message': data.get('message', 'Player muted')})
                }
            else:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': data.get('error', 'Failed to mute player')})
                }
    
    return {
        'statusCode': 500,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'No response from server'})
    }
