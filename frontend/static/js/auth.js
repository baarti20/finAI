// FinAI Auth JS
const API = '/api';

// ── UI helpers ─────────────────────────────────────────────────────
function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg; el.classList.add('show');
  document.getElementById('successMsg').classList.remove('show');
}
function showSuccess(msg) {
  const el = document.getElementById('successMsg');
  el.textContent = msg; el.classList.add('show');
  document.getElementById('errorMsg').classList.remove('show');
}
function setLoading(on) {
  const btn = document.getElementById('loginBtn') || document.getElementById('registerBtn');
  const spin = document.getElementById('spin');
  const text = document.getElementById('btnText');
  if (!btn) return;
  btn.disabled = on;
  spin.style.display = on ? 'inline-block' : 'none';
  text.style.opacity = on ? '0.6' : '1';
}

function setFieldState(input, hint, msg, ok) {
  input.style.borderColor = msg ? (ok ? 'var(--green)' : 'var(--danger)') : '';
  input.style.boxShadow   = msg ? (ok ? '0 0 0 3px rgba(0,212,170,0.15)' : '0 0 0 3px rgba(239,68,68,0.15)') : '';
  if (hint) { hint.textContent = msg; hint.style.color = ok ? 'var(--green)' : 'var(--danger)'; }
}

function togglePwd(id, btn) {
  const inp = document.getElementById(id);
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  btn.textContent = show ? '🙈' : '👁';
}

// ── Validators ─────────────────────────────────────────────────────
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function pwdStrength(pwd) {
  let score = 0;
  if (pwd.length >= 6)  score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score; // 0-5
}

function updateStrengthBar(pwd) {
  const fill = document.getElementById('pwdStrengthFill');
  if (!fill) return;
  const s = pwdStrength(pwd);
  const pct = (s / 5) * 100;
  const color = s <= 1 ? '#ef4444' : s <= 3 ? '#f59e0b' : '#00d4aa';
  fill.style.width = pct + '%';
  fill.style.background = color;
}

// ── Login field validation ─────────────────────────────────────────
function validateLoginField(input, type) {
  const hint = document.getElementById(type === 'email' ? 'emailHint' : 'passwordHint');
  if (type === 'email') {
    const v = input.value.trim();
    if (!v) return setFieldState(input, hint, '', false);
    setFieldState(input, hint, emailRe.test(v) ? '✓ Valid email' : 'Enter a valid email address', emailRe.test(v));
  }
  if (type === 'password') {
    const v = input.value;
    if (!v) return setFieldState(input, hint, '', false);
    setFieldState(input, hint, v.length >= 6 ? '✓ Looks good' : 'At least 6 characters required', v.length >= 6);
  }
}

// ── Register field validation ──────────────────────────────────────
function validateField(input, type) {
  const hints = { username: 'usernameHint', email: 'emailHint', password: 'passwordHint', confirm: 'confirmHint' };
  const hint = document.getElementById(hints[type]);

  if (type === 'fullName') {
    const v = input.value.trim();
    if (!v) return setFieldState(input, hint, '', false);
    const ok = v.length >= 2;
    setFieldState(input, hint, ok ? '✓ Looks good' : 'Enter your full name', ok);
  }
  if (type === 'username') {
    const v = input.value.trim();
    if (!v) return setFieldState(input, hint, '', false);
    const ok = v.length >= 3 && /^[a-zA-Z0-9_]+$/.test(v);
    setFieldState(input, hint, ok ? '✓ Valid username' : 'Min 3 chars, letters/numbers/underscore only', ok);
  }
  if (type === 'email') {
    const v = input.value.trim();
    if (!v) return setFieldState(input, hint, '', false);
    setFieldState(input, hint, emailRe.test(v) ? '✓ Valid email' : 'Enter a valid email address', emailRe.test(v));
  }
  if (type === 'password') {
    const v = input.value;
    updateStrengthBar(v);
    if (!v) return setFieldState(input, hint, '', false);
    const s = pwdStrength(v);
    const labels = ['', 'Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
    const ok = v.length >= 6;
    setFieldState(input, hint, ok ? `${labels[s] || 'Fair'} password` : 'At least 6 characters required', ok);
    // Re-validate confirm if already filled
    const conf = document.getElementById('confirmPassword');
    if (conf && conf.value) validateField(conf, 'confirm');
  }
  if (type === 'phone') {
    const v = input.value.trim();
    if (!v) return setFieldState(input, hint, '', false);
    const ok = /^[0-9]{10}$/.test(v);
    setFieldState(input, hint, ok ? '✓ Valid phone number' : 'Enter a 10-digit phone number', ok);
  }
  if (type === 'confirm') {
    const pwd = document.getElementById('password')?.value;
    const v = input.value;
    if (!v) return setFieldState(input, hint, '', false);
    setFieldState(input, hint, v === pwd ? '✓ Passwords match' : 'Passwords do not match', v === pwd);
  }
}

// ── Login ──────────────────────────────────────────────────────────
async function doLogin() {
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) return showError('Please enter email and password.');
  if (!emailRe.test(email)) return showError('Enter a valid email address.');
  if (password.length < 6)  return showError('Password must be at least 6 characters.');

  setLoading(true);
  try {
    const res  = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return showError(data.error || 'Login failed.');

    localStorage.setItem('finai_token', data.token);
    localStorage.setItem('finai_user', JSON.stringify({ username: data.username, role: data.role, email: data.email }));
    showSuccess('Login successful! Redirecting...');
    setTimeout(() => { window.location.href = data.role === 'admin' ? '/admin' : '/dashboard'; }, 800);
  } catch (e) {
    showError('Network error. Please try again.');
  } finally {
    setLoading(false);
  }
}

// ── Register ───────────────────────────────────────────────────────────────────
async function doRegister() {
  const fullName = document.getElementById('fullName')?.value.trim();
  const username = document.getElementById('username')?.value.trim();
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirm  = document.getElementById('confirmPassword')?.value;
  const dob      = document.getElementById('dob')?.value;
  const phone    = document.getElementById('phone')?.value.trim();
  const gender   = document.getElementById('gender')?.value;
  const city     = document.getElementById('city')?.value.trim();

  if (!fullName || !username || !email || !password || !confirm)
    return showError('All fields are required.');
  if (fullName.length < 2)
    return showError('Please enter your full name.');
  if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username))
    return showError('Username: min 3 chars, letters/numbers/underscore only.');
  if (!emailRe.test(email)) return showError('Enter a valid email address.');
  if (password.length < 6)  return showError('Password must be at least 6 characters.');
  if (password !== confirm)  return showError('Passwords do not match.');
  if (!dob) return showError('Date of birth is required for account recovery.');
  if (phone && !/^[0-9]{10}$/.test(phone)) return showError('Enter a valid 10-digit phone number.');

  setLoading(true);
  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, username, email, password, dob, phone, gender, city })
    });
    const data = await res.json();
    if (!res.ok) return showError(data.error || 'Registration failed.');

    showSuccess('Account created! Redirecting to login...');
    setTimeout(() => { window.location.href = '/login'; }, 800);
  } catch (e) {
    showError('Network error. Please try again.');
  } finally {
    setLoading(false);
  }
}

// ── Forgot Password Modal ──────────────────────────────────────────────────
let _fpEmail = '', _fpDob = '';

function openForgotModal() {
  _fpEmail = ''; _fpDob = '';
  ['fpStep1','fpStep2','fpStep3'].forEach((id,i) => document.getElementById(id).style.display = i===0?'block':'none');
  ['fpEmail','fpDob','fpNewPwd','fpConfirmPwd'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  fpClearMsgs();
  document.getElementById('forgotOverlay').style.display = 'flex';
}
function closeForgotModal() {
  document.getElementById('forgotOverlay').style.display = 'none';
}
function fpClearMsgs() {
  document.getElementById('fpError').classList.remove('show');
  document.getElementById('fpSuccess').classList.remove('show');
}
function fpShowError(msg) {
  const el = document.getElementById('fpError');
  el.textContent = msg; el.classList.add('show');
  document.getElementById('fpSuccess').classList.remove('show');
}
function fpShowSuccess(msg) {
  const el = document.getElementById('fpSuccess');
  el.textContent = msg; el.classList.add('show');
  document.getElementById('fpError').classList.remove('show');
}
function fpSetLoading(step, on) {
  const spin = document.getElementById('fpSpin'+step);
  const text = document.getElementById('fpBtn'+step+'Text');
  if (spin) spin.style.display = on ? 'inline-block' : 'none';
  if (text) text.style.opacity = on ? '0.6' : '1';
}

async function fpVerifyEmail() {
  const email = document.getElementById('fpEmail').value.trim();
  if (!emailRe.test(email)) return fpShowError('Enter a valid email address.');
  fpSetLoading(1, true); fpClearMsgs();
  try {
    const res = await fetch(`${API}/auth/verify-dob`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, dob: '1900-01-01' })
    });
    if ((await res.json()).error === 'No account found with that email' || res.status === 404)
      return fpShowError('No account found with that email.');
    _fpEmail = email;
    document.getElementById('fpStep1').style.display = 'none';
    document.getElementById('fpStep2').style.display = 'block';
    fpClearMsgs();
  } catch(e) { fpShowError('Network error.'); }
  finally { fpSetLoading(1, false); }
}

async function fpVerifyDob() {
  const dob = document.getElementById('fpDob').value;
  if (!dob) return fpShowError('Please enter your date of birth.');
  fpSetLoading(2, true); fpClearMsgs();
  try {
    const res = await fetch(`${API}/auth/verify-dob`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: _fpEmail, dob })
    });
    const data = await res.json();
    if (!res.ok) return fpShowError(data.error || 'Verification failed.');
    _fpDob = dob;
    document.getElementById('fpStep2').style.display = 'none';
    document.getElementById('fpStep3').style.display = 'block';
    fpClearMsgs();
  } catch(e) { fpShowError('Network error.'); }
  finally { fpSetLoading(2, false); }
}

function updateStrengthBar2(pwd) {
  const fill = document.getElementById('fpStrengthFill');
  if (!fill) return;
  const s = pwdStrength(pwd);
  fill.style.width = (s/5*100) + '%';
  fill.style.background = s<=1?'#ef4444':s<=3?'#f59e0b':'#00d4aa';
}

async function fpResetPassword() {
  const pwd    = document.getElementById('fpNewPwd').value;
  const confirm = document.getElementById('fpConfirmPwd').value;
  if (pwd.length < 6)  return fpShowError('Password must be at least 6 characters.');
  if (pwd !== confirm) return fpShowError('Passwords do not match.');
  fpSetLoading(3, true); fpClearMsgs();
  try {
    const res = await fetch(`${API}/auth/reset-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: _fpEmail, dob: _fpDob, password: pwd })
    });
    const data = await res.json();
    if (!res.ok) return fpShowError(data.error || 'Reset failed.');
    fpShowSuccess('✅ Password reset! You can now sign in.');
    setTimeout(closeForgotModal, 2000);
  } catch(e) { fpShowError('Network error.'); }
  finally { fpSetLoading(3, false); }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('forgotOverlay')?.addEventListener('click', e => {
    if (e.target.id === 'forgotOverlay') closeForgotModal();
  });
});

// ── Enter key ──────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (document.getElementById('loginBtn'))    doLogin();
  else if (document.getElementById('registerBtn')) doRegister();
});

// ── Redirect if already logged in ─────────────────────────────────
(function checkAuth() {
  const token = localStorage.getItem('finai_token');
  if (!token) return;
  const u = JSON.parse(localStorage.getItem('finai_user') || '{}');
  const p = window.location.pathname;
  if (p === '/login' || p === '/register')
    window.location.href = u.role === 'admin' ? '/admin' : '/dashboard';
})();
