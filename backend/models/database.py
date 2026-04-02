"""Database models for FinAI."""
import sqlite3
import hashlib
import os
import json
from datetime import datetime

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'finai.db'))


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    c = conn.cursor()

    c.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            full_name TEXT,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            gender TEXT,
            city TEXT,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            last_login TEXT,
            dob TEXT
        );

        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            income REAL,
            fixed_expenses REAL,
            variable_expenses REAL,
            total_expenses REAL,
            savings_goal REAL,
            lifestyle_score REAL,
            predicted_savings REAL,
            model_used TEXT,
            file_name TEXT,
            file_data TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)

    # Create default admin
    admin_pass = hash_password('admin123')
    try:
        c.execute("""
            INSERT OR IGNORE INTO users (username, email, password_hash, role)
            VALUES (?, ?, ?, ?)
        """, ('admin', 'admin@finai.com', admin_pass, 'admin'))
    except Exception:
        pass

    conn.commit()
    conn.close()
    print("[✓] Database initialized")


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed


def create_user(username, email, password, dob=None, full_name=None, phone=None, gender=None, city=None):
    conn = get_db()
    c = conn.cursor()
    # Migration safety — add new columns if missing
    for col, typ in [('dob','TEXT'),('full_name','TEXT'),('phone','TEXT'),('gender','TEXT'),('city','TEXT')]:
        try:
            c.execute(f'ALTER TABLE users ADD COLUMN {col} {typ}')
            conn.commit()
        except Exception:
            pass
    try:
        c.execute(
            "INSERT INTO users (username, email, password_hash, dob, full_name, phone, gender, city) VALUES (?,?,?,?,?,?,?,?)",
            (username, email, hash_password(password), dob, full_name, phone, gender, city)
        )
        conn.commit()
        return c.lastrowid
    except sqlite3.IntegrityError as e:
        raise ValueError(str(e))
    finally:
        conn.close()


def reset_password(email, new_password):
    conn = get_db()
    conn.execute("UPDATE users SET password_hash=? WHERE email=?",
                 (hash_password(new_password), email))
    conn.commit()
    conn.close()


def get_user_by_email(email):
    conn = get_db()
    c = conn.cursor()
    row = c.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_id(uid):
    conn = get_db()
    c = conn.cursor()
    row = c.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    conn.close()
    return dict(row) if row else None


def update_last_login(uid):
    conn = get_db()
    conn.execute("UPDATE users SET last_login=? WHERE id=?",
                 (datetime.utcnow().isoformat(), uid))
    conn.commit()
    conn.close()


def save_prediction(user_id, data: dict, predicted_savings: float, model_used: str,
                    file_name: str = None, file_data: str = None):
    conn = get_db()
    c = conn.cursor()
    # Migration safety: add columns if missing
    for col, typ in [('file_name', 'TEXT'), ('file_data', 'TEXT')]:
        try:
            c.execute(f'ALTER TABLE predictions ADD COLUMN {col} {typ}')
            conn.commit()
        except Exception:
            pass
    c.execute("""
        INSERT INTO predictions
        (user_id, income, fixed_expenses, variable_expenses, total_expenses,
         savings_goal, lifestyle_score, predicted_savings, model_used, file_name, file_data)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
    """, (
        user_id,
        data['income'], data['fixed_expenses'], data['variable_expenses'],
        data['total_expenses'], data['savings_goal'], data['lifestyle_score'],
        predicted_savings, model_used, file_name, file_data
    ))
    conn.commit()
    pid = c.lastrowid
    conn.close()
    return pid


def get_user_predictions(user_id, limit=20):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM predictions WHERE user_id=? ORDER BY created_at DESC LIMIT ?",
        (user_id, limit)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_all_users():
    conn = get_db()
    rows = conn.execute(
        "SELECT id, username, full_name, email, phone, gender, city, role, created_at, last_login FROM users ORDER BY id"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_all_predictions(limit=100):
    conn = get_db()
    rows = conn.execute("""
        SELECT p.*, u.username FROM predictions p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC LIMIT ?
    """, (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_prediction_stats():
    conn = get_db()
    c = conn.cursor()
    total = c.execute("SELECT COUNT(*) FROM predictions").fetchone()[0]
    avg_savings = c.execute("SELECT AVG(predicted_savings) FROM predictions").fetchone()[0]
    total_users = c.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    conn.close()
    return {
        'total_predictions': total,
        'avg_predicted_savings': round(avg_savings or 0, 2),
        'total_users': total_users
    }
