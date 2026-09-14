// Detecta fallas de red genéricas — tanto `fetch` (usado por apiClient) como
// el cliente de Supabase (login, antes de tener sesión) tiran exactamente el
// mismo error en React Native cuando no hay conexión: un TypeError con este
// mensaje fijo, igual en Android/iOS/web. No es un error del servidor (eso
// ya tiene su propio manejo vía ApiError) — es "no se pudo ni siquiera armar
// la conexión".
const MENSAJE_FETCH_RN = 'Network request failed';

export function esErrorDeRed(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.message.includes(MENSAJE_FETCH_RN);
}

export const MENSAJE_ERROR_DE_RED =
  'No se pudo conectar a internet. Revisá tu conexión de WiFi e intentá de nuevo.';
