// Marco de la app en web: en pantallas anchas (tablet, escritorio) ElderTech se muestra
// como una columna centrada de hasta MAX_ANCHO_APP px — el mismo diseño de celular, con
// los mismos botones grandes — en lugar de estirar todo a 1400 px de ancho.
//
// Varias pantallas calculan tamaños con `Dimensions.get('window').width` (tarjetas del
// Home, selector de días, videos, juegos…). Dentro de la columna, el ancho "real" para
// ellas es el de la columna, no el de la ventana; por eso se acota acá lo que RN-web
// informa. Este módulo se importa desde index.js (entrada de la app) ANTES que el
// router, porque algunas pantallas leen Dimensions al evaluarse el módulo.
import { Dimensions, Platform } from 'react-native';

export const MAX_ANCHO_APP = 600;

interface Medidas {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
}

function acotar(medidas: Medidas): Medidas {
  return medidas.width > MAX_ANCHO_APP ? { ...medidas, width: MAX_ANCHO_APP } : medidas;
}

if (Platform.OS === 'web') {
  const get = Dimensions.get.bind(Dimensions);
  Dimensions.get = ((dimension: 'window' | 'screen') =>
    dimension === 'window' ? acotar(get('window')) : get(dimension)) as typeof Dimensions.get;

  const agregarOyente = Dimensions.addEventListener.bind(Dimensions);
  Dimensions.addEventListener = ((tipo: 'change', manejador: (e: { window: Medidas; screen: Medidas }) => void) =>
    agregarOyente(tipo, (e) => manejador({ ...e, window: acotar(e.window) }))) as typeof Dimensions.addEventListener;
}
