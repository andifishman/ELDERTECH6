// Punto de entrada. Antes de cargar expo-router (y con él todas las pantallas):
//  - marcoWeb acota el ancho que ven las pantallas en web y es un no-op en Android/iOS.
//  - el color de marca de la institución se aplica a `Colors` ANTES de que las pantallas calculen sus estilos
//    (ver src/theme/temaInstitucion.ts). Es una lectura local rápida y nunca bloquea el arranque más de unas décimas.
import './src/utils/marcoWeb';
import { cargarYAplicarColor } from './src/theme/temaInstitucion';

cargarYAplicarColor().finally(() => {
  require('expo-router/entry');
});
