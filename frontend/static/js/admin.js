// FinAI Admin JS
const API = '/api';
const token = () => localStorage.getItem('finai_token');

// ── Guard: admin only ──────────────────────────────────────────────
(function guard() {
  const u = JSON.parse(localStorage.getItem('finai_user') || '{}');
  if (!token()) return (window.location.href = '/login');
  if (u.role !== 'admin') return (window.location.href = '/dashboard');
})();

// ── Init ───────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  await loadStats();
  await loadUsers();
  await loadPredictions();
});

// ── Panel nav ──────────────────────────────────────────────────────
function showPanel(name) {
  document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.getElementById('panel-' + name)?.classList.add('active');
  document.querySelectorAll('.sidebar-link').forEach(l => {
    if (l.textContent.toLowerCase().includes(name.substring(0, 4))) l.classList.add('active');
  });
}

// ── Stats & Overview ───────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await fetch(`${API}/admin/stats`, {
      headers: { 'Authorization': 'Bearer ' + token() }
    });
    if (res.status === 403) return (window.location.href = '/dashboard');
    const data = await res.json();

    document.getElementById('statUsers').textContent = data.total_users;
    document.getElementById('statPreds').textContent = data.total_predictions;
    document.getElementById('statAvg').textContent = '$' + (data.avg_predicted_savings || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
    document.getElementById('statModel').textContent = (data.best_model || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const m = data.model_metrics || {};
    const lr = m.linear_regression || {};
    const rf = m.random_forest || {};
    document.getElementById('lrR2').textContent = lr.r2 ?? '—';
    document.getElementById('lrMAE').textContent = lr.mae ? '$' + lr.mae.toLocaleString() : '—';
    document.getElementById('lrRMSE').textContent = lr.rmse ? '$' + lr.rmse.toLocaleString() : '—';
    document.getElementById('rfR2').textContent = rf.r2 ?? '—';
    document.getElementById('rfMAE').textContent = rf.mae ? '$' + rf.mae.toLocaleString() : '—';
    document.getElementById('rfRMSE').textContent = rf.rmse ? '$' + rf.rmse.toLocaleString() : '—';

    // Feature importances
    const fi = data.feature_importances || {};
    const fiEl = document.getElementById('featureBars');
    const sorted = Object.entries(fi).sort((a, b) => b[1] - a[1]);
    const maxVal = sorted[0]?.[1] || 1;
    fiEl.innerHTML = sorted.map(([feat, val]) => `
      <div class="bar-row">
        <div class="bar-label">
          <span>${feat.replace(/_/g, ' ')}</span>
          <span>${(val * 100).toFixed(1)}%</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${(val / maxVal * 100).toFixed(1)}%"></div>
        </div>
      </div>
    `).join('');

    // Chart
    renderAdminChart(lr, rf);
  } catch (e) { console.error('Stats load failed', e); }
}

let adminChartInst = null;
function renderAdminChart(lr, rf) {
  const ctx = document.getElementById('adminChart').getContext('2d');
  if (adminChartInst) adminChartInst.destroy();
  adminChartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['R² Score (×10)', 'MAE ($k, inverted)', 'RMSE ($k, inverted)'],
      datasets: [
        {
          label: 'Linear Regression',
          data: [
            (lr.r2 || 0) * 10,
            Math.max(0, 10 - (lr.mae || 0) / 1000),
            Math.max(0, 10 - (lr.rmse || 0) / 1000),
          ],
          backgroundColor: 'rgba(0,102,255,0.6)',
          borderColor: '#0066ff', borderWidth: 1.5, borderRadius: 6
        },
        {
          label: 'Random Forest',
          data: [
            (rf.r2 || 0) * 10,
            Math.max(0, 10 - (rf.mae || 0) / 1000),
            Math.max(0, 10 - (rf.rmse || 0) / 1000),
          ],
          backgroundColor: 'rgba(0,212,170,0.6)',
          borderColor: '#00d4aa', borderWidth: 1.5, borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#94a3b8' } } },
      scales: {
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' }, max: 10 },
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      },
      animation: { duration: 1000, easing: 'easeOutQuart' }
    }
  });
}

// ── Users ──────────────────────────────────────────────────────────
async function loadUsers() {
  try {
    const res = await fetch(`${API}/admin/users`, {
      headers: { 'Authorization': 'Bearer ' + token() }
    });
    const data = await res.json();
    const tbody = document.getElementById('usersBody');
    const users = data.users || [];
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:40px">No users found.</td></tr>';
      return;
    }
    tbody.innerHTML = users.map(u => `
      <tr>
        <td style="color:var(--text-dim)">${u.id}</td>
        <td style="font-weight:500">${u.username}</td>
        <td style="color:var(--text-muted)">${u.email}</td>
        <td><span class="status-badge ${u.role}">${u.role}</span></td>
        <td>${u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
        <td style="color:var(--text-dim)">${u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
      </tr>
    `).join('');
  } catch (e) { console.error('Users load failed', e); }
}

// ── Predictions Log ────────────────────────────────────────────────
async function loadPredictions() {
  try {
    const res = await fetch(`${API}/admin/predictions`, {
      headers: { 'Authorization': 'Bearer ' + token() }
    });
    const data = await res.json();
    const tbody = document.getElementById('predsBody');
    const preds = data.predictions || [];
    if (!preds.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-dim);padding:40px">No predictions yet.</td></tr>';
      return;
    }
    tbody.innerHTML = preds.map((p, i) => `
      <tr>
        <td style="color:var(--text-dim)">${i + 1}</td>
        <td style="font-weight:500">${p.username}</td>
        <td>${new Date(p.created_at).toLocaleDateString()}</td>
        <td>$${p.income.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
        <td>$${p.total_expenses.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
        <td>$${p.savings_goal.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
        <td style="color:${p.predicted_savings >= 0 ? 'var(--success)' : 'var(--danger)'}">
          $${Math.abs(p.predicted_savings).toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </td>
        <td><span class="status-badge user" style="font-size:0.7rem">${p.model_used.replace(/_/g, ' ')}</span></td>
      </tr>
    `).join('');
  } catch (e) { console.error('Preds load failed', e); }
}

// ── Retrain ────────────────────────────────────────────────────────
async function retrainModel() {
  const btn = document.getElementById('retrainBtn');
  const result = document.getElementById('retrainResult');
  btn.disabled = true;
  btn.textContent = '⏳ Retraining...';
  document.getElementById('loadingText').textContent = 'Retraining models (this takes ~30s)...';
  document.getElementById('loadingOverlay').classList.add('show');
  result.style.display = 'none';

  try {
    const res = await fetch(`${API}/admin/retrain`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token() }
    });
    const data = await res.json();
    result.style.display = 'block';
    if (res.ok) {
      result.innerHTML = `<div class="success-msg show">✅ ${data.message}</div>`;
      await loadStats();
    } else {
      result.innerHTML = `<div class="error-msg show">❌ ${data.error}</div>`;
    }
  } catch (e) {
    result.style.display = 'block';
    result.innerHTML = `<div class="error-msg show">Network error: ${e.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = '🔄 Start Retraining';
    document.getElementById('loadingOverlay').classList.remove('show');
  }
}

// ── Logout ──────────────────────────────────────────────────────────
function logout() {
  localStorage.removeItem('finai_token');
  localStorage.removeItem('finai_user');
  window.location.href = '/login';
}
