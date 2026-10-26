(function () {
  'use strict';
  /* Vergleichstabelle: auf kleinen Bildschirmen wählt ein Tab das angezeigte Modell. Ohne JavaScript bleibt die Tabelle komplett (seitlich scrollbar). */
  var wrap = document.querySelector('.cmp-wrap');
  var tabs = document.querySelectorAll('.cmp-tab');
  if (!wrap || !tabs.length) return;
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      wrap.setAttribute('data-active', tab.getAttribute('data-m'));
      tabs.forEach(function (t) { t.setAttribute('aria-pressed', String(t === tab)); });
    });
  });
})();

/* Gemeinsames Dialogfenster: Inhalt wird beim Öffnen aus dem gewählten Modell eingesetzt */
(function () {
  'use strict';
  var dlg = document.getElementById('inv-modal');
  if (!dlg || typeof dlg.showModal !== 'function') {
    // Ohne Dialog-Unterstützung bleiben die Details in den Karten sichtbar
    document.documentElement.classList.remove('js');
    return;
  }
  var body = document.getElementById('inv-modal-body');
  var title = document.getElementById('inv-modal-title');
  var img = dlg.querySelector('.inv-modal-img');
  var cta = dlg.querySelector('[data-modal-cta]');
  var html = document.documentElement;
  var trigger = null;
  var model = '';

  function open(card, btn) {
    trigger = btn;
    model = card.getAttribute('data-model');
    title.textContent = card.getAttribute('data-title').replace('&amp;', '&');
    img.src = card.querySelector('.inv-media img').getAttribute('src');
    body.innerHTML = card.querySelector('.inv-detail').innerHTML;
    body.scrollTop = 0;
    html.classList.add('modal-open');
    dlg.showModal();
  }
  document.querySelectorAll('.inv-card .inv-more').forEach(function (btn) {
    btn.addEventListener('click', function () { open(btn.closest('.inv-card'), btn); });
  });
  dlg.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { dlg.close(); }); });
  // Klick auf den Hintergrund (außerhalb des Fensters) schließt, Klicks im Fenster nicht
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', function () {
    if (!document.querySelector('dialog[open]')) html.classList.remove('modal-open');
    if (trigger) { trigger.focus(); }
  });
  // Beratungsgespräch: Modell im Kontaktformular vorwählen, Dialog schließen, zum Kontakt springen
  cta.addEventListener('click', function () {
    var sel = document.getElementById('f-model');
    if (sel) sel.value = model;
    trigger = null;
    dlg.close();
  });
})();

/* Rechenbeispiele: Pop-up mit Muster- und Beispielzahlen (Quelle: js/rechenbeispiele.js, PDFs: assets/pdf/) */
(function () {
  'use strict';
  var RB = window.LEV_RB;
  var dlg = document.getElementById('calc-modal');
  var mdl = document.getElementById('inv-modal');
  if (!RB || !dlg || !mdl || typeof dlg.showModal !== 'function') return;
  var body = document.getElementById('calc-body');
  var title = document.getElementById('calc-title');
  var pdf = document.getElementById('calc-pdf');
  var html = document.documentElement;
  var cur = '';
  var opener = null;

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function render(m) {
    var out = '<p class="calc-stamp">Muster- und Beispielzahlen – keine Prognose</p><p class="calc-intro">' + esc(m.intro) + '</p>';
    m.blocks.forEach(function (b) {
      out += '<h3>' + esc(b.h) + '</h3><table class="calc-table"><tbody>';
      b.rows.forEach(function (r) { out += '<tr' + (r.kind ? ' class="' + r.kind + '"' : '') + '><th scope="row">' + esc(r.label) + '</th><td>' + esc(r.value) + '</td></tr>'; });
      out += '</tbody></table>';
    });
    out += '<p class="calc-scenario"><strong>Was sich ändern kann:</strong> ' + esc(m.scenario) + '</p>';
    out += '<p class="calc-note">' + esc(m.note) + ' ' + esc(RB.disclaimer) + '</p>';
    return out;
  }
  function open(key, from) {
    var m = RB.data[key];
    if (!m) return;
    cur = key; opener = from;
    title.textContent = m.title;
    body.innerHTML = render(m);
    body.scrollTop = 0;
    pdf.setAttribute('href', 'assets/pdf/' + m.file);
    html.classList.add('modal-open');
    dlg.showModal();
  }

  // Schaltfläche „Rechenbeispiel ansehen“ im Modell-Dialog (neben dem PDF-Link)
  var bodyEl = document.getElementById('inv-modal-body');
  new MutationObserver(function () {
    var box = bodyEl.querySelector('.inv-calc');
    if (!box || box.querySelector('[data-calc-open]')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'btn btn-primary'; b.setAttribute('data-calc-open', ''); b.setAttribute('aria-haspopup', 'dialog');
    b.textContent = 'Rechenbeispiel ansehen';
    box.insertBefore(b, box.querySelector('a'));
  }).observe(bodyEl, { childList: true });
  bodyEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-calc-open]');
    if (!b) return;
    var card = document.querySelector('.inv-card[data-title="' + document.getElementById('inv-modal-title').textContent.replace('&', '&amp;') + '"]') ||
      [].slice.call(document.querySelectorAll('.inv-card')).filter(function (c) { return c.getAttribute('data-title').replace('&amp;', '&') === document.getElementById('inv-modal-title').textContent; })[0];
    if (!card) return;
    var key = card.getAttribute('data-model');
    mdl.close();
    open(key, card.querySelector('.inv-more'));
  });

  dlg.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { dlg.close(); }); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  document.getElementById('calc-back').addEventListener('click', function () {
    var btn = opener;
    opener = null;
    dlg.close();
    if (btn) btn.click();
  });
  dlg.addEventListener('close', function () {
    if (!document.querySelector('dialog[open]')) html.classList.remove('modal-open');
    if (opener) opener.focus();
  });
})();
