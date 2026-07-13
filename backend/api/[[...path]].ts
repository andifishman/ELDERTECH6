import { trustSystemCertificates } from '../src/bootstrap/trustSystemCertificates';
import { createApp } from '../src/app';

// No-op en Linux (donde corre Vercel) — solo hace algo si el proceso corre en
// Windows detrás de un proxy que intercepta TLS (ver bootstrap/trustSystemCertificates.ts).
trustSystemCertificates();

// Vercel Node runtime acepta un handler (req, res) => void como default export —
// una app de Express ya tiene exactamente esa forma, así que se exporta directo.
// Este catch-all (`[[...path]]`) es el único archivo bajo /api: todas las rutas
// reales viven en src/routes/*, montadas por createApp().
export default createApp();
