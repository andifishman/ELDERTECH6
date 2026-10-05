// Servicio de contactos — habla con nuestro backend (eldertech-api), nunca
// directo con Supabase. El backend valida que el contacto pertenezca al
// residente autenticado antes de cualquier update/toggle/delete/foto (antes
// eso lo garantizaba RLS con la anon key; ahora el chequeo vive server-side).
import { apiClient } from './apiClient';
import type { ContactoResumen, ContactoUpsert, TipoContacto } from '@/types/database.types';

// ─── Lectura ──────────────────────────────────────────────────────────────────

export async function getContactos(_residenteId: string): Promise<ContactoResumen[]> {
  return apiClient.get<ContactoResumen[]>('/api/contacts');
}

export async function getTiposContacto(): Promise<TipoContacto[]> {
  return apiClient.get<TipoContacto[]>('/api/contacts/types');
}

// ─── Escritura ────────────────────────────────────────────────────────────────

export async function agregarContacto(payload: ContactoUpsert): Promise<ContactoResumen> {
  const { residente_id: _residenteId, ...body } = payload;
  return apiClient.post<ContactoResumen>('/api/contacts', body);
}

export async function actualizarContacto(id: string, updates: Partial<ContactoUpsert>): Promise<void> {
  const { residente_id: _residenteId, ...body } = updates;
  await apiClient.patch(`/api/contacts/${id}`, body);
}

export async function toggleFavorito(id: string, favorito: boolean): Promise<void> {
  await apiClient.patch(`/api/contacts/${id}/favorite`, { favorito });
}

export async function eliminarContacto(id: string): Promise<void> {
  await apiClient.delete(`/api/contacts/${id}`);
}

// ─── Helpers de teléfono (formato/normalización — pura presentación, sin red) ──

/**
 * Normaliza un número de teléfono argentino al formato internacional.
 * Ej: "011-4567-8901" → "+541145678901"
 * Ej: "15-6789-0123" → "+5491167890123"
 * Números que ya tienen "+" se devuelven sin cambios.
 */
export function normalizarTelefono(telefono: string): string {
  let clean = telefono.replace(/\D/g, '');

  if (telefono.startsWith('+')) return telefono.replace(/\s|-/g, '');

  if (clean.startsWith('0')) clean = clean.substring(1);
  if (clean.startsWith('9')) {
    return `+54${clean}`;
  }
  if (clean.length === 10) {
    return `+549${clean}`;
  }
  if (clean.length >= 11 && clean.startsWith('54')) {
    return `+${clean}`;
  }

  return `+${clean}`;
}

/**
 * Formatea un número argentino para mostrar en la UI.
 *
 * Casos:
 *   +5491145678901  → +54 9 11 4567-8901  (celular CABA, con 9)
 *   +541145678901   → +54 11 4567-8901    (fijo CABA, sin 9)
 *   +5492215678901  → +54 9 221 567-8901  (celular interior, área 3 dígitos)
 *   +542215678901   → +54 221 567-8901    (fijo interior)
 */
export function formatearTelefono(telefono: string): string {
  const clean = telefono.replace(/[\s\-()]/g, '');

  if (!clean.startsWith('+54')) return telefono;

  const sinPais = clean.substring(3);

  if (sinPais.startsWith('9')) {
    const sinNueve = sinPais.substring(1);

    if (sinNueve.startsWith('11')) {
      const area = sinNueve.substring(0, 2);
      const num = sinNueve.substring(2);
      return `+54 9 ${area} ${num.substring(0, 4)}-${num.substring(4)}`;
    }

    const area = sinNueve.substring(0, 3);
    const num = sinNueve.substring(3);
    if (num.length === 7) {
      return `+54 9 ${area} ${num.substring(0, 3)}-${num.substring(3)}`;
    }

    return `+54 9 ${sinNueve}`;
  }

  if (sinPais.startsWith('11')) {
    const area = sinPais.substring(0, 2);
    const num = sinPais.substring(2);
    return `+54 ${area} ${num.substring(0, 4)}-${num.substring(4)}`;
  }

  if (sinPais.length >= 10) {
    const area = sinPais.substring(0, 3);
    const num = sinPais.substring(3);
    return `+54 ${area} ${num.substring(0, 3)}-${num.substring(3)}`;
  }

  return telefono;
}

// ─── Foto ─────────────────────────────────────────────────────────────────────

/**
 * Sube una foto para un contacto y devuelve la URL pública. El backend valida
 * que el contacto sea del residente autenticado antes de subir nada.
 */
export async function uploadFotoContacto(contactoId: string, uri: string): Promise<string> {
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase() === 'png' ? 'png' : 'jpg';
  const formData = new FormData();
  formData.append('foto', { uri, type: ext === 'png' ? 'image/png' : 'image/jpeg', name: `foto.${ext}` } as unknown as Blob);

  const { url } = await apiClient.postForm<{ url: string }>(`/api/contacts/${contactoId}/photo`, formData);
  return url;
}
