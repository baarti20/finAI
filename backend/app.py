"""FinAI Flask Application Entry Point."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, send_from_directory, jsonify
from models.database import init_db
from routes.api import api

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND = os.path.join(BASE_DIR, '..', 'frontend')

def create_app():
    app = Flask(__name__, static_folder=os.path.join(FRONTEND, 'static'))
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'finai-flask-secret')
    app.config['JSON_SORT_KEYS'] = False

    # Manual CORS
    @app.after_request
    def cors(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        return response

    @app.before_request
    def handle_options():
        from flask import request
        if request.method == 'OPTIONS':
            return '', 204

    app.register_blueprint(api)

    # Ensure DB is initialized for all runtime modes
    try:
        init_db()
    except Exception:
        pass

    # Serve frontend pages
    @app.route('/')
    def index():
        return send_from_directory(os.path.join(FRONTEND, 'templates'), 'index.html')

    @app.route('/login')
    def login_page():
        return send_from_directory(os.path.join(FRONTEND, 'templates'), 'login.html')

    @app.route('/register')
    def register_page():
        return send_from_directory(os.path.join(FRONTEND, 'templates'), 'register.html')

    @app.route('/dashboard')
    def dashboard_page():
        return send_from_directory(os.path.join(FRONTEND, 'templates'), 'dashboard.html')

    @app.route('/admin')
    def admin_page():
        return send_from_directory(os.path.join(FRONTEND, 'templates'), 'admin.html')

    # Serve static assets
    @app.route('/static/<path:filename>')
    def static_files(filename):
        return send_from_directory(os.path.join(FRONTEND, 'static'), filename)

    # Serve well-known app-specific configuration used by Chrome DevTools
    @app.route('/.well-known/<path:filename>')
    def well_known(filename):
        return send_from_directory(os.path.join(FRONTEND, 'static', '.well-known'), filename)

    return app


if __name__ == '__main__':
    init_db()
    app = create_app()
    print("\n🚀 FinAI server running at http://localhost:5000\n")
    app.run(host='0.0.0.0', port=5000, debug=True)
