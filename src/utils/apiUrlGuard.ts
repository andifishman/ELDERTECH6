// Guardia contra el bug recurrente: EXPO_PUBLIC_API_URL apuntando a
// "localhost" en un build que corre en un celular real (APK / OTA).
//
// En una PC de desarrollo "localhost" es la PC. En el celular, "localhost" es
// el celular mismo — no hay backend ahí, así que todo fetch al BFF falla y
// las pantallas quedan sin datos, sin ningún error visible (ver CLAUDE.md).
// Esto pasó varias veces porque el build/OTA se publicó con el valor del
// .env local (pensado solo para `expo start`) en vez de la URL real del
// backend desplegado. Ver eas.json + `eas env:create` para el fix de fondo:
// las variables de entorno "preview"/"production" alojadas en EAS deben
// tener la URL real y así nunca dependen del .env de la máquina que build-ea.
const LOCALHOST_PATTERN = /localhost|127\.0\.0\.1/i;

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export const apiUrlMisconfigurada = !__DEV__ && (!API_URL || LOCALHOST_PATTERN.test(API_URL));
