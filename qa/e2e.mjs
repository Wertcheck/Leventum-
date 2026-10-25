// E2E-Prüfung: node qa/e2e.mjs  (Server muss auf http://localhost:8080 laufen; BASE_URL überschreibbar)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:8080';
const SHOTS = new URL('./screenshots/', import.meta.url).pathname;
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? ' – ' + info : ''}`); };

const lum = (c) => { const [r, g, b] = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
const rgb = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number);

const browser = await chromium.launch();
const consoleIssues = [];
async function open(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) consoleIssues.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', e => consoleIssues.push('pageerror: ' + e.message));
  page.on('requestfailed', r => consoleIssues.push('requestfailed: ' + r.url()));
  await page.goto(BASE + '/');
  await page.waitForTimeout(1800); // Einstiegsanimation abwarten
  return page;
}
const shot = async (page, name, sel) => { await page.waitForTimeout(1300); return sel ? page.locator(sel).screenshot({ path: `${SHOTS}${name}.png` }) : page.screenshot({ path: `${SHOTS}${name}.png` }); };

/* ---------- Desktop ---------- */
let page = await open(1440, 900);
check('Seitentitel', (await page.title()) === 'LIVENTUM REAL ESTATE – Ihr gewerblicher Mietpartner');
check('Genau eine h1', (await page.locator('h1').count()) === 1);
check('Meta description + Open Graph', await page.evaluate(() => !!document.querySelector('meta[name=description]')?.content && !!document.querySelector('meta[property="og:title"]')));
check('Logo geladen', await page.locator('.brand img').evaluate(i => i.complete && i.naturalWidth > 0));
check('Hero-Bild geladen, ohne lazy', await page.locator('.hero-figure img').evaluate(i => i.complete && i.naturalWidth > 0 && i.loading !== 'lazy'));
check('Bilder unterhalb des Hero nutzen lazy loading', await page.evaluate(() => [...document.querySelectorAll('main img')].filter(i => !i.closest('.hero')).every(i => i.loading === 'lazy')));
check('Alle Bilder haben alt-Text', await page.evaluate(() => [...document.images].every(i => i.alt.trim())));
check('Rent-to-Rent-Panel: Titel, 3 Beteiligte, 2 Mietverträge', /Rent-to-Rent/i.test(await page.locator('#model-title').innerText()) && (await page.locator('.flow .node').count()) === 3 && (await page.locator('.flow .link-chip').allInnerTexts()).join('|') === 'Mietvertrag 1|Mietvertrag 2');
check('Hero-Rollen sichtbar (Eigentümer/LIVENTUM/Endmieter)', (await page.locator('.flow .node:visible').allTextContents()).join(' ').match(/Eigentümer.*LIVENTUM.*Endmieter/s) !== null);
check('Keine Margen-/Garantie-Aussage im sichtbaren Text', !/marge|rendite|garantiert/i.test(await page.locator('body').innerText()));
await shot(page, '01-hero');

// Navigation: jeder Menüpunkt scrollt zum Abschnitt
for (const l of await page.locator('.main-nav ul a').all()) {
  const href = await l.getAttribute('href'); const label = (await l.innerText()).trim();
  await l.click(); await page.waitForTimeout(900);
  const top = await page.locator(href).evaluate(e => Math.round(e.getBoundingClientRect().top));
  const cur = await page.locator('.main-nav ul a[aria-current="true"]').first().getAttribute('href').catch(() => null);
  check(`Nav „${label}“ scrollt zu ${href}`, top >= 0 && top < 140, `top=${top}`);
  check(`Nav „${label}“ ist aktiv markiert`, cur === href, `aktiv=${cur}`);
}
check('Header bleibt sticky', (await page.locator('.site-header').evaluate(e => e.getBoundingClientRect().top)) === 0);

// CTAs
for (const [sel, target] of [['[data-cta=nav]', '#kontaktformular'], ['[data-cta=hero-primary]', '#kontaktformular'], ['[data-cta=hero-secondary]', '#modell'], ['[data-cta=contact-primary]', '#kontaktformular'], ['[data-cta=contact-secondary]', '#kontaktdaten']]) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const a = page.locator(sel).first();
  const href = await a.getAttribute('href');
  await a.evaluate(e => e.click()); await page.waitForTimeout(2200);
  const exists = await page.locator(target).count();
  const top = exists ? await page.locator(target).evaluate(e => Math.round(e.getBoundingClientRect().top)) : 9999;
  check(`CTA ${sel} → ${target}`, href === target && exists === 1 && top >= 0 && top < 900, `top=${top}`);
}
// Alle internen Anker haben ein Ziel
check('Alle #-Links haben ein Ziel', await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].every(a => a.getAttribute('href') === '#top' || document.getElementById(a.getAttribute('href').slice(1)))));

// Objekt-Buttons wählen Immobilientyp vor
const typeBtns = await page.locator('a[data-type]').all();
let preselect = true;
for (const b of typeBtns) { const t = await b.getAttribute('data-type'); await b.evaluate(e => e.click()); preselect &&= (await page.locator('#f-type').inputValue()) === t; }
check('„Objekt besprechen“ wählt Immobilientyp vor', preselect && typeBtns.length === 3);

// Abschnitts-Screenshots
for (const [n, s] of [['02-modell', '#modell'], ['03-vorteile', '#vorteile'], ['04-expertise', '#expertise'], ['05-verantwortungsmatrix', '#vereinbarungen']]) { await page.locator(s).scrollIntoViewIfNeeded(); await shot(page, n, s); }

// FAQ
const triggers = page.locator('.acc-trigger');
check('FAQ hat 10 Fragen', (await triggers.count()) === 10);
check('FAQ initial geschlossen', await page.evaluate(() => [...document.querySelectorAll('.acc-trigger')].every(b => b.getAttribute('aria-expanded') === 'false' && getComputedStyle(document.getElementById(b.getAttribute('aria-controls'))).visibility === 'hidden')));
await triggers.first().click();
check('FAQ öffnet per Klick', (await triggers.first().getAttribute('aria-expanded')) === 'true' && await page.waitForTimeout(500) === undefined && await page.locator('#faq-p1').isVisible());
await triggers.nth(1).focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
check('FAQ öffnet per Tastatur (Enter)', await page.locator('#faq-p2').isVisible());
await page.keyboard.press('Enter'); await page.waitForTimeout(600);
check('FAQ schließt wieder', !(await page.locator('#faq-p2').isVisible()));
await page.locator('#faq').scrollIntoViewIfNeeded(); await shot(page, '06-faq', '#faq');

// Formular
await page.locator('#kontakt').scrollIntoViewIfNeeded();
await page.fill('#f-type', '').catch(() => {});
await page.selectOption('#f-type', '');
await page.click('#contact-form button[type=submit]');
check('Formular: Pflichtfeldfehler erscheinen', (await page.locator('.error:visible').count()) === 4);
check('Formular: Fokus auf erstem fehlerhaften Feld', await page.evaluate(() => document.activeElement.id === 'f-name'));
check('Formular: kein Erfolgs-/Demo-Status bei Fehlern', !(await page.locator('#form-status').isVisible()));
await page.fill('#f-name', 'Max Beispiel'); await page.fill('#f-email', 'kaputt'); await page.selectOption('#f-type', 'wohnung');
await page.click('#contact-form button[type=submit]');
check('Formular: ungültige E-Mail wird abgelehnt', (await page.locator('#e-email').innerText()).includes('gültige'));
await page.fill('#f-email', 'max@beispiel.de'); await page.check('#f-consent');
const posts = []; page.on('request', r => { if (r.method() === 'POST') posts.push(r.url()); });
await page.click('#contact-form button[type=submit]');
const st = await page.locator('#form-status').innerText();
check('Formular: Demo-Zustand klar gekennzeichnet, kein Versand simuliert', /Demo-Modus/.test(st) && /NICHT versendet/.test(st) && !/vielen dank/i.test(st) && posts.length === 0);
await page.locator('#kontakt').scrollIntoViewIfNeeded(); await shot(page, '07-kontakt', '#kontakt');

const issuesBeforeMock = consoleIssues.length;
// Formular mit Endpoint (gemockt): Erfolg nur bei HTTP 200, Fehler bei 500
for (const [code, expect] of [[200, 'ok'], [500, 'fail']]) {
  await page.route('**/mock-endpoint', r => r.fulfill({ status: code, body: '{}' }));
  await page.evaluate(() => document.getElementById('contact-form').setAttribute('data-endpoint', '/mock-endpoint'));
  await page.fill('#f-name', 'Max'); await page.fill('#f-email', 'max@beispiel.de'); await page.selectOption('#f-type', 'wohnung'); await page.check('#f-consent');
  await page.click('#contact-form button[type=submit]'); await page.waitForTimeout(400);
  check(`Formular mit Endpoint, HTTP ${code} → ${expect}`, await page.locator(`#form-status.${expect}`).isVisible());
  await page.unroute('**/mock-endpoint');
}

consoleIssues.length = issuesBeforeMock; // die vom Mock (HTTP 500) erwartete Konsolenmeldung ist gewollt
// Kontraste
const contrasts = await page.evaluate(() => {
  const pick = (sel) => { const e = document.querySelector(sel); const cs = getComputedStyle(e); return [sel, cs.color, cs.backgroundColor]; };
  const beige = (a) => [a[0], a[1], 'rgb(246, 244, 240)']; return [pick('.btn-primary'), beige(pick('.hero-points li')), beige(pick('.eyebrow')), pick('.tag'), pick('.matrix thead th'), pick('.site-footer')];
});
for (const [sel, fg, bg] of contrasts) { const r = ratio(rgb(fg), rgb(bg)); check(`Kontrast ${sel} ≥ 4.5:1`, r >= 4.5, r.toFixed(2)); }
const heroCheck = ratio(rgb(await page.locator('.hero .accent').evaluate(e => getComputedStyle(e).color)), [246, 244, 240]);
check('Kontrast Hero-Akzent (Blau auf Beige) ≥ 4.5:1', heroCheck >= 4.5, heroCheck.toFixed(2));
await page.context().close();

/* ---------- Responsiv ---------- */
for (const [w, h, name] of [[1440, 900, 'Desktop'], [1024, 768, 'Tablet quer'], [768, 1024, 'Tablet'], [390, 844, 'Mobil'], [320, 640, 'Mobil klein']]) {
  const p = await open(w, h);
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const smallFonts = await p.evaluate(() => [...document.querySelectorAll('main p, main li, main td, main a, main button')].filter(e => e.offsetParent && parseFloat(getComputedStyle(e).fontSize) < 13).length);
  const heroOk = await p.evaluate(() => { const r = [...document.querySelectorAll('.hero-copy, .hero-figure, .node')].filter(e => e.offsetParent).map(e => e.getBoundingClientRect()); return r.every(b => b.left >= -1 && b.right <= innerWidth + 1); });
  check(`${name} ${w}px: kein horizontaler Scroll`, overflow <= 0, `overflow=${overflow}`);
  check(`${name} ${w}px: Hero-Elemente im Viewport`, heroOk);
  check(`${name} ${w}px: keine Schrift < 13px`, smallFonts === 0, `${smallFonts}`);
  if (w === 390 || w === 768 || w === 1024) await p.screenshot({ path: `${SHOTS}hero-${w}.png` });
  if (w === 390) {
    await p.screenshot({ path: `${SHOTS}08-mobil-hero.png` });
    const navHidden = !(await p.locator('#main-nav').isVisible());
    const btn = p.locator('.nav-toggle');
    check('Mobil: Menü initial geschlossen, Toggle sichtbar', navHidden && await btn.isVisible() && (await btn.getAttribute('aria-expanded')) === 'false');
    await btn.click();
    check('Mobil: Menü öffnet (aria-expanded=true, Links sichtbar)', (await btn.getAttribute('aria-expanded')) === 'true' && await p.locator('#main-nav').isVisible() && await p.locator('.main-nav ul a').first().isVisible());
    await p.screenshot({ path: `${SHOTS}09-mobil-menue.png` });
    await p.keyboard.press('Escape');
    check('Mobil: Escape schließt Menü', !(await p.locator('#main-nav').isVisible()));
    await btn.click(); await p.locator('.main-nav ul a[href="#faq"]').click(); await p.waitForTimeout(2000);
    check('Mobil: Menülink scrollt und schließt Menü', !(await p.locator('#main-nav').isVisible()) && (await p.locator('#faq').evaluate(e => Math.round(e.getBoundingClientRect().top))) < 140);
    await p.locator('.matrix').scrollIntoViewIfNeeded(); await p.locator('#vereinbarungen').screenshot({ path: `${SHOTS}10-mobil-matrix.png` });
    await p.locator('#kontakt').scrollIntoViewIfNeeded(); await p.locator('#kontakt').screenshot({ path: `${SHOTS}11-mobil-kontakt.png` });
  }
  await p.context().close();
}

{ const pf = await open(1440, 900);
check('Kein „Rechtlicher Hinweis“-Kasten mehr', (await pf.locator('.legal-note').count()) === 0);
check('Footer: Logo und 3 Social-Icons, keine toten Links', await pf.evaluate(() => !!document.querySelector('.site-footer .footer-logo img') && document.querySelectorAll('.social-link').length === 3 && [...document.querySelectorAll('.social-link')].every(a => !a.hasAttribute('href'))));
  check('Logos laden (Header + Footer, mit Transparenz)', (await pf.evaluate(() => scrollTo(0, document.body.scrollHeight)), await pf.waitForTimeout(1200), await pf.evaluate(() => [...document.querySelectorAll('.brand img, .footer-logo img')].every(i => i.complete && i.naturalWidth > 0))));
  await pf.context().close(); }
{ const pc = await open(1440, 900);
  const order = await pc.evaluate(() => [...document.querySelectorAll('main > section[id]')].map(s => s.id));
  check('CRM-Sektion steht vor den Immobilientypen und nach Expertise', order.indexOf('verwaltung') > order.indexOf('expertise') && order.indexOf('verwaltung') < order.indexOf('immobilientypen'), order.join(' > '));
  check('CRM: Überschrift und genau 4 Bullet Points', (await pc.locator('#crm-title').innerText()) === 'Immobilienverwaltung. Klar organisiert.' && (await pc.locator('.crm-points li').count()) === 4);
  await pc.locator('#verwaltung').scrollIntoViewIfNeeded(); await pc.waitForTimeout(1500);
  check('CRM: Mockup geladen, als Beispielansicht gekennzeichnet', await pc.evaluate(() => { const i = document.querySelector('.crm-frame img'); return i.complete && i.naturalWidth > 0 && /Mockup/.test(document.querySelector('.crm-figure figcaption').textContent); }));
  check('CRM Desktop: Text und Dashboard nebeneinander', await pc.evaluate(() => { const a = document.querySelector('.crm-copy').getBoundingClientRect(), b = document.querySelector('.crm-figure').getBoundingClientRect(); return a.right <= b.left + 1 && Math.abs(a.top - b.top) < 200; }));
  await pc.locator('#verwaltung').screenshot({ path: `${SHOTS}18-crm-desktop.png` });
  const hb = await pc.evaluate(() => { const f = document.querySelector('.hero-figure').getBoundingClientRect(); return { right: f.right, w: innerWidth, h: document.querySelector('.hero-figure').getBoundingClientRect().height }; });
  check('Hero Desktop: Bild bündig zum rechten Rand', Math.abs(hb.right - hb.w) <= 16, `right=${Math.round(hb.right)} / ${hb.w}`);
  await pc.context().close();
  const pmc = await open(390, 844);
  await pmc.locator('#verwaltung').scrollIntoViewIfNeeded(); await pmc.waitForTimeout(1500);
  check('CRM Mobil: Bullet Points stehen vor dem Mockup', await pmc.evaluate(() => document.querySelector('.crm-points').getBoundingClientRect().bottom <= document.querySelector('.crm-frame').getBoundingClientRect().top + 1));
  await pmc.locator('#verwaltung').screenshot({ path: `${SHOTS}19-crm-mobil.png` });
  await pmc.context().close(); }
// Vorher/Nachher-Slider
{ const pb = await open(1440, 900);
  const order = await pb.evaluate(() => [...document.querySelectorAll('main > section[id]')].map(s => s.id));
  check('Vorher/Nachher steht nach Expertise und vor den Immobilientypen', order.indexOf('vorher-nachher') > order.indexOf('expertise') && order.indexOf('vorher-nachher') < order.indexOf('immobilientypen'), order.join(' > '));
  check('Vorher/Nachher: Überschrift und Untertitel', (await pb.locator('#ba-title').innerText()) === 'Vom Leerstand zum Lebensraum.' && (await pb.locator('.ba-section .section-head p:last-child').innerText()).startsWith('Wir machen aus ungenutzten Räumen'));
  await pb.locator('#ba').scrollIntoViewIfNeeded(); await pb.waitForTimeout(3200); // inkl. Hinweis-Schwenk
  check('Vorher/Nachher: beide Bilder geladen, gleiche Größe, gleiches Verhältnis', await pb.evaluate(() => { const [a, b] = [...document.querySelectorAll('#ba img')]; const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return a.complete && b.complete && a.naturalWidth > 0 && b.naturalWidth > 0 && Math.abs(ra.width - rb.width) < 1 && Math.abs(ra.height - rb.height) < 1 && Math.abs(ra.width / ra.height - 1.5) < 0.02; }));
  check('Vorher/Nachher: Labels VORHER und NACHHER', (await pb.locator('.ba-label').allInnerTexts()).map(t => t.toUpperCase()).join('|') === 'NACHHER|VORHER');
  check('Slider startet bei 50 % (nach Hinweis-Schwenk)', Math.abs(parseFloat(await pb.locator('#ba-range').inputValue()) - 50) < 0.5);
  check('Slider: Zugänglicher Name und Rolle', (await pb.locator('#ba-range').getAttribute('aria-label')).includes('Vorher und Nachher') && (await pb.locator('#ba-range').getAttribute('type')) === 'range');
  const box = await pb.locator('#ba').boundingBox();
  const posOf = () => pb.evaluate(() => parseFloat(getComputedStyle(document.getElementById('ba')).getPropertyValue('--pos')));
  const handleX = () => pb.evaluate(() => Math.round(document.querySelector('.ba-knob').getBoundingClientRect().left + 26));
  await pb.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2); await pb.mouse.down();
  await pb.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 12 }); await pb.mouse.up();
  const p20 = await posOf();
  check('Maus: Ziehen nach links bewegt Trennlinie (~20 %)', Math.abs(p20 - 20) < 4, `pos=${p20.toFixed(1)}`);
  check('Griff folgt der Trennlinie', Math.abs((await handleX()) - (box.x + box.width * p20 / 100)) < 4);
  await pb.mouse.click(box.x + box.width * 0.8, box.y + box.height / 2);
  const p80 = await posOf();
  check('Maus: Klick auf rechte Seite springt (~80 %)', Math.abs(p80 - 80) < 4, `pos=${p80.toFixed(1)}`);
  await pb.locator('#ba-range').focus(); const before = await posOf(); await pb.keyboard.press('ArrowLeft'); await pb.keyboard.press('ArrowLeft');
  const afterKey = await posOf();
  check('Tastatur: Pfeil links verschiebt die Trennlinie', afterKey < before, `${before.toFixed(1)} → ${afterKey.toFixed(1)}`);
  await pb.keyboard.press('Home'); check('Tastatur: Home zeigt komplett Nachher (0 %)', (await posOf()) <= 0.1);
  await pb.keyboard.press('End'); check('Tastatur: End zeigt komplett Vorher (100 %)', (await posOf()) >= 99.9);
  await pb.keyboard.press('Home'); await pb.keyboard.press('Home');
  await pb.evaluate(() => { const r = document.getElementById('ba-range'); r.value = 50; r.dispatchEvent(new Event('input', { bubbles: true })); });
  await pb.waitForTimeout(300);
  await pb.locator('#ba').screenshot({ path: `${SHOTS}20-vorher-nachher-desktop.png` });
  await pb.evaluate(() => { const r = document.getElementById('ba-range'); r.value = 25; r.dispatchEvent(new Event('input', { bubbles: true })); });
  await pb.locator('#ba').screenshot({ path: `${SHOTS}21-vorher-nachher-desktop-25.png` });
  await pb.context().close();

  // Touch (Mobil)
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const pt = await ctx.newPage(); pt.on('console', m => { if (['error', 'warning'].includes(m.type())) consoleIssues.push(m.text()); });
  await pt.goto(BASE + '/'); await pt.waitForTimeout(1200);
  await pt.evaluate(() => document.getElementById('vorher-nachher').scrollIntoView({ behavior: 'instant' })); await pt.waitForTimeout(3300);
  const tb = await pt.locator('#ba').boundingBox();
  await pt.touchscreen.tap(tb.x + tb.width * 0.75, tb.y + tb.height / 2); await pt.waitForTimeout(300);
  const tpos = parseFloat(await pt.evaluate(() => getComputedStyle(document.getElementById('ba')).getPropertyValue('--pos')));
  check('Touch: Tippen setzt die Trennlinie (~75 %)', Math.abs(tpos - 75) < 6, `pos=${tpos.toFixed(1)}`);
  check('Mobil: Slider-Griff ≥ 44 px, Bild 4:3, kein Überlauf', await pt.evaluate(() => { const k = document.querySelector('.ba-knob').getBoundingClientRect(), b = document.getElementById('ba').getBoundingClientRect(); return k.width >= 44 && Math.abs(b.width / b.height - 4 / 3) < 0.03 && b.left >= 0 && b.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth; }));
  await pt.evaluate(() => { const r = document.getElementById('ba-range'); r.value = 50; r.dispatchEvent(new Event('input', { bubbles: true })); });
  await pt.locator('#vorher-nachher').screenshot({ path: `${SHOTS}22-vorher-nachher-mobil.png` });
  await ctx.close();

  // Ohne JavaScript: statischer Vergleich
  const nj = await browser.newContext({ viewport: { width: 1280, height: 800 }, javaScriptEnabled: false });
  const pn = await nj.newPage(); await pn.goto(BASE + '/'); await pn.locator('#ba').scrollIntoViewIfNeeded(); await pn.waitForTimeout(800);
  check('Ohne JavaScript: statischer Vergleich (beide Bilder, kein Regler, Labels)', await pn.evaluate(() => { const imgs = [...document.querySelectorAll('#ba img')]; return imgs.every(i => i.complete && i.naturalWidth > 0) && getComputedStyle(document.getElementById('ba-range')).display === 'none' && document.querySelectorAll('.ba-label').length === 2 && getComputedStyle(document.querySelector('.ba-before')).clipPath !== 'none'; }));
  await pn.locator('#ba').screenshot({ path: `${SHOTS}23-vorher-nachher-ohne-js.png` });
  await nj.close(); }
// Schriften: Paar aus Fraunces + Manrope tatsächlich geladen, kein Inter/Roboto
{ const p2 = await open(1440, 900); await p2.evaluate(() => document.fonts.ready);
  const f = await p2.evaluate(() => [document.fonts.check('600 20px "Fraunces Variable"'), document.fonts.check('400 16px "Manrope Variable"'), getComputedStyle(document.querySelector('h1')).fontFamily, getComputedStyle(document.body).fontFamily]);
  check('Schriftpaar Fraunces (Display) + Manrope (Body) geladen', f[0] && f[1] && f[2].includes('Fraunces') && f[3].includes('Manrope') && !/inter|roboto/i.test(f[2] + f[3]), f.slice(2).join(' | '));
  check('Scroll-Fortschrittsbalken reagiert', await (async () => { await p2.evaluate(() => scrollTo(0, document.body.scrollHeight)); await p2.waitForTimeout(300); return parseFloat(await p2.evaluate(() => getComputedStyle(document.querySelector('.site-header')).getPropertyValue('--progress'))) > 0.9; })());
  await p2.context().close();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); const p3 = await ctx.newPage(); await p3.goto(BASE + '/');
  check('prefers-reduced-motion: keine Hero-Animation', await p3.evaluate(() => getComputedStyle(document.querySelector('.hero-figure img')).animationName === 'none'));
  await ctx.close(); }
// Mobiler Hero (Viewport wie ein Handy-Browser mit Leisten): Buttons komplett sichtbar, Bild lugt hervor
{ const pm = await open(390, 700);
  const m = await pm.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(); return { b1: r('.hero .btn-primary').bottom, b2: r('.hero .btn-outline').bottom, img: r('.hero-figure').top, imgVisible: Math.min(innerHeight, r('.hero-figure').bottom) - r('.hero-figure').top, logoH: r('.brand img').height, lead: document.querySelectorAll('.hero .lead').length }; });
  check('Mobil 390x700: beide Hero-Buttons vollständig sichtbar', m.b1 <= 700 && m.b2 <= 700, `bottom=${Math.round(m.b1)}/${Math.round(m.b2)}`);
  check('Mobil 390x700: Hero-Bild lugt sichtbar hervor (≥ 80px)', m.imgVisible >= 80, `${Math.round(m.imgVisible)}px`);
  check('Mobil: Logo ≥ 50px hoch, kein Fließtext unter der Headline', m.logoH >= 50 && m.lead === 0, `logo=${Math.round(m.logoH)}px`);
  await pm.screenshot({ path: `${SHOTS}12-mobil-hero-700.png` });
  check('Sticky-CTA zu Beginn versteckt', !(await pm.locator('.sticky-cta').isVisible()));
  await pm.evaluate(() => scrollTo(0, 1200)); await pm.waitForTimeout(700);
  check('Sticky-CTA erscheint nach dem Hero', await pm.locator('.sticky-cta').isVisible());
  await pm.screenshot({ path: `${SHOTS}13-mobil-sticky-cta.png` });
  await pm.evaluate(() => document.getElementById('kontakt').scrollIntoView()); await pm.waitForTimeout(2500);
  check('Sticky-CTA verschwindet im Kontaktbereich', !(await pm.locator('.sticky-cta').isVisible()));
  await pm.context().close();
  const pd = await open(1440, 900);
  check('Desktop: Sticky-CTA nicht sichtbar', !(await pd.locator('.sticky-cta').isVisible()));
  const rvLeft = await (async () => { await pd.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } }); await pd.waitForTimeout(2300); return pd.evaluate(() => document.querySelectorAll('.rv:not(.is-in)').length); })();
  check('Scroll-Reveal: nach Durchscrollen ist alles eingeblendet', rvLeft === 0, `offen=${rvLeft}`);
  await pd.context().close(); }
// Gesamtseite
page = await open(1440, 900);
await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 150)); } scrollTo(0, 0); }); await page.waitForTimeout(2300);
await page.screenshot({ path: `${SHOTS}00-gesamtseite.png`, fullPage: true });
// Rechtsseiten erreichbar
for (const u of ['impressum.html', 'datenschutz.html']) { const r = await page.goto(`${BASE}/${u}`); check(`${u} erreichbar`, r.status() === 200); }
await browser.close();

check('Browserkonsole: keine Fehler/Warnungen/fehlgeschlagene Requests', consoleIssues.length === 0, consoleIssues.join(' | '));
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} Prüfungen bestanden`);
process.exit(failed.length ? 1 : 0);
