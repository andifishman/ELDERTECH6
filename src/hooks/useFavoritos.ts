/**
 * useFavoritos.ts
 * ───────────────
 * Re-exporta el contexto global de favoritos como hook,
 * manteniendo la misma API de antes para no romper nada.
 */

export { useFavoritosContext as useFavoritos } from '@/context/FavoritosContext';
