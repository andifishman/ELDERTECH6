// Config dinámica que extiende app.json (Expo la fusiona automáticamente:
// https://docs.expo.dev/workflow/configuration/#dynamic-configuration).
//
// Objetivo único acá: frenar el bug recurrente de EXPO_PUBLIC_API_URL
// apuntando a "localhost" en un build/update real (perfiles "preview" o
// "production" de eas.json, o cualquier export en NODE_ENV=production) —
// ese valor solo tiene sentido para `expo start` en la PC del developer. Si
// se cuela en un build/OTA real, el celular no puede alcanzar "localhost"
// (es el celular mismo) y todas las pantallas quedan sin datos.
//
// La defensa principal es .env.production (versionado a propósito, ver
// .gitignore): @expo/env lo carga automáticamente en cualquier export en
// modo producción, con prioridad sobre .env local, sin depender de que
// alguien se acuerde de pasar `--environment` a `eas update`. Este chequeo
// es la segunda capa, por si ese archivo se borra o queda vacío. La tercera
// es src/utils/apiUrlGuard.ts (pantalla de error en runtime si igual se
// coló algo malo). Ver CLAUDE.md, sección "APK/OTA sin datos de la base".
const LOCALHOST_PATTERN = /localhost|127\.0\.0\.1/i;

function validarApiUrlParaBuildsReales() {
  const profile = process.env.EAS_BUILD_PROFILE; // seteado por EAS Build; ausente en `expo start`/`eas update`
  // El perfil "development" (dev client) apunta al backend local a propósito
  // — nunca debe frenarse por esto, sin importar qué valga NODE_ENV ahí.
  if (profile === 'development') return;

  const esBuildDeDispositivoReal = profile === 'preview' || profile === 'production';
  // `eas update`/`expo export` no setean EAS_BUILD_PROFILE, pero sí exportan
  // con NODE_ENV=production por defecto (a diferencia de `expo start`) —
  // este chequeo cubre ese caso también.
  const esExportDeProduccion = process.env.NODE_ENV === 'production';
  if (!esBuildDeDispositivoReal && !esExportDeProduccion) return;

  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
  if (!apiUrl || LOCALHOST_PATTERN.test(apiUrl)) {
    const contexto = profile ?? process.env.NODE_ENV ?? 'desconocido';
    throw new Error(
      `\n\n[eldertech] EXPO_PUBLIC_API_URL="${apiUrl}" no es válida para este build/update ("${contexto}").\n` +
      `"localhost" solo funciona en la PC que corre \`expo start\` — en el celular no hay nada\n` +
      `escuchando ahí, así que el backend queda inalcanzable y la app se queda sin datos.\n\n` +
      `Arreglo permanente: revisar que .env.production tenga la URL real del backend desplegado\n` +
      `(Vercel) — se versiona a propósito y se carga solo en modo producción. También puede\n` +
      `configurarse por environment en EAS:\n\n` +
      `  eas env:set --environment preview|production --name EXPO_PUBLIC_API_URL --value <URL-real-del-backend> --visibility plaintext\n\n` +
      `Build/update cancelado antes de generar un APK/OTA roto.\n`,
    );
  }
}

validarApiUrlParaBuildsReales();

module.exports = ({ config }) => config;
