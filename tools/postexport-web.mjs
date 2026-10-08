// Paso posterior a `expo export -p web`: estampa el BUILD_ID en dist/sw.js.
// Sin esto el Service Worker sería idéntico en todos los deploys y los celulares
// que ya lo instalaron nunca detectarían una versión nueva.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const dist = 'dist';
if (!existsSync(`${dist}/index.html`)) throw new Error('No existe dist/index.html — corré `expo export -p web` primero.');

// El index.html referencia el bundle con hash → cambia cuando cambia el código.
const buildId = createHash('sha1').update(readFileSync(`${dist}/index.html`)).digest('hex').slice(0, 10);

const sw = readFileSync(`${dist}/sw.js`, 'utf8');
if (!sw.includes('__BUILD_ID__')) throw new Error('dist/sw.js no tiene el marcador __BUILD_ID__.');
writeFileSync(`${dist}/sw.js`, sw.replaceAll('__BUILD_ID__', buildId));
writeFileSync(`${dist}/version.json`, JSON.stringify({ buildId, builtAt: new Date().toISOString() }));
console.log(`[postexport-web] BUILD_ID=${buildId}`);
