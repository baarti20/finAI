# ◈ FinAI — AI Financial Prediction System

A production-ready, full-stack AI-powered financial prediction platform with a dark glassmorphism UI, dual ML models, JWT authentication, admin panel, and PDF report generation.

---

## 📁 Project Structure

```
finai/
├── backend/
│   ├── app.py                    # Flask entry point
│   ├── requirements.txt
│   ├── finai.db                  # SQLite database (auto-created)
│   ├── models/
│   │   ├── database.py           # DB models & queries
│   │   └── artifacts/            # Trained model files (auto-created)
│   │       ├── best_model.pkl
│   │       ├── linear_regression.pkl
│   │       ├── random_forest.pkl
│   │       ├── scaler.pkl
│   │       └── model_meta.json
│   ├── routes/
│   │   └── api.py                # All REST API endpoints
│   └── utils/
│       ├── auth.py               # JWT helpers
│       ├── predictor.py          # ML prediction engine
│       └── pdf_report.py         # PDF report generator
├── frontend/
│   ├── templates/
│   │   ├── index.html            # Landing page
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── dashboard.html        # User dashboard
│   │   └── admin.html            # Admin panel
│   └── static/
│       ├── css/main.css          # Global styles
│       └── js/
│           ├── landing.js
│           ├── auth.js
│           ├── dashboard.js
│           └── admin.js
├── ml/
│   └── train_model.py            # ML training script
├── data/
│   └── financial_dataset.csv     # Generated dataset (auto-created)
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- pip

### 1. Clone / extract the project
```bash
cd finai
```

### 2. Install dependencies
```bash
pip install -r backend/requirements.txt
```

> Note: For Python 3.13, pin `scikit-learn==1.8.0` in `backend/requirements.txt` (instead of 1.5.1) to avoid building from source and MSVC compiler issues.

### 3. Train the ML models (first time only)
```bash
python ml/train_model.py
```
This generates `data/financial_dataset.csv` (10,000 rows) and saves trained models to `backend/models/artifacts/`.

### 4. Start the server
```bash
python backend/app.py
```

### 5. Open in browser
```
http://localhost:5000
```

---

## 🔑 Default Credentials

| Role  | Email               | Password  |
|-------|---------------------|-----------|
| Admin | admin@finai.com     | admin123  |

Register any new account for regular user access.

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint              | Description         | Auth Required |
|--------|-----------------------|---------------------|---------------|
| POST   | /api/auth/register    | Register new user   | No            |
| POST   | /api/auth/login       | Login, get JWT      | No            |
| GET    | /api/auth/me          | Get current user    | Yes           |

### Predictions
| Method | Endpoint                    | Description              | Auth Required |
|--------|-----------------------------|--------------------------|---------------|
| POST   | /api/predict                | Run AI prediction        | Yes           |
| GET    | /api/predictions/history    | User's past predictions  | Yes           |
| POST   | /api/predictions/report     | Download PDF report      | Yes           |

### Admin (admin role only)
| Method | Endpoint             | Description           |
|--------|----------------------|-----------------------|
| GET    | /api/admin/users     | All registered users  |
| GET    | /api/admin/predictions | All prediction logs |
| GET    | /api/admin/stats     | Platform + model stats|
| POST   | /api/admin/retrain   | Retrain ML models     |

### Predict Request Body
```json
{
  "income": 65000,
  "fixed_expenses": 18000,
  "variable_expenses": 12000,
  "savings_goal": 10000,
  "lifestyle_score": 5.5
}
```

### Predict Response
```json
{
  "predicted_savings": 24750.50,
  "model_used": "linear_regression",
  "lr_prediction": 24750.50,
  "rf_prediction": 23890.00,
  "metrics": {
    "linear_regression": { "r2": 0.747, "mae": 5430.75, "rmse": 7029.10 },
    "random_forest":     { "r2": 0.732, "mae": 5540.96, "rmse": 7239.46 },
    "best": "linear_regression"
  },
  "insights": [
    {
      "type": "success",
      "icon": "✅",
      "title": "Healthy Expense Ratio",
      "text": "Great job! Expenses at 46.2% of income keeps you on a strong financial path."
    }
  ],
  "input": { ... }
}
```

---

## 🧠 ML Architecture

### Dataset Generation
- 10,000 synthetic financial records with realistic distributions
- Income: Normal distribution (mean=$65k, std=$25k), clipped $15k–$300k
- Fixed expenses: 20–40% of income + noise
- Variable expenses: Lifestyle-influenced, 10–30% of income
- Savings: income − expenses × goal_adherence − lifestyle_penalty + noise

### Features
| Feature           | Description                        |
|-------------------|------------------------------------|
| income            | Annual gross income                |
| fixed_expenses    | Rent, insurance, subscriptions     |
| variable_expenses | Food, entertainment, transport     |
| total_expenses    | fixed + variable                   |
| savings_goal      | User's target annual savings       |
| lifestyle_score   | 1 (frugal) to 10 (lavish)         |

### Models
| Model              | Config                                    |
|--------------------|-------------------------------------------|
| LinearRegression   | StandardScaler + sklearn LinearRegression |
| RandomForest       | 150 trees, max_depth=12, n_jobs=-1        |

Best model selected automatically by R² on 20% holdout test set.

---

## 🎨 Design System

- **Theme**: Dark glassmorphism — deep navy backgrounds, frosted glass cards
- **Colors**: Blue (#0066ff) + Teal (#00d4aa) gradient accents
- **Typography**: Syne (display/headings) + DM Sans (body)
- **Components**: Glassmorphic cards, gradient buttons, animated sparklines, radar charts

---

## 🔥 Features Summary

- ✅ Landing page with animated hero, feature sections, tech stack, developer bio
- ✅ JWT auth (register / login / protected routes)
- ✅ Bcrypt-equivalent password hashing (SHA256)
- ✅ User dashboard: prediction form, result cards, bar chart, radar model comparison
- ✅ AI financial insights (logic-based: expense ratio, savings rate, lifestyle analysis)
- ✅ Prediction history table
- ✅ PDF report download (ReportLab)
- ✅ Admin dashboard: user list, prediction logs, model metrics, feature importance bars
- ✅ One-click model retraining via UI
- ✅ Chatbot financial assistant (rule-based)
- ✅ SQLite database with automatic schema init
- ✅ Mobile-responsive design
- ✅ Loading animations and overlays
- ✅ CORS headers for API access

---

## 🛠 Environment Variables (optional)

```bash
JWT_SECRET=your-secret-key    # Default: finai-super-secret-key-2024
SECRET_KEY=your-flask-secret  # Default: finai-flask-secret
```

---

## 📄 License

Built for demonstration and educational purposes.
