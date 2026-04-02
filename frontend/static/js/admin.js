// FinAI Admin JS
const API = '/api';
const token = () => localStorage.getItem('finai_token');

const USD_TO_INR = 1;
function formatINR(amount) {
  const abs = Math.abs(amount);
  return (amount < 0 ? '-₹' : '₹') + abs.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

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
let adminModelMetrics = {};

async function loadStats() {
  try {
    const res = await fetch(`${API}/admin/stats`, {
      headers: { 'Authorization': 'Bearer ' + token() }
    });
    if (res.status === 403) return (window.location.href = '/dashboard');
    const data = await res.json();

    document.getElementById('statUsers').textContent = data.total_users;
    document.getElementById('statPreds').textContent = data.total_predictions;
    document.getElementById('statAvg').textContent = formatINR(data.avg_predicted_savings || 0);
    document.getElementById('statModel').textContent = (data.best_model || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const m = data.model_metrics || {};
    const lr = m.linear_regression || {};
    const rf = m.random_forest || {};
    document.getElementById('lrR2').textContent = lr.r2 ?? '—';
    document.getElementById('lrMAE').textContent = lr.mae ? formatINR(lr.mae) : '—';
    document.getElementById('lrRMSE').textContent = lr.rmse ? formatINR(lr.rmse) : '—';
    document.getElementById('rfR2').textContent = rf.r2 ?? '—';
    document.getElementById('rfMAE').textContent = rf.mae ? formatINR(rf.mae) : '—';
    document.getElementById('rfRMSE').textContent = rf.rmse ? formatINR(rf.rmse) : '—';

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

    // Store metrics for model comparison
    adminModelMetrics = m;

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
      labels: ['R² Score (×10)', 'MAE (₹k, inverted)', 'RMSE (₹k, inverted)'],
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
let allPredictions = [];

async function loadPredictions() {
  try {
    const res = await fetch(`${API}/admin/predictions`, {
      headers: { 'Authorization': 'Bearer ' + token() }
    });
    const data = await res.json();
    const tbody = document.getElementById('predsBody');
    allPredictions = data.predictions || [];
    if (!allPredictions.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-dim);padding:40px">No predictions yet.</td></tr>';
      return;
    }
    tbody.innerHTML = allPredictions.map((p, i) => `
      <tr>
        <td style="color:var(--text-dim)">${i + 1}</td>
        <td style="font-weight:500">${p.username}</td>
        <td>${new Date(p.created_at).toLocaleDateString()}</td>
        <td>${formatINR(p.income)}</td>
        <td>${formatINR(p.total_expenses)}</td>
        <td>${formatINR(p.savings_goal)}</td>
        <td style="color:${p.predicted_savings >= 0 ? 'var(--success)' : 'var(--danger)'}">
          ${formatINR(p.predicted_savings)}
        </td>
        <td><span class="status-badge user" style="font-size:0.7rem">${p.model_used.replace(/_/g, ' ')}</span></td>
        <td>${p.file_name
          ? `<button onclick='openFileViewer(${JSON.stringify(p.file_name)}, ${JSON.stringify(p.file_data)})'
               style="background:rgba(0,212,170,0.1);border:1px solid rgba(0,212,170,0.3);color:var(--green);border-radius:6px;padding:3px 10px;font-size:0.75rem;cursor:pointer">
               📎 ${p.file_name}</button>`
          : '<span style="color:var(--text-dim);font-size:0.78rem">—</span>'}
        </td>
      </tr>
    `).join('');

    // Populate user dropdown for model comparison
    const select = document.getElementById('compareUserSelect');
    const seen = new Set();
    allPredictions.forEach(p => {
      if (!seen.has(p.username)) {
        seen.add(p.username);
        const opt = document.createElement('option');
        opt.value = p.username;
        opt.textContent = p.username;
        select.appendChild(opt);
      }
    });
  } catch (e) { console.error('Preds load failed', e); }
}

let userCompareChartInst = null;
function renderUserModelCompare() {
  const username = document.getElementById('compareUserSelect').value;
  const empty = document.getElementById('userCompareEmpty');
  const content = document.getElementById('userCompareContent');
  if (!username) { empty.style.display = 'block'; content.style.display = 'none'; return; }

  const pred = allPredictions.find(p => p.username === username);
  if (!pred) return;

  empty.style.display = 'none';
  content.style.display = 'block';

  const fmt = v => v != null ? formatINR(v) : '—';
  document.getElementById('ucLrPred').textContent = fmt(pred.lr_prediction);
  document.getElementById('ucRfPred').textContent = fmt(pred.rf_prediction);
  document.getElementById('ucModelUsed').textContent = (pred.model_used || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const m = adminModelMetrics;
  const best = m.best === 'linear_regression' ? m.linear_regression : m.random_forest;
  document.getElementById('ucR2').textContent = best?.r2 ?? '—';
  document.getElementById('ucMAE').textContent = best?.mae ? formatINR(best.mae) : '—';
  document.getElementById('ucRMSE').textContent = best?.rmse ? formatINR(best.rmse) : '—';

  const lr = m.linear_regression || {};
  const rf = m.random_forest || {};
  const ctx = document.getElementById('userCompareChart').getContext('2d');
  if (userCompareChartInst) userCompareChartInst.destroy();
  userCompareChartInst = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['R²', 'Low MAE', 'Low RMSE', 'Speed', 'Interpretability'],
      datasets: [
        { label: 'Linear Regression', data: [(lr.r2||0)*10, 10-(lr.mae||0)/2000, 10-(lr.rmse||0)/2000, 9, 9], borderColor: '#0066ff', backgroundColor: 'rgba(0,102,255,0.1)', pointBackgroundColor: '#0066ff' },
        { label: 'Random Forest',     data: [(rf.r2||0)*10, 10-(rf.mae||0)/2000, 10-(rf.rmse||0)/2000, 6, 5], borderColor: '#00d4aa', backgroundColor: 'rgba(0,212,170,0.1)', pointBackgroundColor: '#00d4aa' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
      scales: { r: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#64748b', stepSize: 2, backdropColor: 'transparent' }, pointLabels: { color: '#94a3b8', font: { size: 11 } }, min: 0, max: 10 } }
    }
  });
}

// ── File Viewer ────────────────────────────────────────────────────
function openFileViewer(name, rawData) {
  document.getElementById('fileViewerName').textContent = name;
  const table = document.getElementById('fileViewerTable');
  table.innerHTML = '';

  let rows = [];
  try { rows = typeof rawData === 'string' ? JSON.parse(rawData) : (rawData || []); } catch(e) { rows = []; }

  if (!rows.length) {
    table.innerHTML = '<tr><td style="color:var(--text-dim);padding:20px">No data available.</td></tr>';
  } else {
    const isNested = Array.isArray(rows[0]);
    if (isNested) {
      rows.forEach((row, ri) => {
        const tr = document.createElement('tr');
        row.forEach(cell => {
          const td = document.createElement(ri === 0 ? 'th' : 'td');
          td.textContent = cell ?? '';
          td.style.cssText = ri === 0
            ? 'padding:8px 12px;color:var(--text-dim);font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid var(--card-border);white-space:nowrap'
            : 'padding:8px 12px;color:var(--text-muted);font-size:0.83rem;border-bottom:1px solid rgba(255,255,255,0.03)';
          tr.appendChild(td);
        });
        table.appendChild(tr);
      });
    } else {
      const hdr = document.createElement('tr');
      ['Line', 'Content'].forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        th.style.cssText = 'padding:8px 12px;color:var(--text-dim);font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid var(--card-border)';
        hdr.appendChild(th);
      });
      table.appendChild(hdr);
      rows.forEach((row, i) => {
        const tr = document.createElement('tr');
        [i + 1, Array.isArray(row) ? row.join(', ') : row].forEach(val => {
          const td = document.createElement('td');
          td.textContent = val;
          td.style.cssText = 'padding:8px 12px;color:var(--text-muted);font-size:0.83rem;border-bottom:1px solid rgba(255,255,255,0.03)';
          tr.appendChild(td);
        });
        table.appendChild(tr);
      });
    }
  }

  const ov = document.getElementById('fileViewerOverlay');
  ov.style.display = 'flex';
}

function closeFileViewer() {
  document.getElementById('fileViewerOverlay').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('fileViewerOverlay')?.addEventListener('click', e => {
    if (e.target.id === 'fileViewerOverlay') closeFileViewer();
  });
});

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
      result.innerHTML = `<div class="success-msg show">✅ ${data.message} — Redirecting to dataset...</div>`;
      setTimeout(() => {
        window.open('https://github.com/baarti20/finAI/blob/main/data/financial_dataset.csv', '_blank');
      }, 1200);
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
