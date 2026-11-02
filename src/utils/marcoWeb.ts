// Marco de la app en web: en pantallas anchas (tablet, escritorio) ElderTech se muestra
// como una columna centrada de hasta MAX_ANCHO_APP px — los mismos botones grandes — en
// lugar de estirar todo a 1400 px. Una tablet / iPad en vertical (hasta ~900 px) usa todo el
// ancho; las pantallas que lo necesitan (Home, Actividades) agregan columnas según el ancho.
//
// Varias pantallas calculan tamaños con `Dimensions.get('window').width` (tarjetas del
// Home, selector de días, videos, juegos…). Dentro de la columna, el ancho "real" para
// ellas es el de la columna, no el de la ventana; por eso se acota acá lo que RN-web
// informa. Este módulo se importa desde index.js (entrada de la app) ANTES que el
// router, porque algunas pantallas leen Dimensions al evaluarse el módulo.
import { Dimensions, Platform } from 'react-native';

export const MAX_ANCHO_APP = 900;

// ── Zoom de pantalla (tablets y pantallas grandes) ───────────────────────────────────────────
// Un celular muestra la app a tamaño "normal"; en una tablet o una compu eso queda diminuto
// (los adultos mayores no llegan a leer). En vez de rediseñar cada pantalla, se agranda TODO
// por igual (texto, botones, íconos, modales) con CSS `zoom` sobre <body>, y las pantallas
// "ven" una ventana más chica: la real dividida por el zoom — así siguen armando su layout
// como si estuvieran en un celular grande, y todo el contenido entra.
//
// El zoom es el mayor que deja el área lógica en, al menos, ANCHO_LOGICO_MIN × ALTO_LOGICO_MIN:
// justo lo que necesita la Home para verse entera (3 columnas, 2 filas), sin desplazarse. Un
// celular (≈390×844) queda en 1; una tablet en vertical (820×1180) ≈ 1,5; una compu o tablet
// horizontal (1280×800) ≈ 1,05 — ahí la altura manda y las tarjetas se estiran a lo alto.
const ANCHO_LOGICO_MIN = 540; // alcanza para que la Home arme 3 columnas (2 filas de tarjetas)
const ALTO_LOGICO_MIN = 760; // lo que ocupa la Home con 3 columnas (≈745): así se ve entera, sin desplazarse
const ZOOM_MAX = 2.2;

/** Zoom para una ventana de `ancho`×`alto` px (redondeado a 0,05 para no borronear el texto). */
export function zoomParaVentana(ancho: number, alto: number): number {
  const z = Math.min(ancho / ANCHO_LOGICO_MIN, alto / ALTO_LOGICO_MIN);
  return Math.round(Math.min(Math.max(z, 1), ZOOM_MAX) * 20) / 20;
}

//lo que queda a los costados de la columna (pantallas más anchas) se pinta del color del fondo de la app
const FONDO_LATERAL = '#E9E7EE';

interface Medidas {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
}

/** Lo que las pantallas deben "ver": la ventana real dividida por el zoom, con el ancho acotado a la columna. */
function logicas(medidas: Medidas): Medidas {
  const z = zoomParaVentana(medidas.width, medidas.height);
  return { ...medidas, width: Math.min(medidas.width / z, MAX_ANCHO_APP), height: medidas.height / z };
}

/**
 * Zoom actual de la página (1 en nativo y en celulares). Los eventos de puntero y `measureInWindow`
 * vienen en píxeles de pantalla — ya agrandados —, mientras el layout de las pantallas está en
 * píxeles lógicos: los juegos que arrastran sobre una grilla dividen por esto para compararlos.
 */
export function zoomActual(): number {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return 1;
  return Number((document.body.style as CSSStyleDeclaration & { zoom: string }).zoom) || 1;
}

function aplicarZoom(): void {
  const z = zoomParaVentana(window.innerWidth, window.innerHeight);
  document.documentElement.style.setProperty('--app-zoom', String(z));
  (document.body.style as CSSStyleDeclaration & { zoom: string }).zoom = String(z);
}

if (Platform.OS === 'web') {
  if (typeof document !== 'undefined') {
    document.documentElement.style.backgroundColor = FONDO_LATERAL;
    document.body.style.backgroundColor = FONDO_LATERAL;
    aplicarZoom();
    window.addEventListener('resize', aplicarZoom);
    window.addEventListener('orientationchange', aplicarZoom);
  }

  const get = Dimensions.get.bind(Dimensions);
  Dimensions.get = ((dimension: 'window' | 'screen') =>
    dimension === 'window' ? logicas(get('window')) : get(dimension)) as typeof Dimensions.get;

  const agregarOyente = Dimensions.addEventListener.bind(Dimensions);
  Dimensions.addEventListener = ((tipo: 'change', manejador: (e: { window: Medidas; screen: Medidas }) => void) =>
    agregarOyente(tipo, (e) => manejador({ ...e, window: logicas(e.window) }))) as typeof Dimensions.addEventListener;
}
