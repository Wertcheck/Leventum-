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
    html.classList.remove('modal-open');
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
