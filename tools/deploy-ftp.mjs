// Sube la versión web (dist/) a un hosting por FTP — el dominio que nos dio la empresa (eldertech.ledor.com.ar).
//
//   npm run deploy:ftp -- --listar     # solo muestra qué hay en el servidor (prueba la conexión, no sube nada)
//   npm run deploy:ftp                 # sube dist/ (hay que correr `npm run build:web` antes)
//   npm run deploy:ftp -- --simular    # muestra qué subiría, sin subir
//
// Las credenciales NO van en el código: se leen de `.env.ftp` (raíz del repo, ignorado por git — ver `.gitignore`).
// Ver `.env.ftp.example`.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import { Client } from 'basic-ftp';

const args = new Set(process.argv.slice(2));
// --backoffice: sube backoffice/dist a la subcarpeta /admin (https://eldertech.ledor.com.ar/admin/).
const BACKOFFICE = args.has('--backoffice');
const DIST = BACKOFFICE ? 'backoffice/dist' : 'dist';
const SUBCARPETA = BACKOFFICE ? 'admin' : '';
const BUILD_CMD = BACKOFFICE ? 'npm run build:backoffice-ftp' : 'npm run build:web';

// ─── Credenciales ────────────────────────────────────────────────────────────
function leerEnvFtp() {
  const archivo = '.env.ftp';
  if (!existsSync(archivo)) throw new Error('Falta el archivo .env.ftp. Copiá .env.ftp.example a .env.ftp y completalo.');
  const valores = {};
  for (const linea of readFileSync(archivo, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m) valores[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  for (const k of ['FTP_HOST', 'FTP_USER', 'FTP_PASSWORD']) if (!valores[k]) throw new Error(`Falta ${k} en .env.ftp`);
  return {
    host: valores.FTP_HOST,
    user: valores.FTP_USER,
    password: valores.FTP_PASSWORD,
    // 'explicit' = FTPS (cifrado). 'false' = FTP plano (la contraseña viaja sin cifrar).
    secure: (valores.FTP_SECURE ?? 'explicit') === 'false' ? false : valores.FTP_SECURE === 'implicit' ? 'implicit' : true,
    remoteDir: valores.FTP_REMOTE_DIR || '/',
  };
}

// ─── .htaccess (lo que en Vercel hace vercel.json) ───────────────────────────
// Un hosting Apache/LiteSpeed no lee vercel.json: sin esto, entrar directo a /mas/clima da 404, el Service Worker
// queda cacheado para siempre y no hay HTTPS forzado ni cabeceras de seguridad.
const HTACCESS = `# Generado por tools/deploy-ftp.mjs — equivalente al vercel.json del proyecto.
RewriteEngine On

# Siempre HTTPS (el micrófono, el Service Worker y las notificaciones lo exigen)
RewriteCond %{HTTPS} !=on
RewriteCond %{HTTP:X-Forwarded-Proto} !=https
RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]

# Rutas de la app (/mas/clima, /horarios/3, …) -> index.html. Los archivos reales (con extensión) se sirven tal cual.
RewriteCond %{REQUEST_URI} !^/(_expo|assets|icons|splash)/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !\\.[A-Za-z0-9]+$
RewriteRule ^ /index.html [L]

AddType application/manifest+json .webmanifest
AddType application/javascript .js .mjs

<IfModule mod_headers.c>
  Header always set Strict-Transport-Security "max-age=31536000"
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "DENY"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "microphone=(self), camera=(self), geolocation=(), payment=(), usb=()"
  Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' blob: data: https: wss:; frame-src https://www.youtube.com https://www.youtube-nocookie.com; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"

  # Lo que cambia en cada versión NO se cachea: así los celulares detectan la actualización.
  <FilesMatch "^(index\\.html|sw\\.js|version\\.json)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
  </FilesMatch>
  <Files "sw.js">
    Header set Service-Worker-Allowed "/"
  </Files>
  <Files "manifest.webmanifest">
    Header set Cache-Control "public, max-age=3600"
  </Files>
</IfModule>

# Archivos con hash en el nombre: se pueden cachear un año.
<IfModule mod_headers.c>
  <If "%{REQUEST_URI} =~ m#^/(_expo/static|assets)/#">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </If>
  <If "%{REQUEST_URI} =~ m#^/(icons|splash)/#">
    Header set Cache-Control "public, max-age=86400"
  </If>
</IfModule>
`;

// .htaccess del backoffice (SPA en /admin). Un .htaccess en la subcarpeta reemplaza al de la raíz.
const HTACCESS_ADMIN = `# Generado por tools/deploy-ftp.mjs — backoffice en /admin.
RewriteEngine On
RewriteBase /admin/

RewriteCond %{HTTPS} !=on
RewriteCond %{HTTP:X-Forwarded-Proto} !=https
RewriteRule ^(.*)$ https://%{HTTP_HOST}/admin/$1 [R=301,L]

RewriteCond %{REQUEST_URI} !^/admin/assets/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !\.[A-Za-z0-9]+$
RewriteRule ^ /admin/index.html [L]

AddType application/javascript .js .mjs

<IfModule mod_headers.c>
  Header always set Strict-Transport-Security "max-age=31536000"
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "DENY"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "microphone=(), camera=(), geolocation=(), payment=(), usb=()"
  # El backoffice usa Google Fonts: la CSP de la raíz (pensada para la app web) la bloquearía.
  Header always unset Content-Security-Policy
  <Files "index.html">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
  </Files>
  <If "%{REQUEST_URI} =~ m#^/admin/assets/#">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </If>
</IfModule>
`;
const HTACCESS_FINAL = BACKOFFICE ? HTACCESS_ADMIN : HTACCESS;

// ─── Recorrido de dist/ ──────────────────────────────────────────────────────
function listarArchivos(dir) {
  const salida = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...listarArchivos(ruta));
    else salida.push(ruta);
  }
  return salida;
}

// Estos van AL FINAL: si la subida se corta a la mitad, el sitio viejo sigue funcionando
// (index.html todavía apunta a los archivos viejos, que siguen ahí).
const ULTIMOS = ['sw.js', 'version.json', 'index.html'];
const prioridad = (rel) => {
  const i = ULTIMOS.indexOf(rel);
  return i === -1 ? 0 : i + 1;
};

async function main() {
  // Sin FTP: deja el .htaccess dentro de dist/ para empaquetar todo y subirlo a mano (administrador de archivos del hosting).
  if (args.has('--preparar')) {
    if (!existsSync(`${DIST}/index.html`)) throw new Error(`No existe ${DIST}/index.html — corré \`${BUILD_CMD}\` primero.`);
    writeFileSync(`${DIST}/.htaccess`, HTACCESS_FINAL);
    console.log(`Listo: ${DIST}/.htaccess generado.`);
    return;
  }
  const cfg = leerEnvFtp();
  if (SUBCARPETA) cfg.remoteDir = posix.join(cfg.remoteDir, SUBCARPETA);
  const cliente = new Client(60_000);
  try {
    console.log(`Conectando a ${cfg.host} como ${cfg.user} (${cfg.secure ? 'FTPS cifrado' : 'FTP SIN cifrar'})…`);
    await cliente.access({
      host: cfg.host,
      user: cfg.user,
      password: cfg.password,
      secure: cfg.secure,
      // Muchos hosting compartidos usan un certificado que no coincide con la IP: se acepta solo para este servidor.
      secureOptions: { rejectUnauthorized: false },
    });

    if (args.has('--listar')) {
      console.log(`\nCarpeta actual del servidor: ${await cliente.pwd()}`);
      for (const f of await cliente.list(cfg.remoteDir)) console.log(`  ${f.isDirectory ? '[carpeta]' : '[archivo]'} ${f.name}`);
      console.log('\nConexión OK. Poné en FTP_REMOTE_DIR la carpeta donde tiene que quedar la página (la que contiene o va a contener index.html).');
      return;
    }

    if (!existsSync(`${DIST}/index.html`)) throw new Error(`No existe ${DIST}/index.html — corré \`${BUILD_CMD}\` primero.`);
    const archivos = listarArchivos(DIST)
      .map((ruta) => relative(DIST, ruta).split(sep).join('/'))
      .sort((a, b) => prioridad(a) - prioridad(b));

    console.log(`\nSubiendo ${archivos.length + 1} archivos a ${cfg.remoteDir} …`);
    if (args.has('--simular')) {
      archivos.forEach((a) => console.log(`  ${a}`));
      console.log('  .htaccess');
      return;
    }

    await cliente.ensureDir(cfg.remoteDir);
    const raiz = await cliente.pwd();
    let n = 0;
    for (const rel of archivos) {
      const destino = posix.join(raiz, rel);
      await cliente.ensureDir(posix.dirname(destino));
      await cliente.uploadFrom(join(DIST, ...rel.split('/')), posix.basename(destino));
      n += 1;
      if (n % 25 === 0 || rel === 'index.html') console.log(`  ${n}/${archivos.length}  ${rel}`);
    }
    // El .htaccess se sube al final de los assets pero antes que index.html nunca importa: no cambia el contenido.
    await cliente.cd(raiz);
    const { Readable } = await import('node:stream');
    await cliente.uploadFrom(Readable.from([HTACCESS_FINAL]), '.htaccess');
    console.log(`\nListo: ${n} archivos + .htaccess subidos.`);
  } finally {
    cliente.close();
  }
}

main().catch((err) => {
  console.error(`\nError: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
