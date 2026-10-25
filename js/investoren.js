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
