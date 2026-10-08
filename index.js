// Punto de entrada. Solo agrega un import antes de expo-router/entry (el original de package.json):
// marcoWeb acota el ancho que ven las pantallas en web y es un no-op en Android/iOS.
import './src/utils/marcoWeb';
import 'expo-router/entry';
