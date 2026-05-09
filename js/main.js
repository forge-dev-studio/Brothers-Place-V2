/* ============================================
   Brother's Place V2 - Shared JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add('js');
  initMobileNav();
  initScrollAnimations();
  initCountUp();
  initStickyHeader();
  initDonateTiers();
  initNewsletterStub();
});

/* --- Mobile Navigation ----------------------- */
function initMobileNav() {
  const toggle = document.querySelector('.header__toggle');
  const nav = document.querySelector('.header__nav');
  if (!toggle || !nav) return;

  function close() {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      close();
      toggle.focus();
    }
  });

  // On nav-link click in mobile, close the menu (unless it's a dropdown trigger)
  nav.querySelectorAll('a:not(.header__dropdown > .header__nav-link)').forEach(a => {
    a.addEventListener('click', () => {
      if (window.innerWidth <= 960) close();
    });
  });
}

/* --- Sticky header state --------------------- */
function initStickyHeader() {
  const header = document.querySelector('.header');
  if (!header) return;

  let ticking = false;
  function update() {
    header.classList.toggle('is-scrolled', window.scrollY > 12);
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  update();
}

/* --- Scroll-triggered fade-up ---------------- */
function initScrollAnimations() {
  const els = document.querySelectorAll('.fade-up');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  els.forEach(el => observer.observe(el));

  // Safety net: if a user prefers reduced motion, scrolls past too fast,
  // or a screenshot tool captures the page before sections enter view,
  // reveal everything after 2.5s so content is never invisible.
  const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(() => {
    els.forEach(el => el.classList.add('is-visible'));
  }, prefersReduce ? 0 : 2500);
}

/* --- Count-up numbers ------------------------ */
function initCountUp() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;
  if (!('IntersectionObserver' in window)) {
    counters.forEach(animateCount);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  counters.forEach(el => observer.observe(el));

  // Safety: if counters never enter view (very short pages, screenshots, etc.)
  // snap them to their final value after 3s.
  setTimeout(() => {
    counters.forEach(el => {
      if (Number.isFinite(parseInt(el.dataset.count, 10))) {
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || '';
        const prefix = el.dataset.prefix || '';
        el.textContent = prefix + target.toLocaleString() + suffix;
      }
    });
  }, 3000);
}

function animateCount(el) {
  const target = parseInt(el.dataset.count, 10);
  if (!Number.isFinite(target)) return; // already counted, or attribute stripped
  const suffix = el.dataset.suffix || '';
  const prefix = el.dataset.prefix || '';
  const duration = 1800;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(eased * target);
    el.textContent = prefix + current.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* --- Donate tier selection ------------------- */
function initDonateTiers() {
  const tiers = document.querySelectorAll('.tier-card');
  if (!tiers.length) return;
  tiers.forEach(tier => {
    tier.addEventListener('click', () => {
      tiers.forEach(t => t.classList.remove('is-selected'));
      tier.classList.add('is-selected');
      const amount = tier.dataset.amount;
      const linkBtn = document.querySelector('[data-donate-link]');
      if (linkBtn && amount) {
        linkBtn.href = linkBtn.dataset.baseUrl + (linkBtn.dataset.baseUrl.includes('?') ? '&' : '?') + 'amount=' + amount;
      }
    });
  });
}

/* --- Soft-submit forms (newsletter, apply, volunteer, etc.) ----------- */
function initNewsletterStub() {
  // Any form with data-soft-submit, or known IDs, gets a no-backend
  // "thank you" confirmation in lieu of an actual POST. Backends slot in later.
  const SELECTORS = [
    '[data-soft-submit]',
    '#newsletter-form',
    '#apply-form',
    '#volunteer-form',
    '#church-form',
    '#contact-form',
    '#partners-form',
  ];
  const forms = new Set();
  SELECTORS.forEach(sel => document.querySelectorAll(sel).forEach(f => forms.add(f)));
  if (!forms.size) return;

  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const button = form.querySelector('button[type="submit"], input[type="submit"]');
      const message = form.dataset.successMessage || 'Thank you, we will be in touch.';
      if (button) {
        button.textContent = message;
        button.disabled = true;
      }
      const note = form.querySelector('[data-soft-confirm]');
      if (note) note.hidden = false;
    });
  });
}
