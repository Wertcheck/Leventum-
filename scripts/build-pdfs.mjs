// Erzeugt die PDF-Rechenbeispiele aus js/rechenbeispiele.js: node scripts/build-pdfs.mjs
// Benötigt Playwright (nur zur Erzeugung, nicht zur Laufzeit der Website).
import { readFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const { chromium } = createRequire(import.meta.url)('playwright');
await import('../js/rechenbeispiele.js');
const RB = globalThis.LEV_RB;
const b64 = async (p) => (await readFile(resolve(root, p))).toString('base64');
const [fraunces, manrope, logo] = await Promise.all([b64('assets/fonts/fraunces-latin-wght-normal.woff2'), b64('assets/fonts/manrope-latin-wght-normal.woff2'), b64('assets/img/logo-leventum.png')]);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const css = `
@font-face{font-family:Fraunces;src:url(data:font/woff2;base64,${fraunces}) format('woff2');font-weight:100 900}
@font-face{font-family:Manrope;src:url(data:font/woff2;base64,${manrope}) format('woff2');font-weight:200 800}
@page{size:A4;margin:16mm 16mm 18mm}
*{box-sizing:border-box}
body{margin:0;font:10pt/1.5 Manrope,sans-serif;color:#2b2f36}
header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #d8d2c8;padding-bottom:10px}
header img{height:46px}
header span{font-size:8.5pt;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6c5d4c}
h1{font:500 22pt/1.2 Fraunces,serif;color:#27446c;margin:22px 0 6px}
.intro{margin:0 0 14px;color:#4a5160}
.stamp{display:inline-block;background:#f6f4f0;border:1px solid #d8d2c8;border-radius:6px;padding:4px 10px;font-size:8.5pt;font-weight:700;color:#6c5d4c;margin-bottom:12px}
h2{font:700 10.5pt Manrope,sans-serif;color:#27446c;margin:16px 0 4px}
table{width:100%;border-collapse:collapse}
td{padding:5px 0;border-top:1px solid #e6e1d8;vertical-align:top}
td+td{text-align:right;white-space:nowrap;padding-left:14px;font-variant-numeric:tabular-nums}
tr.sum td{font-weight:700;background:#faf9f6}
tr.res td{font-weight:800;color:#fff;background:#27446c;border-top:0}
tr.res td:first-child{padding-left:8px;border-radius:4px 0 0 4px}tr.res td:last-child{padding-right:8px;border-radius:0 4px 4px 0}
.box{margin-top:16px;border-left:3px solid #8a7966;background:#f6f4f0;padding:8px 12px;break-inside:avoid}
.box b{color:#27446c}
.legal{margin-top:16px;font-size:8.5pt;color:#4a5160;border-top:1px solid #d8d2c8;padding-top:8px}
footer{margin-top:14px;font-size:8pt;color:#6c5d4c}
`;
function html(m) {
  const blocks = m.blocks.map((b) => `<h2>${esc(b.h)}</h2><table>${b.rows.map((r) => `<tr class="${r.kind}"><td>${esc(r.label)}</td><td>${esc(r.value)}</td></tr>`).join('')}</table>`).join('');
  return `<!doctype html><html lang="de"><meta charset="utf-8"><title>Rechenbeispiel ${esc(m.title)} – LEVENTUM REAL ESTATE GmbH</title><style>${css}</style>
<header><img src="data:image/png;base64,${logo}" alt="LEVENTUM REAL ESTATE GmbH"><span>Rechenbeispiel</span></header>
<h1>${esc(m.title)}</h1><div class="stamp">Muster- und Beispielzahlen – keine Prognose</div><p class="intro">${esc(m.intro)}</p>
${blocks}
<div class="box"><b>Was sich ändern kann:</b> ${esc(m.scenario)}</div>
<p class="legal"><b>Hinweis:</b> ${esc(m.note)} ${esc(RB.disclaimer)}</p>
<footer>LEVENTUM REAL ESTATE GmbH · Beispielrechnung zur Veranschaulichung, nicht als Anlage-, Steuer- oder Rechtsberatung.</footer></html>`;
}
const browser = await chromium.launch();
await mkdir(resolve(root, 'assets/pdf'), { recursive: true });
for (const key of RB.order) {
  const m = RB.data[key];
  const page = await browser.newPage();
  await page.setContent(html(m), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: resolve(root, 'assets/pdf', m.file), format: 'A4', printBackground: true, preferCSSPageSize: true });
  await page.close();
  console.log('PDF', m.file);
}
await browser.close();
