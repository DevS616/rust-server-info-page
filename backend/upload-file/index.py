import json
import os
import base64
import boto3
import uuid
from typing import Dict, Any

REGRU_ENDPOINT = 'https://s3.regru.cloud'
REGRU_BUCKET = 'img.devilrust'

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Загрузка файлов в облако Reg.ru S3.
    POST / - загрузка файла (base64 в JSON body)
    Body: {"file": "base64_data", "filename": "original.png", "content_type": "image/png"}
    '''
    method = event.get('httpMethod', 'POST')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }

    if method != 'POST':
        return error_response('Method not allowed', 405)

    body = json.loads(event.get('body', '{}'))
    file_base64 = body.get('file', '')
    filename = body.get('filename', 'file.bin')
    content_type = body.get('content_type', 'application/octet-stream')
    folder = body.get('folder', 'support')

    if not file_base64:
        return error_response('File data is required')

    try:
        file_data = base64.b64decode(file_base64)
    except Exception as e:
        return error_response(f'Invalid base64 data: {str(e)}')

    if len(file_data) > 100 * 1024 * 1024:
        return error_response('File size exceeds 100MB limit', 413)

    s3 = boto3.client(
        's3',
        endpoint_url=REGRU_ENDPOINT,
        aws_access_key_id=os.environ['REGRU_S3_ACCESS_KEY'],
        aws_secret_access_key=os.environ['REGRU_S3_SECRET_KEY'],
    )

    file_extension = filename.rsplit('.', 1)[-1] if '.' in filename else 'bin'
    unique_filename = f"{folder}/{uuid.uuid4()}.{file_extension}"

    try:
        s3.put_object(
            Bucket=REGRU_BUCKET,
            Key=unique_filename,
            Body=file_data,
            ContentType=content_type,
            ACL='public-read'
        )

        public_url = f"{REGRU_ENDPOINT}/{REGRU_BUCKET}/{unique_filename}"

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'url': public_url}),
            'isBase64Encoded': False
        }

    except Exception as e:
        return error_response(f'Upload failed: {str(e)}', 500)


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