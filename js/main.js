(function () {
  'use strict';

  var header = document.querySelector('.site-header');
  var nav = document.getElementById('main-nav');
  var toggle = document.querySelector('.nav-toggle');

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- Mobile Navigation ---------- */
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
  }
  toggle.addEventListener('click', function () {
    setMenu(toggle.getAttribute('aria-expanded') !== 'true');
  });
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      setMenu(false);
      toggle.focus();
    }
  });

  /* ---------- Anker: Fokus auf das Ziel setzen (Tastatur / Screenreader) ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#') return;
    var target = document.getElementById(a.getAttribute('href').slice(1));
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    setTimeout(function () { target.focus({ preventScroll: true }); }, 0);
  });

  /* ---------- Bewegung: Reveal, Parallax, Sticky-CTA (nur ohne reduzierte Bewegung) ---------- */
  var motionOK = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
  var py = 0;
  if (motionOK && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('reveal-on');
    var sel = '.model-panel, .section-head, .card, .process li, .type-card, .service-list li, .expertise-figure, .table-wrap, .legal-note, .accordion, .form-card, .contact-card, .matrix-block .section-head';
    var els = document.querySelectorAll(sel);
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        rio.unobserve(el);
        el.classList.add('is-in');
        setTimeout(function () { el.classList.remove('rv'); }, 2000); // danach wieder normale Hover-Transitions
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) {
      var i = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.style.setProperty('--d', Math.min(i, 5) * 80 + 'ms');
      el.classList.add('rv');
      rio.observe(el);
    });
  }
  var figure = document.querySelector('.hero-figure');
  var sticky = document.querySelector('.sticky-cta');
  var heroBtns = document.querySelector('.hero .btn-row');
  var contactSec = document.getElementById('kontakt');
  function frame() {
    if (motionOK && figure) figure.style.setProperty('--py', Math.min(scrollY, 700) * 0.07 + 'px');
    if (sticky && heroBtns && contactSec) {
      var pastHero = heroBtns.getBoundingClientRect().bottom < 0;
      var inContact = contactSec.getBoundingClientRect().top < innerHeight * 0.85;
      var menuOpen = nav.classList.contains('is-open');
      sticky.classList.toggle('is-shown', pastHero && !inContact && !menuOpen);
    }
  }

  /* ---------- Scroll-Fortschritt ---------- */
  var ticking = false;
  function progress() {
    var max = document.documentElement.scrollHeight - innerHeight;
    header.style.setProperty('--progress', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0);
    frame();
    ticking = false;
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(progress); } }, { passive: true });
  progress();

  /* ---------- Aktiver Navigationspunkt ---------- */
  var links = Array.prototype.slice.call(nav.querySelectorAll('ul a'));
  var map = {};
  links.forEach(function (l) { map[l.getAttribute('href').slice(1)] = l; });
  // Abschnitte ohne eigenen Menüpunkt werden dem passenden Punkt zugeordnet
  var alias = { modell: 'ueberblick', vereinbarungen: 'zusammenarbeit', kontakt: null };
  function setActive(id) {
    var key = id in alias ? alias[id] : id;
    links.forEach(function (l) { l.removeAttribute('aria-current'); });
    if (key && map[key]) map[key].setAttribute('aria-current', 'true');
  }
  if ('IntersectionObserver' in window) {
    var sections = Array.prototype.slice.call(document.querySelectorAll('main > section[id]'));
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setActive(en.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---------- FAQ-Accordion ---------- */
  document.querySelectorAll('[data-accordion] .acc-trigger').forEach(function (btn) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      panel.classList.toggle('is-open', !open);
    });
  });

  /* ---------- Immobilientyp aus Karten vorauswählen ---------- */
  var typeSelect = document.getElementById('f-type');
  document.querySelectorAll('a[data-type]').forEach(function (a) {
    a.addEventListener('click', function () { typeSelect.value = a.getAttribute('data-type'); });
  });

  /* ---------- Kontaktformular ----------
     Versand: Setzen Sie data-endpoint am <form> auf eine URL, die JSON per POST
     annimmt (z. B. Formspree, eigenes Backend). Ohne Endpoint läuft das Formular
     im Demo-Modus und versendet NICHTS. */
  var form = document.getElementById('contact-form');
  var status = document.getElementById('form-status');

  function showError(field, msg) {
    var input = form.elements[field];
    var out = document.getElementById('e-' + field);
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', 'e-' + field);
    out.textContent = msg;
    out.hidden = false;
  }
  function clearErrors() {
    form.querySelectorAll('.error').forEach(function (e) { e.hidden = true; e.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach(function (i) { i.removeAttribute('aria-invalid'); });
  }
  function setStatus(kind, text) {
    status.className = 'form-status ' + kind;
    status.textContent = text;
    status.hidden = false;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();
    status.hidden = true;
    var el = form.elements;
    var first = null;
    function fail(f, m) { showError(f, m); if (!first) first = el[f]; }

    if (!el.name.value.trim()) fail('name', 'Bitte geben Sie Ihren Namen an.');
    var mail = el.email.value.trim();
    if (!mail) fail('email', 'Bitte geben Sie Ihre E-Mail-Adresse an.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) fail('email', 'Bitte geben Sie eine gültige E-Mail-Adresse an.');
    if (!el.type.value) fail('type', 'Bitte wählen Sie einen Immobilientyp.');
    if (!el.consent.checked) fail('consent', 'Bitte bestätigen Sie die Datenschutzhinweise.');
    if (first) { first.focus(); return; }

    var endpoint = form.getAttribute('data-endpoint');
    if (!endpoint) {
      setStatus('demo', 'Demo-Modus: Ihre Eingaben sind formal korrekt, wurden aber NICHT versendet, da auf dieser Seite noch kein Versandweg eingerichtet ist. Bitte nutzen Sie die Kontaktdaten, sobald diese hinterlegt sind.');
      return;
    }
    var data = {};
    Array.prototype.forEach.call(el, function (f) {
      if (f.name) data[f.name] = f.type === 'checkbox' ? f.checked : f.value;
    });
    setStatus('demo', 'Anfrage wird gesendet …');
    fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        setStatus('ok', 'Vielen Dank, Ihre Anfrage wurde übermittelt.');
        form.reset();
      })
      .catch(function () {
        setStatus('fail', 'Die Anfrage konnte nicht übermittelt werden. Bitte versuchen Sie es später erneut oder kontaktieren Sie uns direkt.');
      });
  });
})();
