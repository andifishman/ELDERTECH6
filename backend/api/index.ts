import { trustSystemCertificates } from '../src/bootstrap/trustSystemCertificates';
import { createApp } from '../src/app';

// No-op en Linux (donde corre Vercel) — solo hace algo si el proceso corre en
// Windows detrás de un proxy que intercepta TLS (ver bootstrap/trustSystemCertificates.ts).
trustSystemCertificates();

// Vercel Node runtime acepta un handler (req, res) => void como default export —
// una app de Express ya tiene exactamente esa forma, así que se exporta directo.
// Este es el único archivo bajo /api: el rewrite en vercel.json manda TODO
// tráfico acá (antes se usaba un catch-all `[[...path]].ts`, pero Vercel solo
// enrutaba paths de un segmento tipo /api/tutorials — cualquier ruta anidada
// como /api/assistant/faq daba 404 antes de llegar a Express). Todas las
// rutas reales viven en src/routes/*, montadas por createApp().
export default createApp();
