/**
 * radioService.ts
 * ───────────────
 * Servicio de radios — habla con nuestro backend (eldertech-api), nunca
 * directo con Supabase. El backend arma el catálogo (Supabase con overrides
 * de URL, con fallback a un catálogo hardcodeado si Supabase falla o está
 * vacío) — el cliente ya no sabe de dónde vino la data.
 */
import { apiClient } from './apiClient';
import type { RadioData } from '@/types/radio.types';

/** Catálogo completo de radios, categorías y países. */
export async function getRadioData(): Promise<RadioData> {
  return apiClient.get<RadioData>('/api/radio');
}

/**
 * Resuelve la URL final de reproducción de una estación. Para la mayoría de
 * las radios devuelve la misma `urlStream` sin cambios — solo tiene efecto
 * real en las 6 emisoras StreamTheWorld/Triton cuya URL estática expira (ver
 * `.claude/RADIO_RESEARCH.md`), donde el backend resuelve el redirect dinámico
 * server-side y lo cachea 15 min.
 */
export async function resolverStreamFinal(radioId: string): Promise<string> {
  const { url } = await apiClient.get<{ url: string }>(`/api/radio/${radioId}/resolve`);
  return url;
}
