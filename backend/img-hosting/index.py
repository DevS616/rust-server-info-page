import json
import os
import base64
import boto3
import uuid
import jwt
from typing import Dict, Any, Optional
from botocore.exceptions import ClientError

REGRU_ENDPOINT = 'https://s3.regru.cloud'
REGRU_BUCKET = 'img.devilrust'
IMG_FOLDER = 'hosting'


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Хостинг изображений — только для администраторов.
    POST ?action=upload — загрузить до 10 файлов (base64 в JSON)
    GET ?action=list — список всех загруженных файлов
    DELETE ?action=delete&key=... — удалить файл
    """
    method = event.get('httpMethod', 'GET')

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

    headers = event.get('headers') or {}
    token = headers.get('x-auth-token') or headers.get('X-Auth-Token')

    if not verify_admin(token):
        return error_response('Forbidden', 403)

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')

    s3 = boto3.client(
        's3',
        endpoint_url=REGRU_ENDPOINT,
        aws_access_key_id=os.environ['REGRU_S3_ACCESS_KEY'],
        aws_secret_access_key=os.environ['REGRU_S3_SECRET_KEY'],
    )

    if method == 'POST' and action == 'upload':
        return upload_files(event, s3)
    elif method == 'GET' and action == 'list':
        return list_files(s3)
    elif method == 'DELETE' and action == 'delete':
        return delete_file(params, s3)

    return error_response('Not found', 404)


def verify_admin(token: Optional[str]) -> bool:
    if not token:
        return False
    try:
        secret = os.environ['JWT_SECRET']
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        return bool(payload.get('is_admin'))
    except:
        return False


def upload_files(event: Dict[str, Any], s3) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}'))
    files = body.get('files', [])

    if not files or not isinstance(files, list):
        return error_response('files array is required')

    if len(files) > 10:
        return error_response('Maximum 10 files per upload')

    results = []
    for f in files:
        file_b64 = f.get('data', '')
        filename = f.get('filename', 'file.bin')
        content_type = f.get('content_type', 'image/jpeg')
        custom_name = f.get('custom_name', '').strip()

        if not file_b64:
            results.append({'filename': filename, 'error': 'no data'})
            continue

        try:
            file_data = base64.b64decode(file_b64)
        except Exception as e:
            results.append({'filename': filename, 'error': f'invalid base64: {str(e)}'})
            continue

        if len(file_data) > 100 * 1024 * 1024:
            results.append({'filename': filename, 'error': 'exceeds 100MB'})
            continue

        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'bin'
        if custom_name:
            safe_name = custom_name.replace(' ', '_').replace('/', '_').replace('..', '_')
            key = f"{IMG_FOLDER}/{safe_name}.{ext}"
        else:
            key = f"{IMG_FOLDER}/{uuid.uuid4()}.{ext}"

        try:
            s3.put_object(
                Bucket=REGRU_BUCKET,
                Key=key,
                Body=file_data,
                ContentType=content_type,
                ACL='public-read'
            )
            public_url = f"{REGRU_ENDPOINT}/{REGRU_BUCKET}/{key}"
            results.append({
                'filename': filename,
                'key': key,
                'url': public_url,
                'size': len(file_data)
            })
        except Exception as e:
            results.append({'filename': filename, 'error': f'upload failed: {str(e)}'})

    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'results': results}),
        'isBase64Encoded': False
    }


def list_files(s3) -> Dict[str, Any]:
    try:
        response = s3.list_objects_v2(
            Bucket=REGRU_BUCKET,
            Prefix=f"{IMG_FOLDER}/",
            MaxKeys=500
        )
        items = []
        for obj in response.get('Contents', []):
            key = obj['Key']
            if key == f"{IMG_FOLDER}/":
                continue
            filename = key.split('/')[-1]
            url = f"{REGRU_ENDPOINT}/{REGRU_BUCKET}/{key}"
            items.append({
                'key': key,
                'filename': filename,
                'url': url,
                'size': obj['Size'],
                'last_modified': obj['LastModified'].isoformat()
            })
        items.sort(key=lambda x: x['last_modified'], reverse=True)
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'files': items}, default=str),
            'isBase64Encoded': False
        }
    except Exception as e:
        return error_response(f'Failed to list files: {str(e)}', 500)


def delete_file(params: Dict[str, Any], s3) -> Dict[str, Any]:
    key = params.get('key', '')
    if not key or not key.startswith(f"{IMG_FOLDER}/"):
        return error_response('Invalid key')

    try:
        s3.delete_object(Bucket=REGRU_BUCKET, Key=key)
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True}),
            'isBase64Encoded': False
        }
    except Exception as e:
        return error_response(f'Failed to delete: {str(e)}', 500)


def error_response(message: str, status_code: int = 400) -> Dict[str, Any]:
    return {
        'statusCode': status_code,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': message}),
        'isBase64Encoded': False
    }
