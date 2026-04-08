"""
AI Financial Prediction System - Model Training Script
Generates 10,000 realistic financial records and trains Linear Regression + Random Forest
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from sklearn.preprocessing import StandardScaler
import pickle
import json
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SEED = 42
np.random.seed(SEED)

# ─── Dataset Generation ────────────────────────────────────────────────────────

def generate_dataset(n=10000):
    """Generate 10,000 realistic financial records."""
    print(f"[+] Generating {n} financial records...")

    income = np.random.normal(loc=65000, scale=25000, size=n).clip(15000, 300000)
    lifestyle_score = np.random.uniform(1, 10, size=n)

    # Fixed expenses scale with income
    fixed_ratio = np.random.uniform(0.20, 0.40, size=n)
    fixed_expenses = income * fixed_ratio + np.random.normal(0, 500, n)
    fixed_expenses = fixed_expenses.clip(200, None)

    # Variable expenses influenced by lifestyle
    variable_base = income * np.random.uniform(0.10, 0.30, n)
    variable_expenses = variable_base * (lifestyle_score / 5) + np.random.normal(0, 300, n)
    variable_expenses = variable_expenses.clip(100, None)

    total_expenses = fixed_expenses + variable_expenses
    savings_goal = income * np.random.uniform(0.05, 0.35, n) + np.random.normal(0, 200, n)
    savings_goal = savings_goal.clip(0, None)

    # Target: actual savings = income - expenses, adjusted by goal adherence & lifestyle
    goal_adherence = np.random.uniform(0.5, 1.2, n)
    noise = np.random.normal(0, 800, n)
    savings = (income - total_expenses) * goal_adherence - (lifestyle_score - 5) * 200 + noise
    savings = savings.clip(-5000, None)  # Allow some negative (debt) scenarios

    df = pd.DataFrame({
        'income': income.round(2),
        'fixed_expenses': fixed_expenses.round(2),
        'variable_expenses': variable_expenses.round(2),
        'total_expenses': total_expenses.round(2),
        'savings_goal': savings_goal.round(2),
        'lifestyle_score': lifestyle_score.round(2),
        'savings': savings.round(2)
    })

    print(f"[+] Dataset stats:\n{df.describe().round(2)}")
    return df


# ─── Training ──────────────────────────────────────────────────────────────────

def train_and_evaluate(df):
    features = ['income', 'fixed_expenses', 'variable_expenses',
                'total_expenses', 'savings_goal', 'lifestyle_score']
    target = 'savings'

    X = df[features]
    y = df[target]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=SEED
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # ── Linear Regression ──
    print("\n[+] Training Linear Regression...")
    lr = LinearRegression()
    lr.fit(X_train_scaled, y_train)
    lr_preds = lr.predict(X_test_scaled)

    lr_metrics = {
        'r2': round(r2_score(y_test, lr_preds), 4),
        'mae': round(mean_absolute_error(y_test, lr_preds), 2),
        'rmse': round(np.sqrt(mean_squared_error(y_test, lr_preds)), 2)
    }
    print(f"    R2={lr_metrics['r2']}  MAE={lr_metrics['mae']}  RMSE={lr_metrics['rmse']}")

    # ── Random Forest ──
    print("\n[+] Training Random Forest Regressor...")
    rf = RandomForestRegressor(
        n_estimators=150,
        max_depth=12,
        min_samples_split=5,
        n_jobs=-1,
        random_state=SEED
    )
    rf.fit(X_train, y_train)
    rf_preds = rf.predict(X_test)

    rf_metrics = {
        'r2': round(r2_score(y_test, rf_preds), 4),
        'mae': round(mean_absolute_error(y_test, rf_preds), 2),
        'rmse': round(np.sqrt(mean_squared_error(y_test, rf_preds)), 2)
    }
    print(f"    R2={rf_metrics['r2']}  MAE={rf_metrics['mae']}  RMSE={rf_metrics['rmse']}")

    # ── Feature Importances ──
    importances = dict(zip(features, rf.feature_importances_.round(4).tolist()))

    # ── Select Best ──
    best_model_name = 'random_forest' if rf_metrics['r2'] >= lr_metrics['r2'] else 'linear_regression'
    best_model = rf if best_model_name == 'random_forest' else lr
    use_scaler = best_model_name == 'linear_regression'

    print(f"\n[OK] Best model: {best_model_name.upper()} (R2={max(lr_metrics['r2'], rf_metrics['r2'])})")

    return {
        'best_model': best_model,
        'best_model_name': best_model_name,
        'lr': lr,
        'rf': rf,
        'scaler': scaler,
        'use_scaler_for_best': use_scaler,
        'metrics': {
            'linear_regression': lr_metrics,
            'random_forest': rf_metrics,
            'best': best_model_name,
            'feature_importances': importances
        },
        'features': features
    }


# ─── Persist ───────────────────────────────────────────────────────────────────

def save_artifacts(results, out_dir):
    os.makedirs(out_dir, exist_ok=True)

    with open(os.path.join(out_dir, 'best_model.pkl'), 'wb') as f:
        pickle.dump(results['best_model'], f)

    with open(os.path.join(out_dir, 'linear_regression.pkl'), 'wb') as f:
        pickle.dump(results['lr'], f)

    with open(os.path.join(out_dir, 'random_forest.pkl'), 'wb') as f:
        pickle.dump(results['rf'], f)

    with open(os.path.join(out_dir, 'scaler.pkl'), 'wb') as f:
        pickle.dump(results['scaler'], f)

    meta = {
        'best_model_name': results['best_model_name'],
        'use_scaler_for_best': results['use_scaler_for_best'],
        'features': results['features'],
        'metrics': results['metrics']
    }
    with open(os.path.join(out_dir, 'model_meta.json'), 'w') as f:
        json.dump(meta, f, indent=2)

    print(f"\n[OK] Artifacts saved to: {out_dir}/")


# ─── Main ──────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATA_DIR = os.path.join(BASE, 'data')
    MODEL_DIR = os.path.join(BASE, 'backend', 'models', 'artifacts')
    CSV_PATH = os.path.join(DATA_DIR, 'financial_dataset.csv')

    os.makedirs(DATA_DIR, exist_ok=True)

    # Load existing real user data if present
    existing_df = None
    if os.path.exists(CSV_PATH):
        try:
            existing_df = pd.read_csv(CSV_PATH)
            # Keep only rows with valid (non-zero) income — filters out blank registration rows
            existing_df = existing_df[existing_df['income'] > 0].reset_index(drop=True)
            print(f"[+] Loaded {len(existing_df)} existing records from dataset (real user data preserved)")
        except Exception as e:
            print(f"[!] Could not load existing dataset: {e}")
            existing_df = None

    # Generate synthetic base data
    synthetic_df = generate_dataset(10000)

    # Merge: real user data takes priority, synthetic fills the rest
    if existing_df is not None and len(existing_df) > 0:
        df = pd.concat([existing_df, synthetic_df], ignore_index=True)
        print(f"[+] Combined dataset: {len(existing_df)} real + {len(synthetic_df)} synthetic = {len(df)} total rows")
    else:
        df = synthetic_df

    df.to_csv(CSV_PATH, index=False)
    print(f"[OK] Dataset saved: data/financial_dataset.csv ({len(df)} rows)")

    results = train_and_evaluate(df)
    save_artifacts(results, MODEL_DIR)
    print("\n[OK] Training complete!")
