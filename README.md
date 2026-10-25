# LEVENTUM REAL ESTATE – Akquisitionswebsite

Statische Website (HTML/CSS/JS, **keine Abhängigkeiten, kein Build-Schritt**). Zielgruppe: Eigentümer, Bauunternehmer, Bestandshalter.

## Start
```bash
npm start            # http://localhost:8080  (oder: node scripts/serve.mjs 3000)
npm run qa           # E2E-Prüfung mit Playwright, schreibt Screenshots nach qa/screenshots/ (Server muss laufen)
```
Die Seite lässt sich auch auf jedem statischen Hosting ausliefern.

## Veröffentlichen
Vor jedem Push `npm run build` ausführen. Das Skript hängt an alle CSS- und JS-Links einen Inhalts-Hash (`?v=…`). Ohne ihn können Browser und GitHub Pages (Cache ca. 10 Minuten) alte Styles mit neuem HTML mischen, wodurch Bereiche wie der Vorher-Nachher-Slider ungestaltet erscheinen. Der Test `npm run qa` schlägt fehl, wenn die Hashes veraltet sind.

## Struktur
- `index.html` – Seite, SVG-Icon-Sprite, alle Abschnitte
- `css/` – `tokens.css` (Farben, Abstände, Typo), `base.css`, `components.css`, `sections.css`
- `js/main.js` – Navigation, aktiver Menüpunkt, FAQ-Accordion, Formular
- `assets/img/` – Logo und Fotos (Hero, Expertise, Objekttypen)
- `impressum.html`, `datenschutz.html` – Gerüst mit Platzhaltern
- `qa/e2e.mjs`, `qa/screenshots/` – Tests und Screenshots

## Noch einzutragen
- Adresse, Telefon, E-Mail (Kontaktkarte in `index.html`, Impressum, Datenschutz)
- Impressum und Datenschutzerklärung (rechtlich geprüft)

## Gründer-Sektion
Porträts liegen in `assets/img/team/` (Hochformat 4:5, 800×1000 px): `james-bonitzki.jpg` und `attila-attila.jpg`. Zum Austauschen die Datei ersetzen (gleicher Name) oder den `src` im Bereich `<!-- GRÜNDER -->` in `index.html` anpassen. Logos der Stationen von James liegen in `assets/img/partners/`; vor Veröffentlichung Nutzungsrechte klären.

## Social Media
Die Icons im Footer (`.social-link`) haben bewusst noch keinen Link. Zum Aktivieren `href="https://…"` (und `target="_blank" rel="noopener"`) am jeweiligen `<a>` ergänzen. Nicht benötigte Netzwerke entfernen.

## Formularversand
Ohne Backend läuft das Formular im **Demo-Modus** und versendet nichts (klar gekennzeichnet). Versand aktivieren: `data-endpoint="https://…"` am `<form id="contact-form">` setzen. Das Formular sendet JSON per POST (z. B. Formspree oder eigenes Backend); Erfolg wird nur bei HTTP 2xx gemeldet. Datenschutzerklärung entsprechend ergänzen.

## Vor Veröffentlichung bestätigen
- Schreibweise der Marke: Logo zeigt „LEVENTUM“, Texte verwenden „LEVENTUM“
- Aussagen zu handwerklicher Erfahrung (keine Qualifikationen behauptet), Start mit einer Wohnung, Sicherheiten (Kaution/Bürgschaft) und Weitervermietung durch Rechtsberatung prüfen lassen

## Gestaltungsrichtlinien (10K-Checklist)
- **Schriften:** Fraunces (Display) + Manrope (Body), selbst gehostet unter `assets/fonts/` (SIL OFL, Lizenztexte liegen bei). Kein CDN.
- **Farben:** Markenblau `#27446c`, CI-Grau `#d8d2c8`, Weiß plus Grautöne – keine weitere Akzentfarbe (Grün entfernt). Zentral in `css/tokens.css`.
- **Bewegung:** ruhiger Hero-Einstieg, Hover-Mikrointeraktionen, animiertes FAQ, dünner Scroll-Fortschritt im Header. Kein Fade-up-Scrollreveal; alles entfällt bei `prefers-reduced-motion`.
