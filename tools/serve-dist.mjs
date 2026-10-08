// Sirve dist/ (el build web) de forma local imitando lo que hace Vercel con vercel.json:
// mismas cabeceras (CSP, caché, Content-Type del manifest/sw) y mismo fallback de SPA.
// Sirve para probar la PWA/Service Worker con el build real ANTES de desplegar:
//
//   npm run build:web && npm run serve:web          → http://localhost:4173
//   node tools/serve-dist.mjs --puerto 4173 --permitir-http
//
// --permitir-http  agrega `http:` a connect-src/media-src de la CSP, solo para probar contra
//                  un backend local en http://IP:3001 (en producción todo es https).
// Nota: http://localhost cuenta como "contexto seguro", así que el Service Worker y getUserMedia
// funcionan igual que en https. Un iPhone real NO puede usar localhost: ahí hace falta un
// despliegue https (ver docs/WEB_PWA.md, "Probar desde un iPhone real").
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const args = process.argv.slice(2);
const puerto = Number(args[args.indexOf('--puerto') + 1]) || 4173;
const permitirHttp = args.includes('--permitir-http');
const raiz = join(process.cwd(), 'dist');
const config = JSON.parse(readFileSync('vercel.json', 'utf8'));

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json',
  '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json',
};

function coincide(patron, ruta) {
  // Los "source" de vercel.json son path-to-regexp; con estos pocos casos alcanza.
  const re = new RegExp('^' + patron.replace(/\(\.\*\)/g, '.*') + '$');
  return re.test(ruta);
}

function cabeceras(ruta) {
  const salida = {};
  for (const regla of config.headers ?? []) {
    if (!coincide(regla.source, ruta)) continue;
    for (const { key, value } of regla.headers) {
      salida[key] = permitirHttp && key === 'Content-Security-Policy' ? value.replace('connect-src', 'connect-src http: ws:').replace('media-src', 'media-src http:') : value;
    }
  }
  return salida;
}

const reescrituras = (config.rewrites ?? []).map((r) => ({ re: new RegExp('^' + r.source + '$'), destino: r.destination }));

createServer((req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let archivo = normalize(join(raiz, ruta === '/' ? 'index.html' : ruta));
  if (!archivo.startsWith(raiz)) { res.writeHead(403).end(); return; }

  if (!existsSync(archivo) || statSync(archivo).isDirectory()) {
    const regla = reescrituras.find((r) => r.re.test(ruta));
    if (!regla) { res.writeHead(404, cabeceras(ruta)).end('404'); return; }
    archivo = join(raiz, regla.destino);
  }
  res.writeHead(200, { 'Content-Type': TIPOS[extname(archivo)] ?? 'application/octet-stream', ...cabeceras(ruta) });
  res.end(readFileSync(archivo));
}).listen(puerto, () => console.log(`dist/ en http://localhost:${puerto}`));
