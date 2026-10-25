# LIVENTUM REAL ESTATE – Akquisitionswebsite

Statische Website (HTML/CSS/JS, **keine Abhängigkeiten, kein Build-Schritt**). Zielgruppe: Eigentümer, Bauunternehmer, Bestandshalter.

## Start
```bash
npm start            # http://localhost:8080  (oder: node scripts/serve.mjs 3000)
npm run qa           # E2E-Prüfung mit Playwright, schreibt Screenshots nach qa/screenshots/ (Server muss laufen)
```
Die Seite lässt sich auch auf jedem statischen Hosting ausliefern.

## Struktur
- `index.html` – Seite, SVG-Icon-Sprite, alle Abschnitte
- `css/` – `tokens.css` (Farben, Abstände, Typo), `base.css`, `components.css`, `sections.css`
- `js/main.js` – Navigation, aktiver Menüpunkt, FAQ-Accordion, Formular
- `assets/img/` – Logo, Hero-Foto, **Bildplatzhalter** (`expertise-handwerk.svg`, `objekt-*.svg`)
- `impressum.html`, `datenschutz.html` – Gerüst mit Platzhaltern
- `qa/e2e.mjs`, `qa/screenshots/` – Tests und Screenshots

## Noch einzutragen
- Adresse, Telefon, E-Mail (Kontaktkarte in `index.html`, Impressum, Datenschutz)
- Fotos: `expertise-handwerk` und die drei `objekt-*` Bilder ersetzen (gleicher Dateiname/`src` anpassen, Alt-Text aktualisieren)
- Impressum und Datenschutzerklärung (rechtlich geprüft)

## Formularversand
Ohne Backend läuft das Formular im **Demo-Modus** und versendet nichts (klar gekennzeichnet). Versand aktivieren: `data-endpoint="https://…"` am `<form id="contact-form">` setzen. Das Formular sendet JSON per POST (z. B. Formspree oder eigenes Backend); Erfolg wird nur bei HTTP 2xx gemeldet. Datenschutzerklärung entsprechend ergänzen.

## Vor Veröffentlichung bestätigen
- Schreibweise der Marke: Logo zeigt „LEVENTUM“, Texte verwenden „LIVENTUM“
- Aussagen zu handwerklicher Erfahrung (keine Qualifikationen behauptet), Start mit einer Wohnung, Sicherheiten (Kaution/Bürgschaft) und Weitervermietung durch Rechtsberatung prüfen lassen
