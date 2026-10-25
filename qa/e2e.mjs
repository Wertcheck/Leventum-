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
check('Hero zeigt Rent-to-Rent mit zwei Mietverträgen',/Rent-to-Rent/i.test(await page.locator('.roles-title').innerText()) && (await page.locator('.role-link:visible').count()) === 2);
check('Hero-Rollen sichtbar (Eigentümer/LIVENTUM/Endmieter)', (await page.locator('.role:visible').allTextContents()).join(' ').match(/Eigentümer.*LIVENTUM.*Endmieter/s) !== null);
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
for (const [sel, target] of [['[data-cta=nav]', '#kontaktformular'], ['[data-cta=hero-primary]', '#kontaktformular'], ['[data-cta=hero-secondary]', '#angebot'], ['[data-cta=contact-primary]', '#kontaktformular'], ['[data-cta=contact-secondary]', '#kontaktdaten']]) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const a = page.locator(sel).first();
  const href = await a.getAttribute('href');
  await a.evaluate(e => e.click()); await page.waitForTimeout(900);
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
for (const [n, s] of [['02-angebot', '#angebot'], ['03-vorteile', '#vorteile'], ['04-expertise', '#expertise'], ['05-verantwortungsmatrix', '#vereinbarungen']]) { await page.locator(s).scrollIntoViewIfNeeded(); await shot(page, n, s); }

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
  const heroOk = await p.evaluate(() => { const r = [...document.querySelectorAll('.hero-copy, .hero-figure, .role')].filter(e => e.offsetParent).map(e => e.getBoundingClientRect()); return r.every(b => b.left >= -1 && b.right <= innerWidth + 1); });
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
