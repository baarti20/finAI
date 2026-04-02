// FinAI Landing Page JS

// ── Nav scroll effect ─────────────────────────────────────────────
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
});

// ── Mobile nav toggle ──────────────────────────────────────────────
const toggle = document.getElementById('navToggle');
if (toggle) {
  toggle.addEventListener('click', () => {
    const links = document.querySelector('.nav-links');
    const cta = document.querySelector('.nav-cta');
    if (links) links.style.display = links.style.display === 'flex' ? 'none' : 'flex';
    if (cta) cta.style.display = cta.style.display === 'flex' ? 'none' : 'flex';
  });
}

// ── Counter animation ──────────────────────────────────────────────
function animateCounter(el) {
  const target = parseInt(el.dataset.target);
  const duration = 1500;
  const step = target / (duration / 16);
  let current = 0;
  const interval = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = Math.floor(current).toLocaleString();
    if (current >= target) clearInterval(interval);
  }, 16);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      animateCounter(e.target);
      counterObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-num').forEach(el => counterObserver.observe(el));

// ── Scroll reveal ──────────────────────────────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.animationPlayState = 'running';
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.feature-card, .step, .tech-card').forEach(el => {
  el.style.animationPlayState = 'paused';
  revealObserver.observe(el);
});
