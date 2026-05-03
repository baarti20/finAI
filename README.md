# ◈ FinAI — AI Financial Prediction System

A full-stack Flask web app for financial prediction, analytics, and admin management.

Built with:
- Python Flask backend
- SQLite database
- Scikit-learn ML models
- HTML/CSS/JS frontend
- JWT authentication and admin role support
- PDF report generation

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- pip

### Setup
```bash
cd finai
pip install -r backend/requirements.txt
```

### Train models (first time only)
```bash
python ml/train_model.py
```

### Start server
```bash
python backend/app.py
```

### Open in browser
```
http://localhost:5000
```

---

## 🔐 Default Login

| Role  | Email           | Password |
|-------|-----------------|----------|
| Admin | admin@finai.com | admin123 |

Register a new account for regular user access.

---

## 📌 Login and Registration Rules
- User registration only accepts `@gmail.com` email addresses.
- `admin@finai.com` is reserved for the admin account.
- Login accepts either:
  - Gmail addresses for users
  - `admin@finai.com` for admin

---

## 📁 Project Structure

```
finai/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── finai.db
│   ├── models/
│   │   ├── database.py
│   │   └── artifacts/
│   │       ├── best_model.pkl
│   │       ├── linear_regression.pkl
│   │       ├── random_forest.pkl
│   │       ├── scaler.pkl
│   │       └── model_meta.json
│   ├── routes/
│   │   └── api.py
│   └── utils/
│       ├── auth.py
│       ├── predictor.py
│       └── pdf_report.py
├── frontend/
│   ├── static/
│   │   ├── css/main.css
│   │   └── js/
│   │       ├── auth.js
│   │       ├── dashboard.js
│   │       └── admin.js
│   └── templates/
│       ├── index.html
│       ├── login.html
│       ├── register.html
│       ├── dashboard.html
│       └── admin.html
├── ml/
│   └── train_model.py
├── data/
│   └── financial_dataset.csv
└── README.md
```

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint                 | Description                              |
|--------|--------------------------|------------------------------------------|
| POST   | /api/auth/register       | Register new user                        |
| POST   | /api/auth/login          | Login and receive JWT                    |
| GET    | /api/auth/me             | Get current logged-in user               |
| POST   | /api/auth/verify-dob     | Verify DOB for recovery                  |
| POST   | /api/auth/verify-phone   | Verify phone for recovery                |
| POST   | /api/auth/reset-password | Reset password after verification        |

### Predictions
| Method | Endpoint                 | Description                               |
|--------|--------------------------|-------------------------------------------|
| POST   | /api/predict             | Run AI prediction                         |
| GET    | /api/predictions/history | Get past user predictions                 |
| POST   | /api/predictions/report  | Download prediction PDF report            |

### Admin
| Method | Endpoint              | Description                             |
|--------|-----------------------|-----------------------------------------|
| GET    | /api/admin/users      | List all users                          |
| GET    | /api/admin/predictions| List all predictions                    |
| GET    | /api/admin/stats      | Platform and model metrics              |
| POST   | /api/admin/retrain    | Retrain ML models                       |

---

## 📘 Important Notes
- The app serves frontend pages from `frontend/templates` through Flask.
- `backend/finai.db` and model artifacts are created automatically.
- Deleting `backend/finai.db` resets the database.
- GitHub Pages cannot host the full Flask backend; it can only serve static frontend assets.

---

## 📦 Dependencies

```
flask==3.0.3
flask-cors==4.0.1
flask-jwt-extended==4.6.0
flask-sqlalchemy==3.1.1
werkzeug==3.0.3
scikit-learn==1.8.0
numpy==2.1.3
pandas==2.2.2
python-dotenv==1.0.1
bcrypt==4.1.3
reportlab==4.2.2
```

---

## .gitignore Recommendation

For this repository, ignore generated and deployment-only files while keeping source code tracked.

Recommended `.gitignore` entries:

```
# Python / Flask
*.pyc
__pycache__/
instance/
backend/finai.db
backend/models/artifacts/
.env
*.env

# VS Code
.vscode/

# OS / temporary
.DS_Store
Thumbs.db

# Static deployment output
frontend/static/build/
frontend/static/dist/
```

> If you publish only the frontend to GitHub Pages, do not commit backend files like `backend/finai.db`, `backend/models/artifacts/`, or any local env files.

