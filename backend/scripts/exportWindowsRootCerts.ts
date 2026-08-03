// Exporta las autoridades certificadoras raíz del almacén de Windows a un
// archivo .pem, para usar con NODE_EXTRA_CA_CERTS (ver script "dev" en
// package.json y src/bootstrap/trustSystemCertificates.ts).
//
// Necesario en redes con inspección TLS (proxy corporativo/escolar,
// antivirus) que instalan su propio certificado raíz en Windows: el sistema
// operativo confía en él, pero `fetch`/undici (usado por supabase-js) no,
// porque no lee el almacén de certificados de Windows — de ahí el error
// SELF_SIGNED_CERT_IN_CHAIN en toda llamada saliente (Supabase, Groq,
// Open-Meteo).
//
// Se corre una sola vez (o cuando cambien los certificados de la red):
//   npm run setup:certs
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Se corre antes de cada `npm run dev` (ver "predev" en package.json). No es
// Windows o falla el store nativo → no pasa nada, solo se loguea y se sigue:
// este paso es un extra de confiabilidad, no debe bloquear el arranque.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ca = require('win-ca/api');
  const certs: string[] = [];

  ca({
    format: ca.der2.pem,
    store: ['root', 'ca'],
    ondata: (crt: string) => certs.push(crt),
    onend: () => {
      if (certs.length === 0) {
        console.warn('No se encontraron certificados en el almacén de Windows — nada para exportar (normal fuera de Windows).');
        return;
      }
      const outPath = join(__dirname, '..', 'win-ca-roots.pem');
      writeFileSync(outPath, certs.join('\n'), 'utf8');
      console.log(`${certs.length} certificados exportados a ${outPath}`);
    },
  });
} catch (err) {
  console.warn(
    'No se pudieron exportar los certificados de Windows — si ves SELF_SIGNED_CERT_IN_CHAIN en llamadas ' +
      'salientes (Supabase, Groq, Open-Meteo), corré "npm run setup:certs" a mano.',
    err instanceof Error ? err.message : err,
  );
}
