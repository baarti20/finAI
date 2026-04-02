// FinAI Auth JS

const API = '/api';

function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.classList.add('show');
  document.getElementById('successMsg').classList.remove('show');
}

function showSuccess(msg) {
  const el = document.getElementById('successMsg');
  el.textContent = msg;
  el.classList.add('show');
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

async function doLogin() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || !password) return showError('Please enter email and password');

  setLoading(true);
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return showError(data.error || 'Login failed');

    localStorage.setItem('finai_token', data.token);
    localStorage.setItem('finai_user', JSON.stringify({ username: data.username, role: data.role, email: data.email }));
    showSuccess('Login successful! Redirecting...');
    setTimeout(() => {
      window.location.href = data.role === 'admin' ? '/admin' : '/dashboard';
    }, 800);
  } catch (e) {
    showError('Network error. Please try again.');
  } finally {
    setLoading(false);
  }
}

async function doRegister() {
  const username = document.getElementById('username')?.value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!username || !email || !password) return showError('All fields are required');
  if (password.length < 6) return showError('Password must be at least 6 characters');

  setLoading(true);
  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (!res.ok) return showError(data.error || 'Registration failed');

    localStorage.setItem('finai_token', data.token);
    localStorage.setItem('finai_user', JSON.stringify({ username: data.username, role: data.role }));
    showSuccess('Account created! Redirecting...');
    setTimeout(() => { window.location.href = '/dashboard'; }, 800);
  } catch (e) {
    showError('Network error. Please try again.');
  } finally {
    setLoading(false);
  }
}

// Allow Enter key
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (document.getElementById('loginBtn')) doLogin();
    else if (document.getElementById('registerBtn')) doRegister();
  }
});

// Redirect if already logged in
(function checkAuth() {
  const token = localStorage.getItem('finai_token');
  if (token) {
    const user = JSON.parse(localStorage.getItem('finai_user') || '{}');
    if (window.location.pathname === '/login' || window.location.pathname === '/register') {
      window.location.href = user.role === 'admin' ? '/admin' : '/dashboard';
    }
  }
})();
