import { logger } from '../logging/logger';

/**
 * En Windows, Node no usa el almacén de certificados del sistema operativo —
 * trae su propia lista hardcodeada de autoridades certificadoras. Si la red
 * intercepta TLS (proxy corporativo/escolar, antivirus con inspección HTTPS)
 * e instala su propio certificado raíz en Windows, el navegador confía en él
 * (porque usa el almacén del sistema) pero Node no — y toda llamada saliente
 * (Supabase, Groq, Open-Meteo) falla con SELF_SIGNED_CERT_IN_CHAIN.
 *
 * OJO: esto solo cubre el módulo `https` clásico de Node — Supabase (y el
 * `fetch` nativo en general) usan `undici`, que NO lo respeta. El arreglo
 * real para `fetch`/`undici` es `NODE_EXTRA_CA_CERTS` (ver
 * `scripts/exportWindowsRootCerts.ts` y el script "dev" en package.json).
 * Esto queda como capa extra de todos modos, por si alguna dependencia usa
 * `https.request` directo. No hace nada en otros sistemas operativos (Linux
 * en producción, por ejemplo) — seguro de llamar siempre.
 */
export function trustSystemCertificates(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('win-ca');
  } catch (err) {
    logger.warn('No se pudo cargar win-ca — si ves SELF_SIGNED_CERT_IN_CHAIN en llamadas salientes, revisá la instalación.', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
