"""JWT auth helpers."""
import jwt
import os
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify

SECRET = os.environ.get('JWT_SECRET', 'finai-super-secret-key-2024')
ALGO = 'HS256'
EXP_HOURS = 24


def create_token(user_id: int, role: str) -> str:
    payload = {
        'sub': str(user_id),
        'role': role,
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(hours=EXP_HOURS)
    }
    return jwt.encode(payload, SECRET, algorithm=ALGO)


def decode_token(token: str) -> dict:
    # PyJWT strict subject validation requires sub to be string.
    return jwt.decode(token, SECRET, algorithms=[ALGO])


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return jsonify({'error': 'Missing token'}), 401
        try:
            payload = decode_token(auth.split(' ', 1)[1])
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except Exception:
            return jsonify({'error': 'Invalid token'}), 401
        request.user_id = int(payload['sub']) if payload.get('sub') is not None else None
        request.user_role = payload['role']
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return jsonify({'error': 'Missing token'}), 401
        try:
            payload = decode_token(auth.split(' ', 1)[1])
        except Exception:
            return jsonify({'error': 'Invalid token'}), 401
        if payload.get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        request.user_id = int(payload['sub']) if payload.get('sub') is not None else None
        request.user_role = payload['role']
        return f(*args, **kwargs)
    return decorated
