/* HASHIGOLOGI — script.js */

/* NAV shrink on scroll */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

/* Mobile nav */
const toggle = document.querySelector('.nav-toggle');
const links  = document.querySelector('.nav-links');
if (toggle && links) {
  toggle.addEventListener('click', () => links.classList.toggle('open'));
  links.addEventListener('click', e => {
    if (e.target.tagName === 'A') links.classList.remove('open');
  });
}

/* Hero canvas: floating network */
(function () {
  const cv  = document.getElementById('cv');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let W, H, pts = [];

  function init() {
    W = cv.width  = cv.offsetWidth;
    H = cv.height = cv.offsetHeight;
    pts = [];
    const cols = Math.ceil(W / 88) + 1;
    const rows = Math.ceil(H / 88) + 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        pts.push({ x: c*88, y: r*88, bx: c*88, by: r*88,
          vx: (Math.random()-.5)*.3, vy: (Math.random()-.5)*.3 });
      }
    }
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (Math.abs(p.x - p.bx) > 13) p.vx *= -1;
      if (Math.abs(p.y - p.by) > 13) p.vy *= -1;
    });
    for (let i = 0; i < pts.length; i++) {
      for (let j = i+1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        if (d < 108) {
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = `rgba(59,130,246,${.16*(1-d/108)})`;
          ctx.lineWidth = .5;
          ctx.stroke();
        }
      }
    }
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(184,197,211,.45)';
      ctx.fill();
    });
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', init, { passive: true });
  init(); frame();
})();

/* Fade-in on scroll */
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('on'); obs.unobserve(e.target); }
  });
}, { threshold: 0, rootMargin: '0px 0px -60px 0px' });
document.querySelectorAll('.fi').forEach(el => obs.observe(el));

/* issue-split の子要素は個別に observe（大きい要素対策） */
const obsIssue = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('on'); obsIssue.unobserve(e.target); }
  });
}, { threshold: 0, rootMargin: '0px 0px -80px 0px' });
document.querySelectorAll('.issue-img, .issue-text').forEach(el => obsIssue.observe(el));

/* Smooth scroll */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    window.scrollTo({ top: t.getBoundingClientRect().top + scrollY - 68, behavior: 'smooth' });
  });
});

/* Form (stub) */
const form    = document.getElementById('cform');
const success = document.getElementById('fsuccess');
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    form.style.display = 'none';
    if (success) success.style.display = 'block';
  });
}
