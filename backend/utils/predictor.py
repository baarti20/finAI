"""ML model loader and prediction engine."""
import pickle
import json
import os
import numpy as np

ARTIFACTS = os.path.join(os.path.dirname(__file__), '..', 'models', 'artifacts')


def _load(name):
    path = os.path.join(ARTIFACTS, name)
    with open(path, 'rb') as f:
        return pickle.load(f)


def _meta():
    with open(os.path.join(ARTIFACTS, 'model_meta.json')) as f:
        return json.load(f)


_cache = {}


def get_predictor():
    if _cache:
        return _cache
    meta = _meta()
    _cache['model'] = _load('best_model.pkl')
    _cache['scaler'] = _load('scaler.pkl')
    _cache['meta'] = meta
    _cache['lr'] = _load('linear_regression.pkl')
    _cache['rf'] = _load('random_forest.pkl')
    return _cache


def clear_predictor_cache():
    """Clear loaded model artifacts so new train can refresh."""
    _cache.clear()


FEATURES = ['income', 'fixed_expenses', 'variable_expenses',
            'total_expenses', 'savings_goal', 'lifestyle_score']


def predict(data: dict) -> dict:
    import pandas as pd
    p = get_predictor()
    meta = p['meta']

    X = pd.DataFrame([[data[f] for f in FEATURES]], columns=FEATURES)

    if meta['use_scaler_for_best']:
        X_input = p['scaler'].transform(X)
    else:
        X_input = X

    predicted = float(p['model'].predict(X_input)[0])

    # Also get both model predictions for comparison
    X_scaled = p['scaler'].transform(X)
    lr_pred = float(p['lr'].predict(X_scaled)[0])
    rf_pred = float(p['rf'].predict(X)[0])

    return {
        'predicted_savings': round(predicted, 2),
        'model_used': meta['best_model_name'],
        'lr_prediction': round(lr_pred, 2),
        'rf_prediction': round(rf_pred, 2),
        'metrics': meta['metrics']
    }


def generate_insights(data: dict, predicted_savings: float) -> list:
    """Generate logic-based financial insights."""
    insights = []
    income = data['income']
    total_exp = data['total_expenses']
    savings_goal = data['savings_goal']
    lifestyle = data['lifestyle_score']

    expense_ratio = total_exp / income if income > 0 else 0
    savings_rate = predicted_savings / income if income > 0 else 0

    if expense_ratio > 0.80:
        insights.append({
            'type': 'danger',
            'icon': '⚠️',
            'title': 'High Expense Ratio',
            'text': f'Your expenses are {expense_ratio*100:.1f}% of income. Target below 70% for financial health.'
        })
    elif expense_ratio > 0.65:
        insights.append({
            'type': 'warning',
            'icon': '📊',
            'title': 'Moderate Spending',
            'text': f'Expenses at {expense_ratio*100:.1f}% of income. Reducing by 5-10% could significantly boost savings.'
        })
    else:
        insights.append({
            'type': 'success',
            'icon': '✅',
            'title': 'Healthy Expense Ratio',
            'text': f'Great job! Expenses at {expense_ratio*100:.1f}% of income keeps you on a strong financial path.'
        })

    if predicted_savings >= savings_goal:
        surplus = predicted_savings - savings_goal
        insights.append({
            'type': 'success',
            'icon': '🎯',
            'title': 'Goal Achieved!',
            'text': f'Projected savings exceed your goal by ${surplus:,.0f}. Consider investing the surplus.'
        })
    else:
        gap = savings_goal - predicted_savings
        insights.append({
            'type': 'warning',
            'icon': '🎯',
            'title': 'Savings Gap',
            'text': f'You are ${gap:,.0f} short of your savings goal. Review variable expenses to close the gap.'
        })

    if lifestyle >= 7.5:
        insights.append({
            'type': 'info',
            'icon': '🌟',
            'title': 'Lifestyle Optimization',
            'text': f'Lifestyle score of {lifestyle:.1f}/10 is high. Small reductions (dining out, subscriptions) can free up cash.'
        })
    elif lifestyle <= 3:
        insights.append({
            'type': 'info',
            'icon': '💡',
            'title': 'Quality of Life',
            'text': f'Low lifestyle score. You may be over-restricting. Sustainable budgeting includes some enjoyment.'
        })

    if savings_rate >= 0.20:
        insights.append({
            'type': 'success',
            'icon': '🚀',
            'title': 'Excellent Savings Rate',
            'text': f'{savings_rate*100:.1f}% savings rate. You qualify for aggressive investment strategies like index funds or ETFs.'
        })
    elif savings_rate < 0.05 and predicted_savings > 0:
        insights.append({
            'type': 'warning',
            'icon': '💰',
            'title': 'Low Savings Rate',
            'text': f'Only {savings_rate*100:.1f}% savings rate. The 50/30/20 rule suggests targeting at least 20%.'
        })

    fixed_ratio = data['fixed_expenses'] / income if income > 0 else 0
    if fixed_ratio > 0.40:
        insights.append({
            'type': 'info',
            'icon': '🏠',
            'title': 'High Fixed Costs',
            'text': f'Fixed expenses at {fixed_ratio*100:.1f}% of income. Consider refinancing, downsizing, or renegotiating bills.'
        })

    if predicted_savings < 0:
        insights.append({
            'type': 'danger',
            'icon': '🚨',
            'title': 'Negative Savings Alert',
            'text': 'You are projected to go into debt this period. Immediate action required: cut discretionary spending.'
        })

    return insights
