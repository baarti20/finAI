"""Flask API routes — auth, prediction, admin."""
from flask import Blueprint, request, jsonify, send_file
import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.database import (
    create_user, get_user_by_email, get_user_by_id,
    update_last_login, save_prediction, get_user_predictions,
    get_all_users, get_all_predictions, get_prediction_stats,
    verify_password, reset_password, append_prediction_to_dataset
)
from utils.auth import create_token, token_required, admin_required
from utils.predictor import predict, generate_insights, get_predictor, FEATURES
from utils.pdf_report import generate_pdf_report

api = Blueprint('api', __name__, url_prefix='/api')


# ─── Auth ──────────────────────────────────────────────────────────────────────

@api.route('/auth/register', methods=['POST'])
def register():
    d = request.get_json(force=True)
    username  = (d.get('username') or '').strip()
    email     = (d.get('email') or '').strip().lower()
    password  = d.get('password') or ''
    dob       = (d.get('dob') or '').strip()
    full_name = (d.get('full_name') or '').strip()
    phone     = (d.get('phone') or '').strip()
    gender    = (d.get('gender') or '').strip()
    city      = (d.get('city') or '').strip()

    if not username or not email or not password:
        return jsonify({'error': 'All fields required'}), 400
    if email == 'admin@finai.com' or email.endswith('@finai.com'):
        return jsonify({'error': 'finai.com email addresses are reserved for the admin account only'}), 400
    if not email.endswith('@gmail.com'):
        return jsonify({'error': 'Registration requires a gmail.com email address.'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    try:
        uid = create_user(username, email, password,
                          dob=dob or None, full_name=full_name or None,
                          phone=phone or None, gender=gender or None, city=city or None)
    except ValueError as e:
        msg = str(e)
        if 'username' in msg:
            return jsonify({'error': 'Username already taken'}), 409
        return jsonify({'error': 'Email already registered'}), 409

    token = create_token(uid, 'user')
    return jsonify({'token': token, 'username': username, 'role': 'user'}), 201


@api.route('/auth/login', methods=['POST'])
def login():
    d = request.get_json(force=True)
    email = (d.get('email') or '').strip().lower()
    password = d.get('password') or ''

    if email != 'admin@finai.com' and not email.endswith('@gmail.com'):
        return jsonify({'error': 'Login requires gmail.com for users, or admin@finai.com for admin.'}), 400

    user = get_user_by_email(email)
    if not user or not verify_password(password, user['password_hash']):
        return jsonify({'error': 'Invalid email or password'}), 401
    if email == 'admin@finai.com' and user.get('role') != 'admin':
        return jsonify({'error': 'Admin login only allowed for admin@finai.com'}), 403
    if email != 'admin@finai.com' and user.get('role') == 'admin':
        return jsonify({'error': 'Use admin@finai.com to sign in as admin.'}), 403

    update_last_login(user['id'])
    token = create_token(user['id'], user['role'])
    return jsonify({
        'token': token,
        'username': user['username'],
        'role': user['role'],
        'email': user['email']
    })


@api.route('/auth/me', methods=['GET'])
@token_required
def me():
    user = get_user_by_id(request.user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({
        'id': user['id'],
        'username': user['username'],
        'email': user['email'],
        'role': user['role'],
        'created_at': user['created_at']
    })


@api.route('/auth/verify-dob', methods=['POST'])
def verify_dob():
    d = request.get_json(force=True)
    email = (d.get('email') or '').strip().lower()
    dob   = (d.get('dob') or '').strip()
    if not email or not dob:
        return jsonify({'error': 'Email and date of birth required'}), 400
    user = get_user_by_email(email)
    if not user:
        return jsonify({'error': 'No account found with that email'}), 404
    if not user.get('dob'):
        return jsonify({'error': 'No security question set for this account'}), 400
    if user['dob'] != dob:
        return jsonify({'error': 'Date of birth does not match'}), 401
    return jsonify({'verified': True})


@api.route('/auth/verify-phone', methods=['POST'])
def verify_phone():
    d = request.get_json(force=True)
    email = (d.get('email') or '').strip().lower()
    phone = (d.get('phone') or '').strip()
    if not email or not phone:
        return jsonify({'error': 'Email and phone number required'}), 400
    user = get_user_by_email(email)
    if not user:
        return jsonify({'error': 'No account found with that email'}), 404
    if not user.get('phone'):
        return jsonify({'error': 'No phone number set for this account'}), 400
    if user['phone'] != phone:
        return jsonify({'error': 'Phone number does not match'}), 401
    return jsonify({'verified': True})


@api.route('/auth/reset-password', methods=['POST'])
def do_reset_password():
    d = request.get_json(force=True)
    email    = (d.get('email') or '').strip().lower()
    phone    = (d.get('phone') or '').strip()
    password = d.get('password') or ''
    if not email or not phone or not password:
        return jsonify({'error': 'All fields required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    user = get_user_by_email(email)
    if not user:
        return jsonify({'error': 'No account found with that email'}), 404
    if not user.get('phone') or user['phone'] != phone:
        return jsonify({'error': 'Verification failed'}), 401
    reset_password(email, password)
    return jsonify({'message': 'Password reset successfully'})


# ─── Prediction ────────────────────────────────────────────────────────────────

@api.route('/predict', methods=['POST'])
@token_required
def make_prediction():
    d = request.get_json(force=True)

    required = ['income', 'fixed_expenses', 'variable_expenses', 'savings_goal', 'lifestyle_score']
    for field in required:
        if field not in d:
            return jsonify({'error': f'Missing field: {field}'}), 400

    try:
        income = float(d['income'])
        fixed = float(d['fixed_expenses'])
        variable = float(d['variable_expenses'])
        total = fixed + variable
        savings_goal = float(d['savings_goal'])
        lifestyle = float(d['lifestyle_score'])
    except (TypeError, ValueError):
        return jsonify({'error': 'All fields must be numeric'}), 400

    if lifestyle < 1 or lifestyle > 10:
        return jsonify({'error': 'Lifestyle score must be between 1 and 10'}), 400

    data = {
        'income': income,
        'fixed_expenses': fixed,
        'variable_expenses': variable,
        'total_expenses': total,
        'savings_goal': savings_goal,
        'lifestyle_score': lifestyle
    }

    result = predict(data)
    insights = generate_insights(data, result['predicted_savings'])

    file_name = d.get('file_name') or None
    file_data = d.get('file_data') or None
    if file_data and not isinstance(file_data, str):
        file_data = json.dumps(file_data)

    save_prediction(request.user_id, data, result['predicted_savings'], result['model_used'],
                    file_name=file_name, file_data=file_data)
    append_prediction_to_dataset(data, result['predicted_savings'])

    return jsonify({
        **result,
        'insights': insights,
        'input': data
    })


@api.route('/predictions/history', methods=['GET'])
@token_required
def history():
    preds = get_user_predictions(request.user_id)
    return jsonify({'predictions': preds})


@api.route('/predictions/report', methods=['POST'])
@token_required
def download_report():
    d = request.get_json(force=True)
    user = get_user_by_id(request.user_id)
    input_data = d.get('input', {})
    prediction = d.get('prediction', {})
    insights = d.get('insights', [])

    pdf_bytes = generate_pdf_report(user, input_data, prediction, insights)
    return send_file(
        io.BytesIO(pdf_bytes),
        mimetype='application/pdf',
        as_attachment=True,
        download_name='finai_prediction_report.pdf'
    )


# ─── Admin ─────────────────────────────────────────────────────────────────────

@api.route('/admin/users', methods=['GET'])
@admin_required
def admin_users():
    return jsonify({'users': get_all_users()})


@api.route('/admin/predictions', methods=['GET'])
@admin_required
def admin_predictions():
    return jsonify({'predictions': get_all_predictions()})


@api.route('/admin/stats', methods=['GET'])
@admin_required
def admin_stats():
    stats = get_prediction_stats()
    p = get_predictor()
    meta = p['meta']
    return jsonify({
        **stats,
        'model_metrics': meta['metrics'],
        'best_model': meta['best_model_name'],
        'feature_importances': meta['metrics'].get('feature_importances', {})
    })


@api.route('/admin/retrain', methods=['POST'])
@admin_required
def retrain():
    """Trigger model retraining (runs synchronously for demo)."""
    import subprocess
    import sys
    from utils.predictor import clear_predictor_cache

    script = os.path.join(os.path.dirname(__file__), '..', '..', 'ml', 'train_model.py')
    result = subprocess.run([sys.executable, script], capture_output=True, text=True, timeout=600)

    if result.returncode == 0:
        clear_predictor_cache()
        return jsonify({'message': 'Model retrained successfully', 'log': result.stdout[-500:]})

    return jsonify({'error': 'Retraining failed', 'log': result.stderr[-500:]}), 500


# ─── Health ────────────────────────────────────────────────────────────────────

@api.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'FinAI API v1.0'})
