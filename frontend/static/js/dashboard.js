// FinAI Dashboard JS
const API = '/api';
const token = () => localStorage.getItem('finai_token');
const user = () => JSON.parse(localStorage.getItem('finai_user') || '{}');

// ── Guard ──────────────────────────────────────────────────────────
(function guard() {
  if (!token()) window.location.href = '/login';
})();

const INR_TO_USD = 1 / 82.5;
const USD_TO_INR = 82.5;

function formatUSD(amount) {
  const abs = Math.abs(amount);
  return (amount < 0 ? '-$' : '$') + abs.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatINR(amount) {
  const abs = Math.abs(amount);
  return (amount < 0 ? '-₹' : '₹') + abs.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
// ── Init ───────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  const u = user();
  document.getElementById('userGreeting').textContent = `👋 ${u.username || 'User'}`;

  // Sidebar toggle (mobile)
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  await loadProfile();
  await loadHistory();
});

// ── Panel navigation ───────────────────────────────────────────────
function showPanel(name) {
  document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.getElementById('panel-' + name)?.classList.add('active');
  const links = document.querySelectorAll('.sidebar-link');
  links.forEach(l => { if (l.textContent.toLowerCase().includes(name)) l.classList.add('active'); });
  document.getElementById('sidebar').classList.remove('open');
}

// ── Quick fill ─────────────────────────────────────────────────────
function fillSample(type) {
  const samples = {
    low:  { income: 320000, fixed: 90000,  variable: 70000,  goal: 30000,  lifestyle: 3 },
    mid:  { income: 650000, fixed: 180000, variable: 120000, goal: 100000, lifestyle: 5.5 },
    high: { income: 1500000,fixed: 400000, variable: 250000, goal: 350000, lifestyle: 7.5 },
  };
  const s = samples[type];
  document.getElementById('income').value = s.income;
  document.getElementById('fixedExp').value = s.fixed;
  document.getElementById('varExp').value = s.variable;
  document.getElementById('savingsGoal').value = s.goal;
  document.getElementById('lifestyle').value = s.lifestyle;
  document.getElementById('lifestyleLabel').textContent = s.lifestyle.toFixed(1);
}

// ── Prediction ─────────────────────────────────────────────────────
let lastResult = null;

async function runPrediction() {
  const income = parseFloat(document.getElementById('income').value);
  const fixed = parseFloat(document.getElementById('fixedExp').value);
  const variable = parseFloat(document.getElementById('varExp').value);
  const goal = parseFloat(document.getElementById('savingsGoal').value);
  const lifestyle = parseFloat(document.getElementById('lifestyle').value);
  const errEl = document.getElementById('predictError');

  if (isNaN(income) || isNaN(fixed) || isNaN(variable) || isNaN(goal)) {
    errEl.textContent = 'Please fill in all fields.';
    errEl.classList.add('show');
    return;
  }
  errEl.classList.remove('show');

  setPredictLoading(true);
  showOverlay(true);

  const usdIncome = Number((income * INR_TO_USD).toFixed(6));
  const usdFixed = Number((fixed * INR_TO_USD).toFixed(6));
  const usdVariable = Number((variable * INR_TO_USD).toFixed(6));
  const usdGoal = Number((goal * INR_TO_USD).toFixed(6));

  try {
    const res = await fetch(`${API}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token() },
      body: JSON.stringify({
        income: usdIncome,
        fixed_expenses: usdFixed,
        variable_expenses: usdVariable,
        savings_goal: usdGoal,
        lifestyle_score: lifestyle,
        currency: 'INR'
      })
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) return (window.location.href = '/login');
      throw new Error(data.error || 'Prediction failed');
    }
    lastResult = data;
    displayResult(data, income, fixed, variable, goal);
    displayInsights(data.insights || []);
    displayModelCompare(data);
    await loadHistory();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.add('show');
  } finally {
    setPredictLoading(false);
    showOverlay(false);
  }
}

function displayResult(data, income, fixed, variable, goal) {
  const predUsd = data.predicted_savings;
  const predInr = predUsd * USD_TO_INR;
  const valEl = document.getElementById('resultValue');
  const inrEl = document.getElementById('resultValueINR');

  valEl.textContent = formatINR(predInr);
  valEl.className = 'result-value ' + (predUsd >= 0 ? 'result-positive' : 'result-negative');

  inrEl.textContent = `${formatUSD(predUsd)} (approx.)`;
  inrEl.style.color = predUsd >= 0 ? 'var(--success)' : 'var(--danger)';

  document.getElementById('modelBadge').textContent = '⚡ ' + data.model_used.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  document.getElementById('resultEmpty').style.display = 'none';
  document.getElementById('resultCard').classList.remove('result-hidden');

  // Bar chart
  renderResultChart(income, fixed + variable, pred, goal);
}

let resultChartInst = null;
function renderResultChart(income, expenses, savings, goal) {
  const ctx = document.getElementById('resultChart').getContext('2d');
  if (resultChartInst) resultChartInst.destroy();
  resultChartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Income', 'Expenses', 'Predicted Savings', 'Goal'],
      datasets: [{
        data: [income, expenses, Math.max(savings, 0), goal],
        backgroundColor: [
          'rgba(0,102,255,0.7)',
          'rgba(239,68,68,0.7)',
          'rgba(16,185,129,0.7)',
          'rgba(245,158,11,0.7)',
        ],
        borderColor: ['#0066ff','#ef4444','#10b981','#f59e0b'],
        borderWidth: 1.5,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#94a3b8', callback: v => '$' + v.toLocaleString() }
        },
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      },
      animation: { duration: 800, easing: 'easeOutQuart' }
    }
  });
}

let compareChartInst = null;
function displayModelCompare(data) {
  document.getElementById('modelCompare').style.display = 'block';
  document.getElementById('lrPred').textContent = formatINR(data.lr_prediction * USD_TO_INR);
  document.getElementById('rfPred').textContent = formatINR(data.rf_prediction * USD_TO_INR);

  const m = data.metrics || {};
  const best = m.best === 'linear_regression' ? m.linear_regression : m.random_forest;
  document.getElementById('metricR2').textContent = best?.r2 ?? '—';
  document.getElementById('metricMAE').textContent = best?.mae ? '$' + best.mae.toLocaleString() : '—';
  document.getElementById('metricRMSE').textContent = best?.rmse ? '$' + best.rmse.toLocaleString() : '—';

  const ctx2 = document.getElementById('compareChart').getContext('2d');
  if (compareChartInst) compareChartInst.destroy();
  compareChartInst = new Chart(ctx2, {
    type: 'radar',
    data: {
      labels: ['R²', 'Low MAE', 'Low RMSE', 'Speed', 'Interpretability'],
      datasets: [
        {
          label: 'Linear Regression',
          data: [
            (m.linear_regression?.r2 || 0) * 10,
            10 - (m.linear_regression?.mae || 0) / 2000,
            10 - (m.linear_regression?.rmse || 0) / 2000,
            9, 9
          ],
          borderColor: '#0066ff', backgroundColor: 'rgba(0,102,255,0.1)',
          pointBackgroundColor: '#0066ff',
        },
        {
          label: 'Random Forest',
          data: [
            (m.random_forest?.r2 || 0) * 10,
            10 - (m.random_forest?.mae || 0) / 2000,
            10 - (m.random_forest?.rmse || 0) / 2000,
            6, 5
          ],
          borderColor: '#00d4aa', backgroundColor: 'rgba(0,212,170,0.1)',
          pointBackgroundColor: '#00d4aa',
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
      scales: {
        r: {
          grid: { color: 'rgba(255,255,255,0.06)' },
          ticks: { color: '#64748b', stepSize: 2, backdropColor: 'transparent' },
          pointLabels: { color: '#94a3b8', font: { size: 11 } },
          min: 0, max: 10
        }
      }
    }
  });
}

function displayInsights(insights) {
  document.getElementById('insightsSection').style.display = 'block';
  const list = document.getElementById('insightsList');
  list.innerHTML = '';
  insights.forEach((ins, i) => {
    const div = document.createElement('div');
    div.className = `insight-card ${ins.type}`;
    div.style.animationDelay = `${i * 0.08}s`;
    div.innerHTML = `
      <div class="insight-icon-lg">${ins.icon}</div>
      <div>
        <div class="insight-card-title">${ins.title}</div>
        <div class="insight-card-text">${ins.text}</div>
      </div>`;
    list.appendChild(div);
  });
}

// ── History ────────────────────────────────────────────────────────
async function loadHistory() {
  try {
    const res = await fetch(`${API}/predictions/history`, {
      headers: { 'Authorization': 'Bearer ' + token() }
    });
    if (!res.ok) return;
    const data = await res.json();
    renderHistory(data.predictions || []);

    // Profile prediction count
    const countEl = document.getElementById('profilePredCount');
    if (countEl) countEl.textContent = data.predictions.length;
  } catch (e) { console.error('History load failed', e); }
}

function renderHistory(preds) {
  const tbody = document.getElementById('historyBody');
  if (!preds.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:40px">No predictions yet. Run your first prediction!</td></tr>';
    return;
  }
  tbody.innerHTML = preds.map((p, i) => `
    <tr>
      <td style="color:var(--text-dim)">${i + 1}</td>
      <td>${new Date(p.created_at).toLocaleDateString()}</td>
      <td>${formatINR(p.income * USD_TO_INR)}</td>
      <td>${formatINR(p.total_expenses * USD_TO_INR)}</td>
      <td>${formatINR(p.savings_goal * USD_TO_INR)}</td>
      <td style="color:${p.predicted_savings >= 0 ? 'var(--success)' : 'var(--danger)'}">
        ${formatINR(p.predicted_savings * USD_TO_INR)}
      </td>
      <td><span class="status-badge user" style="font-size:0.7rem">${p.model_used.replace(/_/g,' ')}</span></td>
    </tr>
  `).join('');
}

// ── Profile ────────────────────────────────────────────────────────
async function loadProfile() {
  try {
    const res = await fetch(`${API}/auth/me`, {
      headers: { 'Authorization': 'Bearer ' + token() }
    });
    if (!res.ok) return;
    const u = await res.json();
    document.getElementById('profileName').textContent = u.username;
    document.getElementById('profileEmail').textContent = u.email;
    document.getElementById('profileAvatar').textContent = (u.username[0] || 'U').toUpperCase();
    document.getElementById('profileRole').textContent = u.role;
    document.getElementById('profileRole').className = 'status-badge ' + u.role;
    document.getElementById('profileJoined').textContent = new Date(u.created_at).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  } catch (e) { console.error(e); }
}

// ── Geocoding (Google API) ─────────────────────────────────────────
async function resolveAddress() {
  const address = document.getElementById('geoAddress').value.trim();
  const resultEl = document.getElementById('geoResult');
  resultEl.textContent = '';
  if (!address) {
    resultEl.textContent = 'Type an address to resolve first.';
    return;
  }

  try {
    const res = await fetch(`/api/google/geocode?address=${encodeURIComponent(address)}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Geocoding failed');
    resultEl.textContent = `Resolved: ${json.formatted_address} (lat: ${json.location.lat}, lng: ${json.location.lng})`;
  } catch (e) {
    resultEl.textContent = 'Geocode error: ' + e.message;
  }
}


// ── PDF Download ───────────────────────────────────────────────────
async function downloadReport() {
  if (!lastResult) return;
  const income = parseFloat(document.getElementById('income').value);
  const fixed = parseFloat(document.getElementById('fixedExp').value);
  const variable = parseFloat(document.getElementById('varExp').value);
  const goal = parseFloat(document.getElementById('savingsGoal').value);
  const lifestyle = parseFloat(document.getElementById('lifestyle').value);

  try {
    const predictionInr = {
      ...lastResult,
      predicted_savings: lastResult.predicted_savings * USD_TO_INR,
      lr_prediction: lastResult.lr_prediction * USD_TO_INR,
      rf_prediction: lastResult.rf_prediction * USD_TO_INR
    };

    const res = await fetch(`${API}/predictions/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token() },
      body: JSON.stringify({
        input: { income, fixed_expenses: fixed, variable_expenses: variable,
                 total_expenses: fixed + variable, savings_goal: goal, lifestyle_score: lifestyle },
        prediction: predictionInr,
        insights: lastResult.insights
      })
    });
    if (!res.ok) throw new Error('PDF generation failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'finai_prediction_report.pdf';
    a.click(); URL.revokeObjectURL(url);
  } catch (e) { alert('Could not generate PDF: ' + e.message); }
}

// ── Reset ──────────────────────────────────────────────────────────
function resetForm() {
  document.getElementById('income').value = '';
  document.getElementById('fixedExp').value = '';
  document.getElementById('varExp').value = '';
  document.getElementById('savingsGoal').value = '';
  document.getElementById('lifestyle').value = 5;
  document.getElementById('lifestyleLabel').textContent = '5.0';
  document.getElementById('resultEmpty').style.display = 'block';
  document.getElementById('resultCard').classList.add('result-hidden');
  document.getElementById('insightsSection').style.display = 'none';
  document.getElementById('modelCompare').style.display = 'none';
  lastResult = null;
  if (resultChartInst) { resultChartInst.destroy(); resultChartInst = null; }
  if (compareChartInst) { compareChartInst.destroy(); compareChartInst = null; }
}

// ── Chatbot ────────────────────────────────────────────────────────
let chatOpen = false;
function toggleChatbot() {
  chatOpen = !chatOpen;
  document.getElementById('chatbotWindow').classList.toggle('open', chatOpen);
}

const botRules = [
  { k: ['hello','hi','hey'], r: 'Hello! Ask me about savings rate, expense ratios, budgeting tips, or anything financial! 😊' },
  { k: ['savings rate','save more'], r: 'Aim for a 20%+ savings rate. If income is $65k, that means saving $13k+/year. Start with automating transfers on payday!' },
  { k: ['expense','expenses','spending'], r: 'The 50/30/20 rule: 50% needs, 30% wants, 20% savings. Review subscriptions and dining-out first — these are quick wins.' },
  { k: ['lifestyle','score'], r: 'Lifestyle score reflects discretionary spending. 1=very frugal, 10=very lavish. A score above 7 often significantly reduces savings potential.' },
  { k: ['investment','invest'], r: 'Once you have 3-6 months emergency fund, consider: index funds (low cost), ETFs, or maxing out tax-advantaged accounts like 401k/IRA.' },
  { k: ['budget','budgeting'], r: 'Zero-based budgeting assigns every dollar a job. Apps like YNAB or a spreadsheet work great. Start with tracking for 30 days.' },
  { k: ['debt','loan','credit'], r: 'Prioritise high-interest debt (credit cards >15% APR) before investing. The debt avalanche method saves the most money long-term.' },
  { k: ['emergency','fund'], r: '3-6 months of living expenses in a high-yield savings account. This is your financial safety net — prioritise it before other goals.' },
  { k: ['predict','prediction'], r: 'Run the predictor with your real financial data! Enter income, fixed & variable expenses, savings goal, and lifestyle score, then click Predict.' },
  { k: ['model','ai','machine learning','random forest','linear'], r: 'FinAI uses Linear Regression and Random Forest Regressor trained on 10,000 financial profiles. The best model by R² score is auto-selected for your prediction.' },
  { k: ['pdf','report'], r: 'After running a prediction, click the "Download PDF" button to get a professional report with your metrics and insights!' },
];

function botReply(msg) {
  const lower = msg.toLowerCase();
  for (const rule of botRules) {
    if (rule.k.some(k => lower.includes(k))) return rule.r;
  }
  return "Great question! For personalised advice, run the AI Predictor with your data. Generally: spend less than you earn, invest the difference, and review monthly. 💡";
}

function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  const container = document.getElementById('chatMessages');

  const userDiv = document.createElement('div');
  userDiv.className = 'chat-msg user';
  userDiv.textContent = msg;
  container.appendChild(userDiv);

  setTimeout(() => {
    const botDiv = document.createElement('div');
    botDiv.className = 'chat-msg bot';
    botDiv.textContent = botReply(msg);
    container.appendChild(botDiv);
    container.scrollTop = container.scrollHeight;
  }, 400);
  container.scrollTop = container.scrollHeight;
}

// ── Utilities ──────────────────────────────────────────────────────
function setPredictLoading(on) {
  const btn = document.getElementById('predictBtn');
  const spin = document.getElementById('predictSpin');
  const text = document.getElementById('predictBtnText');
  btn.disabled = on;
  spin.style.display = on ? 'inline-block' : 'none';
  text.textContent = on ? 'Analysing...' : '✨ Run AI Prediction';
}

function showOverlay(on) {
  document.getElementById('loadingOverlay').classList.toggle('show', on);
}

function logout() {
  localStorage.removeItem('finai_token');
  localStorage.removeItem('finai_user');
  window.location.href = '/login';
}
