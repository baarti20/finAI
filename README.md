# ◈ FinAI — AI Financial Prediction System

A production-ready, full-stack AI-powered financial prediction platform built with Python Flask, Scikit-learn, and Vanilla JS. Features a dark glassmorphism UI, dual ML models, JWT authentication, INR currency support, file import for predictions, forgot password recovery, interactive analytics, admin panel, and PDF report generation.

---

## 👨‍💻 Developer

| Field       | Details            |
|-------------|--------------------|
| Name        | Aarti Bhanushali   |
| Name        | Kajal Bamaniya     |
| Name        | Teesha Panchal     |
| Name        | Frinda Patel       |
| Stream      | B.Sc. IT           |

---

## 📁 Project Structure

```
finai/
├── backend/
│   ├── app.py                    # Flask entry point
│   ├── requirements.txt
│   ├── finai.db                  # SQLite database (auto-created)
│   ├── models/
│   │   ├── database.py           # DB models & queries (users, predictions, file snapshots)
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
│   │   ├── index.html            # Landing page with developer section
│   │   ├── login.html            # Login + Forgot Password modal
│   │   ├── register.html         # Full registration form (name, phone, gender, city, DOB)
│   │   ├── dashboard.html        # User dashboard
│   │   └── admin.html            # Admin panel
│   └── static/
│       ├── css/main.css          # Global styles (dark theme, dropdowns, strength bar)
│       └── js/
│           ├── landing.js
│           ├── auth.js           # Login, register, forgot password, validation
│           ├── dashboard.js      # Prediction, analytics, file import, history
│           └── admin.js          # Admin stats, predictions, model comparison, file viewer
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

Register any new account for regular user access. After registration, users are redirected to the login page.

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint                  | Description                              | Auth Required |
|--------|---------------------------|------------------------------------------|---------------|
| POST   | /api/auth/register        | Register new user (full profile + DOB)   | No            |
| POST   | /api/auth/login           | Login, get JWT                           | No            |
| GET    | /api/auth/me              | Get current user                         | Yes           |
| POST   | /api/auth/verify-dob      | Verify email + DOB for password reset    | No            |
| POST   | /api/auth/reset-password  | Reset password after DOB verification    | No            |

### Predictions
| Method | Endpoint                    | Description                          | Auth Required |
|--------|-----------------------------|--------------------------------------|---------------|
| POST   | /api/predict                | Run AI prediction (INR, file attach) | Yes           |
| GET    | /api/predictions/history    | User's past predictions + file data  | Yes           |
| POST   | /api/predictions/report     | Download PDF report                  | Yes           |

### Admin (admin role only)
| Method | Endpoint                   | Description                              |
|--------|----------------------------|------------------------------------------|
| GET    | /api/admin/users           | All registered users (full profile)      |
| GET    | /api/admin/predictions     | All prediction logs with file snapshots  |
| GET    | /api/admin/stats           | Platform + model stats                   |
| POST   | /api/admin/retrain         | Retrain ML models → opens dataset CSV    |

### Register Request Body
```json
{
  "full_name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "secret123",
  "dob": "1998-05-15",
  "phone": "9876543210",
  "gender": "Male",
  "city": "Mumbai"
}
```

### Predict Request Body
```json
{
  "income": 650000,
  "fixed_expenses": 180000,
  "variable_expenses": 120000,
  "savings_goal": 100000,
  "lifestyle_score": 5.5,
  "file_name": "expenses.xlsx",
  "file_data": [["income","fixed_expenses","variable_expenses","savings_goal","lifestyle_score"],[650000,180000,120000,100000,5.5]]
}
```
> All monetary values are in **Indian Rupees (₹)**. No USD conversion is applied.

### Predict Response
```json
{
  "predicted_savings": 248500.00,
  "model_used": "linear_regression",
  "lr_prediction": 248500.00,
  "rf_prediction": 241200.00,
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

## 🗄️ Database Schema

### users
| Column        | Type    | Description                          |
|---------------|---------|--------------------------------------|
| id            | INTEGER | Primary key                          |
| full_name     | TEXT    | User's full name                     |
| username      | TEXT    | Unique username                      |
| email         | TEXT    | Unique email address                 |
| phone         | TEXT    | 10-digit phone number                |
| gender        | TEXT    | Male / Female / Other                |
| city          | TEXT    | City of residence                    |
| password_hash | TEXT    | SHA256 hashed password               |
| role          | TEXT    | user / admin                         |
| dob           | TEXT    | Date of birth (for account recovery) |
| created_at    | TEXT    | Registration timestamp               |
| last_login    | TEXT    | Last login timestamp                 |

### predictions
| Column            | Type    | Description                    |
|-------------------|---------|--------------------------------|
| id                | INTEGER | Primary key                    |
| user_id           | INTEGER | Foreign key → users.id         |
| income            | REAL    | Annual income (₹)              |
| fixed_expenses    | REAL    | Fixed expenses (₹)             |
| variable_expenses | REAL    | Variable expenses (₹)          |
| total_expenses    | REAL    | fixed + variable (₹)           |
| savings_goal      | REAL    | Target savings (₹)             |
| lifestyle_score   | REAL    | 1–10 lifestyle score           |
| predicted_savings | REAL    | AI predicted savings (₹)       |
| model_used        | TEXT    | linear_regression / random_forest |
| file_name         | TEXT    | Attached file name (optional)  |
| file_data         | TEXT    | JSON snapshot of file contents |
| created_at        | TEXT    | Prediction timestamp           |

---

## 🧠 ML Architecture

### Dataset Generation
- 10,000 synthetic financial records with realistic distributions
- Income: Normal distribution, clipped ₹15k–₹300k equivalent
- Fixed expenses: 20–40% of income + noise
- Variable expenses: Lifestyle-influenced, 10–30% of income
- Savings: income − expenses × goal_adherence − lifestyle_penalty + noise

### Features
| Feature           | Description                        |
|-------------------|------------------------------------|
| income            | Annual gross income (₹)            |
| fixed_expenses    | Rent, insurance, subscriptions (₹) |
| variable_expenses | Food, entertainment, transport (₹) |
| total_expenses    | fixed + variable (₹)               |
| savings_goal      | User's target annual savings (₹)   |
| lifestyle_score   | 1 (frugal) to 10 (lavish)          |

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
- **Components**: Glassmorphic cards, gradient buttons, animated sparklines, radar charts, dark dropdowns

---

## 🔥 Features Summary

### Auth
- ✅ JWT authentication (register / login / protected routes)
- ✅ Full registration form — Full Name, Username, Email, Password, DOB, Phone, Gender, City
- ✅ After registration → redirected to login page
- ✅ SHA256 password hashing
- ✅ Date of birth stored at registration for account recovery
- ✅ Forgot Password — 3-step modal: email → DOB verify → new password
- ✅ Client-side validation: full name, email format, username rules, password strength meter, phone format, confirm password match
- ✅ Show/hide password toggle on all password fields

### User Dashboard
- ✅ Financial prediction form with INR inputs (₹)
- ✅ File import — Excel (.xlsx) or Notes (.txt/.csv) auto-fills Income, Fixed & Variable Expenses
- ✅ File chip with filename + ✕ cancel button
- ✅ Income / Fixed / Variable Expenses set to 0 automatically on file attach
- ✅ Quick fill presets: Low Income, Middle Class, High Earner
- ✅ Prediction result card with ₹ savings, model badge, bar chart
- ✅ AI financial insights (expense ratio, savings rate, lifestyle analysis)
- ✅ Prediction history table with attached file viewer (📎 button)
- ✅ Analytics panel with 3 modes:
  - ⚡ **Current** — bar chart of latest prediction
  - 📋 **History** — trend line across last 10 predictions
  - ⚖️ **Compare** — grouped bar chart: current vs any past prediction with delta % badges
- ✅ Budget health bars (Expense Ratio, Savings Rate, Goal Achievement)
- ✅ PDF report download (ReportLab)
- ✅ Rule-based chatbot financial assistant

### Admin Dashboard
- ✅ Overview: total users, predictions, avg savings (₹), best model
- ✅ Model performance metrics in ₹ (MAE, RMSE, R²)
- ✅ Feature importance bars (Random Forest)
- ✅ Model comparison bar chart (LR vs RF)
- ✅ Users table — ID, Full Name, Username, Email, Phone, Gender, City, Role, Joined, Last Login
- ✅ Prediction logs with ₹ amounts + attached file viewer per user
- ✅ Per-user model comparison (radar chart — LR vs RF)
- ✅ One-click model retraining → opens dataset CSV on GitHub after success

### General
- ✅ All amounts displayed in Indian Rupees (₹) — no USD conversion
- ✅ File snapshots stored in DB and viewable in history (user + admin)
- ✅ Dark-themed dropdowns (select elements)
- ✅ SQLite database with automatic schema init + migration safety for new columns
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
