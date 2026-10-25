// Hängt an CSS- und JS-Verweise der HTML-Seiten einen Inhalts-Hash (?v=…), damit Browser und CDN
// nach einer Änderung nie alte Dateien zur neuen Seite laden. Aufruf: node scripts/cache-bust.mjs  (oder: npm run build)
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const pages = ['index.html', 'investoren.html', 'impressum.html', 'datenschutz.html'];
const ref = /((?:href|src)=")((?:css|js)\/[^"?]+|assets\/img\/logo-leventum\.png)(?:\?v=[0-9a-f]+)?(")/g;

export const hashOf = (file) => createHash('sha1').update(readFileSync(root + file)).digest('hex').slice(0, 8);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const page of pages) {
    const html = readFileSync(root + page, 'utf8');
    const out = html.replace(ref, (_, a, file, c) => `${a}${file}?v=${hashOf(file)}${c}`);
    if (out !== html) writeFileSync(root + page, out);
    console.log(`${page}: ${[...out.matchAll(ref)].length} Verweise versioniert`);
  }
}
