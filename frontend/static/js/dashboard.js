// FinAI Dashboard JS
const API = '/api';
const token = () => localStorage.getItem('finai_token');
const user = () => JSON.parse(localStorage.getItem('finai_user') || '{}');

// ── Guard ──────────────────────────────────────────────────────────
(function guard() {
  if (!token()) window.location.href = '/login';
})();

const INR_TO_USD = 1;
const USD_TO_INR = 1;

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
    const open = document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarBackdrop')?.classList.toggle('show', open);
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
  document.getElementById('sidebarBackdrop')?.classList.remove('show');
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
let fileImported = false;
let lastFileSnapshot = null; // { name, rows: [[...],[...]] }

async function runPrediction() {
  const income = parseFloat(document.getElementById('income').value);
  const fixed = parseFloat(document.getElementById('fixedExp').value);
  const variable = parseFloat(document.getElementById('varExp').value);
  const goal = parseFloat(document.getElementById('savingsGoal').value);
  const lifestyle = parseFloat(document.getElementById('lifestyle').value);
  const errEl = document.getElementById('predictError');

  // If no file imported, all fields required; if file imported, only savings goal is required
  const missingManual = !fileImported && (isNaN(income) || isNaN(fixed) || isNaN(variable));
  const missingGoal = isNaN(goal);
  if (missingManual || missingGoal) {
    errEl.textContent = fileImported
      ? 'Please fill in Savings Goal and Lifestyle Score.'
      : 'Please fill in all fields, or import a file to auto-fill Income and Expenses.';
    errEl.classList.add('show');
    return;
  }
  errEl.classList.remove('show');

  setPredictLoading(true);
  showOverlay(true);

  try {
    const res = await fetch(`${API}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token() },
      body: JSON.stringify({
        income: income,
        fixed_expenses: fixed,
        variable_expenses: variable,
        savings_goal: goal,
        lifestyle_score: lifestyle,
        file_name: lastFileSnapshot ? lastFileSnapshot.name : null,
        file_data: lastFileSnapshot ? lastFileSnapshot.rows : null
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
  const predInr = data.predicted_savings;
  const valEl = document.getElementById('resultValue');

  valEl.textContent = formatINR(predInr);
  valEl.className = 'result-value ' + (predInr >= 0 ? 'result-positive' : 'result-negative');

  document.getElementById('modelBadge').textContent = '⚡ ' + data.model_used.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  document.getElementById('resultEmpty').style.display = 'none';
  document.getElementById('resultCard').classList.remove('result-hidden');

  renderResultChart(income, fixed + variable, predInr, goal);
}

let resultChartInst = null;
function renderResultChart(income, expenses, savings, goal) {
  const ctx = document.getElementById('resultChart').getContext('2d');
  if (resultChartInst) resultChartInst.destroy();
  resultChartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [['Income'], ['Expenses'], ['Predicted', 'Savings'], ['Savings', 'Goal']],
      datasets: [{
        data: [income, expenses, Math.max(savings, 0), goal],
        backgroundColor: [
          'rgba(111,168,166,0.85)',
          'rgba(111,168,166,0.55)',
          'rgba(111,168,166,0.85)',
          'rgba(111,168,166,0.75)',
        ],
        borderColor: ['#6FA8A6','#5C9C92','#6FA8A6','#6FA8A6'],
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
          ticks: { color: 'var(--text)', callback: v => '₹' + (v/1000).toFixed(0) + 'k' }
        },
        x: {
          grid: { display: false },
          ticks: { color: 'var(--text)', font: { size: 11 }, maxRotation: 0, minRotation: 0 }
        }
      },
      animation: { duration: 800, easing: 'easeOutQuart' }
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
    renderAnalytics(data.predictions || []);

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
      <td>${p.file_name
        ? `<button onclick='openFileViewer(${JSON.stringify(p.file_name)}, ${JSON.stringify(p.file_data)})'
             style="background:rgba(125,47,47,0.18);border:1px solid rgba(125,47,47,0.35);color:var(--green);border-radius:6px;padding:3px 10px;font-size:0.75rem;cursor:pointer">
             📎 ${p.file_name}</button>`
        : '<span style="color:var(--text-dim);font-size:0.78rem">—</span>'}
      </td>
    </tr>
  `).join('');
}

// ── Analytics ───────────────────────────────────────────────────
let trendChartInst = null, donutChartInst = null;
let allHistoryPreds = [];
let analyticsMode = 'current';

function setAnalyticsMode(mode) {
  analyticsMode = mode;
  document.querySelectorAll('[id^="modeBtn-"]').forEach(b => b.classList.remove('active'));
  document.getElementById('modeBtn-' + mode).classList.add('active');
  document.getElementById('comparePickerWrap').style.display = mode === 'compare' ? 'flex' : 'none';
  refreshAnalytics();
}

function refreshAnalytics() {
  renderAnalytics(allHistoryPreds);
}

function renderAnalytics(preds) {
  allHistoryPreds = preds;
  const total = preds.length;
  document.getElementById('aTotalPred').textContent = total;

  // Populate compare picker (skip index 0 = latest)
  const picker = document.getElementById('comparePicker');
  const prevVal = picker.value;
  picker.innerHTML = '<option value="">— pick a past prediction —</option>';
  preds.slice(1).forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = i + 1;
    opt.textContent = `#${i + 2} — ${new Date(p.created_at).toLocaleDateString()} (${formatINR(p.predicted_savings * USD_TO_INR)})`;
    picker.appendChild(opt);
  });
  if (prevVal) picker.value = prevVal;

  if (!total) return;

  if (analyticsMode === 'current') {
    renderCurrentMode(preds);
  } else if (analyticsMode === 'history') {
    renderHistoryMode(preds);
  } else {
    renderCompareMode(preds);
  }
}

// ─ Current: show latest prediction only
function renderCurrentMode(preds) {
  const p = preds[0];
  if (!p) return;
  const inc = p.income * USD_TO_INR;
  const exp = p.total_expenses * USD_TO_INR;
  const sav = p.predicted_savings * USD_TO_INR;
  const goal = p.savings_goal * USD_TO_INR;

  document.getElementById('aAvgIncome').textContent = formatINR(inc);
  document.getElementById('aAvgExp').textContent    = formatINR(exp);
  document.getElementById('aAvgSav').textContent    = formatINR(sav);
  document.getElementById('trendChartLabel').textContent = 'Current Prediction Breakdown';

  // Bar chart for current
  const tCtx = document.getElementById('trendChart').getContext('2d');
  if (trendChartInst) trendChartInst.destroy();
  trendChartInst = new Chart(tCtx, {
    type: 'bar',
    data: {
      labels: [['Income'], ['Expenses'], ['Predicted','Savings'], ['Savings','Goal']],
      datasets: [{ label: 'Current', data: [inc, exp, Math.max(sav,0), goal],
        backgroundColor: ['rgba(111,168,166,0.85)','rgba(111,168,166,0.55)','rgba(111,168,166,0.85)','rgba(111,168,166,0.75)'],
        borderColor: ['#6FA8A6','#5C9C92','#6FA8A6','#6FA8A6'], borderWidth: 1.5, borderRadius: 6 }]
    },
    options: { responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{ y:{ grid:{color:'rgba(255,255,255,0.05)'}, ticks:{color:'var(--text)', callback:v=>'\u20b9'+(v/1000).toFixed(0)+'k'} }, x:{grid:{display:false}, ticks:{color:'var(--text)', maxRotation:0}} },
      animation:{duration:800,easing:'easeOutQuart'} }
  });

  renderDonut([p]);
  renderBudgetHealth(p);
}

// ─ History: trend line across all predictions
function renderHistoryMode(preds) {
  const total = preds.length;
  const avgInc = preds.reduce((s,p)=>s+p.income,0)/total*USD_TO_INR;
  const avgExp = preds.reduce((s,p)=>s+p.total_expenses,0)/total*USD_TO_INR;
  const avgSav = preds.reduce((s,p)=>s+p.predicted_savings,0)/total*USD_TO_INR;
  document.getElementById('aAvgIncome').textContent = formatINR(avgInc);
  document.getElementById('aAvgExp').textContent    = formatINR(avgExp);
  document.getElementById('aAvgSav').textContent    = formatINR(avgSav);
  document.getElementById('trendChartLabel').textContent = 'Savings Trend (last 10)';

  const recent = [...preds].reverse().slice(0,10);
  const labels = recent.map((_,i)=>`#${i+1}`);
  const tCtx = document.getElementById('trendChart').getContext('2d');
  if (trendChartInst) trendChartInst.destroy();
  trendChartInst = new Chart(tCtx, {
    type: 'line',
    data: { labels, datasets: [
      { label:'Income',   data:recent.map(p=>+(p.income*USD_TO_INR).toFixed(0)),   borderColor:'#6FA8A6', backgroundColor:'rgba(111,168,166,0.16)', tension:0.4, fill:true, pointRadius:4, pointBackgroundColor:'#6FA8A6' },
      { label:'Expenses', data:recent.map(p=>+(p.total_expenses*USD_TO_INR).toFixed(0)), borderColor:'#5C9C92', backgroundColor:'rgba(92,156,146,0.08)',  tension:0.4, fill:true, pointRadius:4, pointBackgroundColor:'#5C9C92' },
      { label:'Savings',  data:recent.map(p=>+(p.predicted_savings*USD_TO_INR).toFixed(0)), borderColor:'#3A7B72', backgroundColor:'rgba(58,123,114,0.15)', tension:0.4, fill:true, pointRadius:4, pointBackgroundColor:'#3A7B72' },
    ]},
    options:{ responsive:true, maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      plugins:{legend:{labels:{color:'var(--text)',font:{size:11},boxWidth:12}}},
      scales:{ y:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'var(--text)',callback:v=>'\u20b9'+(v/1000).toFixed(0)+'k'}}, x:{grid:{display:false},ticks:{color:'var(--text)'}} },
      animation:{duration:900,easing:'easeOutQuart'} }
  });

  renderDonut(preds);
  renderBudgetHealth(preds[0]);
}

// ─ Compare: current vs selected past — grouped bar
function renderCompareMode(preds) {
  const curr = preds[0];
  if (!curr) return;
  const idx = parseInt(document.getElementById('comparePicker').value);
  const prev = !isNaN(idx) ? preds[idx] : null;

  document.getElementById('aAvgIncome').textContent = formatINR(curr.income * USD_TO_INR);
  document.getElementById('aAvgExp').textContent    = formatINR(curr.total_expenses * USD_TO_INR);
  document.getElementById('aAvgSav').textContent    = formatINR(curr.predicted_savings * USD_TO_INR);
  document.getElementById('trendChartLabel').textContent = prev
    ? `Current vs #${idx+1} (${new Date(prev.created_at).toLocaleDateString()})`
    : 'Current — select a past prediction to compare';

  const labels = [['Income'],['Expenses'],['Predicted','Savings'],['Savings','Goal']];
  const currData = [curr.income, curr.total_expenses, Math.max(curr.predicted_savings,0), curr.savings_goal].map(v=>v*USD_TO_INR);
  const prevData = prev ? [prev.income, prev.total_expenses, Math.max(prev.predicted_savings,0), prev.savings_goal].map(v=>v*USD_TO_INR) : [];

  const tCtx = document.getElementById('trendChart').getContext('2d');
  if (trendChartInst) trendChartInst.destroy();

  const datasets = [
    { label:'Current', data:currData, backgroundColor:'rgba(111,168,166,0.85)', borderColor:'#6FA8A6', borderWidth:1.5, borderRadius:5 }
  ];
  if (prev) datasets.push(
    { label:`Past #${idx+1}`, data:prevData, backgroundColor:'rgba(92,156,146,0.6)', borderColor:'#5C9C92', borderWidth:1.5, borderRadius:5 }
  );

  trendChartInst = new Chart(tCtx, {
    type:'bar',
    data:{ labels, datasets },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'var(--text)',font:{size:11},boxWidth:12}}},
      scales:{ y:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'var(--text)',callback:v=>'\u20b9'+(v/1000).toFixed(0)+'k'}}, x:{grid:{display:false},ticks:{color:'var(--text)',maxRotation:0}} },
      animation:{duration:800,easing:'easeOutQuart'} }
  });

  renderDonut(prev ? [curr, prev] : [curr]);
  renderBudgetHealth(curr, prev);
}

// ─ Shared: doughnut
function renderDonut(preds) {
  const total = preds.length;
  const avgFixed    = preds.reduce((s,p)=>s+(p.total_expenses*0.6),0)/total*USD_TO_INR;
  const avgVariable = preds.reduce((s,p)=>s+(p.total_expenses*0.4),0)/total*USD_TO_INR;
  const avgSav      = Math.max(preds.reduce((s,p)=>s+p.predicted_savings,0)/total*USD_TO_INR, 0);
  const dCtx = document.getElementById('donutChart').getContext('2d');
  if (donutChartInst) donutChartInst.destroy();
  donutChartInst = new Chart(dCtx, {
    type:'doughnut',
    data:{ labels:['Fixed Exp','Variable Exp','Savings'],
      datasets:[{ data:[avgFixed,avgVariable,avgSav],
        backgroundColor:['rgba(111,168,166,0.85)','rgba(92,156,146,0.75)','rgba(58,123,114,0.75)'],
        borderColor:['#6FA8A6','#5C9C92','#3A7B72'], borderWidth:1.5, hoverOffset:8 }] },
    options:{ responsive:true, maintainAspectRatio:false, cutout:'68%',
      plugins:{legend:{position:'bottom',labels:{color:'var(--text)',font:{size:11},boxWidth:12,padding:14}}},
      animation:{duration:900,easing:'easeOutQuart'} }
  });
}

// ─ Shared: budget health bars (optionally show diff vs prev)
function renderBudgetHealth(curr, prev) {
  if (!curr) return;
  const inc  = curr.income * USD_TO_INR;
  const exp  = curr.total_expenses * USD_TO_INR;
  const sav  = curr.predicted_savings * USD_TO_INR;
  const goal = curr.savings_goal * USD_TO_INR;
  const expRatio  = Math.min((exp/inc)*100, 100);
  const savRatio  = Math.min((Math.max(sav,0)/inc)*100, 100);
  const goalRatio = Math.min((Math.max(sav,0)/Math.max(goal,1))*100, 100);

  const diff = (curr, prev, key, divisor) => {
    if (!prev) return '';
    const d = ((curr[key] - prev[key]) / Math.max(prev[key],1) * 100);
    const sign = d >= 0 ? '+' : '';
    const col  = key === 'total_expenses' ? (d > 0 ? 'var(--danger)' : 'var(--success)') : (d >= 0 ? 'var(--success)' : 'var(--danger)');
    return `<span style="font-size:0.75rem;color:${col};margin-left:6px">${sign}${d.toFixed(1)}% vs prev</span>`;
  };

  document.getElementById('budgetHealth').innerHTML = `
    <div class="bh-row">
      <div class="bh-label"><span>Expense Ratio${diff(curr,prev,'total_expenses')}</span><span style="color:${expRatio>70?'var(--danger)':'var(--success)'}">${expRatio.toFixed(1)}%</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${expRatio}%;background:${expRatio>70?'linear-gradient(90deg,#7d2f2f,#6b2121)':'linear-gradient(90deg,#6FA8A6,#5C9C92)'}"></div></div>
    </div>
    <div class="bh-row">
      <div class="bh-label"><span>Savings Rate${diff(curr,prev,'predicted_savings')}</span><span style="color:${savRatio>=20?'var(--success)':'var(--warning)'}">${savRatio.toFixed(1)}%</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${savRatio}%;background:linear-gradient(90deg,#6FA8A6,#4B8D84)"></div></div>
    </div>
    <div class="bh-row">
      <div class="bh-label"><span>Goal Achievement</span><span style="color:${goalRatio>=100?'var(--success)':'var(--warning)'}">${goalRatio.toFixed(1)}%</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${goalRatio}%;background:linear-gradient(90deg,#6FA8A6,#8EC5C0)"></div></div>
    </div>
  `;
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

// ── File Import ────────────────────────────────────────────────────
function handleFileImport(input, type) {
  const file = input.files[0];
  const status = document.getElementById('importStatus');
  if (!file) return;
  status.textContent = 'Reading...';

  const KEYS = ['income', 'fixed_expenses', 'variable_expenses', 'savings_goal', 'lifestyle_score'];
  const IDS  = ['income', 'fixedExp', 'varExp', 'savingsGoal', 'lifestyle'];

  function applyValues(vals, allRows) {
    if (!vals || vals.length < 5) { status.textContent = '⚠️ Need 5 values: income, fixed_expenses, variable_expenses, savings_goal, lifestyle_score'; return; }
    IDS.forEach((id, i) => { document.getElementById(id).value = vals[i]; });
    document.getElementById('lifestyleLabel').textContent = parseFloat(vals[4]).toFixed(1);
    fileImported = true;
    lastFileSnapshot = { name: file.name, rows: allRows || [vals] };
    ['incomeOptTag','fixedOptTag','varOptTag'].forEach(id => document.getElementById(id).style.display = 'inline');
    document.getElementById('fileChipName').textContent = file.name;
    document.getElementById('fileChip').style.display = 'flex';
    status.textContent = '';
    input.value = '';
  }

  // Zero out the three optional fields immediately on file attach
  document.getElementById('income').value = 0;
  document.getElementById('fixedExp').value = 0;
  document.getElementById('varExp').value = 0;

  const reader = new FileReader();

  if (type === 'excel') {
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (rows.length >= 2 && typeof rows[0][0] === 'string') {
          const headers = rows[0].map(h => String(h).toLowerCase().trim().replace(/ /g,'_'));
          const dataRow = rows[1];
          const vals = KEYS.map(k => { const i = headers.indexOf(k); return i >= 0 ? dataRow[i] : undefined; });
          if (vals.every(v => v !== undefined)) return applyValues(vals, rows);
        }
        applyValues(rows[0], rows);
      } catch(err) { status.textContent = '⚠️ Could not parse Excel: ' + err.message; }
    };
    reader.readAsArrayBuffer(file);
  } else {
    reader.onload = e => {
      try {
        const text = e.target.result.trim();
        const allLines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const allRows = allLines.map(l => l.split(',').map(v => v.trim()));
        const commaVals = allRows[0];
        if (commaVals.length >= 5 && commaVals.every(v => !isNaN(v))) return applyValues(commaVals, allRows);
        const map = {};
        allLines.forEach(line => {
          const [k, v] = line.split(/[=:]/).map(s => s.trim().toLowerCase().replace(/ /g,'_'));
          if (k && v && !isNaN(v)) map[k] = v;
        });
        const vals = KEYS.map(k => map[k]);
        if (vals.every(v => v !== undefined)) return applyValues(vals, allLines.map(l => [l]));
        const lines = allLines.filter(l => !isNaN(l));
        applyValues(lines, allRows);
      } catch(err) { status.textContent = '⚠️ Could not parse file: ' + err.message; }
    };
    reader.readAsText(file);
  }
}

function cancelFileImport() {
  fileImported = false;
  lastFileSnapshot = null;
  ['incomeOptTag','fixedOptTag','varOptTag'].forEach(id => document.getElementById(id).style.display = 'none');
  document.getElementById('fileChip').style.display = 'none';
  document.getElementById('fileChipName').textContent = '';
  document.getElementById('importStatus').textContent = '';
  document.getElementById('importExcel').value = '';
  document.getElementById('importNote').value = '';
  ['income','fixedExp','varExp','savingsGoal'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('lifestyle').value = 5;
  document.getElementById('lifestyleLabel').textContent = '5.0';
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
      // flat array of strings (note/txt lines)
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

async function downloadReport() {
  if (!lastResult) return;
  const income = parseFloat(document.getElementById('income').value);
  const fixed = parseFloat(document.getElementById('fixedExp').value);
  const variable = parseFloat(document.getElementById('varExp').value);
  const goal = parseFloat(document.getElementById('savingsGoal').value);
  const lifestyle = parseFloat(document.getElementById('lifestyle').value);

  try {
    const res = await fetch(`${API}/predictions/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token() },
      body: JSON.stringify({
        input: { income, fixed_expenses: fixed, variable_expenses: variable,
                 total_expenses: fixed + variable, savings_goal: goal, lifestyle_score: lifestyle },
        prediction: lastResult,
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
  fileImported = false;
  lastFileSnapshot = null;
  ['incomeOptTag','fixedOptTag','varOptTag'].forEach(id => document.getElementById(id).style.display = 'none');
  document.getElementById('fileChip').style.display = 'none';
  document.getElementById('fileChipName').textContent = '';
  document.getElementById('importStatus').textContent = '';
  document.getElementById('importExcel').value = '';
  document.getElementById('importNote').value = '';
  lastResult = null;
  if (resultChartInst) { resultChartInst.destroy(); resultChartInst = null; }
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

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarBackdrop')?.classList.remove('show');
}



