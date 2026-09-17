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
  initForms();
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

/* --- Forms: contact, volunteer, church partners, newsletter ------------ */
// Every form with data-form posts to the shared Forge lead worker, which emails the
// office (recipients live in the worker's NOTIFY_BROTHERS_PLACE). data-form must be one
// of the worker's formLabels keys: contact, volunteer, church, newsletter.
const LEAD_ENDPOINT = 'https://forge-lead-worker.synergycloud.workers.dev/lead?client=brothers-place';

function initForms() {
  rememberVisit();
  document.querySelectorAll('form[data-form]').forEach((form) => {
    const button = form.querySelector('button[type="submit"]');
    // The newsletter's line sits after its one-row form, linked by the form id.
    const status = form.querySelector('[data-form-status]')
      || document.querySelector(`[data-form-status="${form.id}"]`);
    const label = button ? button.textContent : '';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (form.dataset.busy) return;
      form.dataset.busy = '1';

      const data = new FormData(form);
      const payload = { form: form.dataset.form, page: location.pathname, ...visitSource() };
      // Checkbox groups repeat a name, so every value of a name is kept.
      new Set(data.keys()).forEach((key) => {
        payload[key] = data.getAll(key).map((v) => String(v).trim()).filter(Boolean).join(', ');
      });

      if (button) { button.disabled = true; button.textContent = 'Sending...'; }
      setStatus(status, '');
      let outcome = 'error';
      try {
        const res = await fetch(LEAD_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) outcome = 'sent';
        else if (res.status === 422) outcome = 'invalid';
      } catch (err) {
        outcome = 'error';
      }
      delete form.dataset.busy;
      if (button) { button.disabled = false; button.textContent = label; }

      if (outcome === 'sent') {
        form.reset();
        setStatus(status, form.dataset.successMessage || 'Thank you. We will be in touch soon.', 'ok');
      } else if (outcome === 'invalid') {
        setStatus(status, 'Please check your name and email address, then try again.', 'error');
      } else {
        // Never pretend it went through: give them a way to reach us today.
        setStatus(status, 'Sorry, your message did not go through. Please try again, or call ' +
          '<a href="tel:+17065099020">706.509.9020</a> or email ' +
          '<a href="mailto:maloy@brothersplace.org">maloy@brothersplace.org</a>.', 'error');
      }
    });
  });
}

function setStatus(el, html, kind) {
  if (!el) return;
  el.innerHTML = html;
  el.classList.toggle('form-status--ok', kind === 'ok');
  el.classList.toggle('form-status--error', kind === 'error');
}

// The first page of the visit and where the visitor came from, so the email can say
// "Google search" or "Link from facebook.com" even when they filled in a form three pages later.
function rememberVisit() {
  try {
    if (sessionStorage.getItem('bp_landing') !== null) return;
    sessionStorage.setItem('bp_landing', location.pathname + location.search);
    sessionStorage.setItem('bp_referrer', document.referrer || '');
  } catch (err) { /* storage blocked: visitSource falls back to this page */ }
}

function visitSource() {
  let landing = location.pathname + location.search;
  let referrer = document.referrer || '';
  try {
    landing = sessionStorage.getItem('bp_landing') || landing;
    const stored = sessionStorage.getItem('bp_referrer');
    if (stored !== null) referrer = stored;
  } catch (err) { /* use this page */ }

  const params = new URLSearchParams(landing.split('?')[1] || '');
  const attribution = { landing };
  if (referrer) attribution.referrer = referrer.slice(0, 300);
  ['utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'gbraid', 'wbraid', 'fbclid'].forEach((k) => {
    if (params.get(k)) attribution[k] = params.get(k).slice(0, 200);
  });

  let host = '';
  try { host = referrer ? new URL(referrer).hostname.replace(/^www\./, '') : ''; } catch (err) { host = ''; }
  if (host === location.hostname.replace(/^www\./, '')) host = '';

  let source = 'Direct visit';
  if (attribution.gclid || attribution.gbraid || attribution.wbraid) source = 'Google Ads';
  else if (attribution.fbclid) source = 'Facebook or Instagram';
  else if (attribution.utm_source) source = `Link tagged ${attribution.utm_source}`;
  else if (/(^|\.)google\./.test(host)) source = 'Google search';
  else if (/(^|\.)(bing|duckduckgo|yahoo)\./.test(host)) source = `Search (${host})`;
  else if (host) source = `Link from ${host}`;
  return { source, attribution };
}
