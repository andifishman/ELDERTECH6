// Servicio de contactos — CRUD completo en Supabase para el módulo Llamar
import { supabase } from './supabase';
import type {
  ContactoResumen,
  ContactoUpsert,
  TipoContacto,
} from '@/types/database.types';

const CONTACTO_SELECT = `
  id,
  nombre,
  apellido,
  telefono,
  whatsapp_disponible,
  foto_url,
  favorito,
  orden,
  tipo_contacto:tipos_contacto(id, nombre, emoji, orden)
`;

// El join de Supabase puede devolver tipo_contacto como array — normalizar a objeto/null
type ContactoRow = Omit<ContactoResumen, 'tipo_contacto'> & {
  tipo_contacto: TipoContacto | TipoContacto[] | null;
};

function mapContactoRow(row: ContactoRow): ContactoResumen {
  return {
    ...row,
    tipo_contacto: Array.isArray(row.tipo_contacto)
      ? row.tipo_contacto[0] ?? null
      : row.tipo_contacto,
  };
}

// ─── Lectura ──────────────────────────────────────────────────────────────────

/**
 * Devuelve todos los contactos activos de un residente.
 * Orden: favoritos primero → orden ASC → nombre ASC
 */
export async function getContactos(
  residenteId: string,
): Promise<ContactoResumen[]> {
  const { data, error } = await supabase
    .from('contactos')
    .select(CONTACTO_SELECT)
    .eq('residente_id', residenteId)
    .eq('activo', true)
    .order('favorito', { ascending: false })
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true });

  if (error) throw new Error(`Error al cargar contactos: ${error.message}`);
  return ((data ?? []) as unknown as ContactoRow[]).map(mapContactoRow);
}

/**
 * Devuelve solo los contactos marcados como favoritos.
 */
export async function getContactosFavoritos(
  residenteId: string,
): Promise<ContactoResumen[]> {
  const { data, error } = await supabase
    .from('contactos')
    .select(CONTACTO_SELECT)
    .eq('residente_id', residenteId)
    .eq('activo', true)
    .eq('favorito', true)
    .order('orden', { ascending: true });

  if (error) throw new Error(`Error al cargar favoritos: ${error.message}`);
  return ((data ?? []) as unknown as ContactoRow[]).map(mapContactoRow);
}

/**
 * Devuelve todos los tipos de contacto disponibles.
 */
export async function getTiposContacto(): Promise<TipoContacto[]> {
  const { data, error } = await supabase
    .from('tipos_contacto')
    .select('id, nombre, emoji, orden')
    .order('orden', { ascending: true });

  if (error) throw new Error(`Error al cargar tipos: ${error.message}`);
  return (data ?? []) as TipoContacto[];
}

// ─── Escritura ────────────────────────────────────────────────────────────────

/**
 * Agrega un nuevo contacto.
 * Si el contacto ya existe (mismo contacto_device_id), no lo duplica.
 */
export async function agregarContacto(
  payload: ContactoUpsert,
): Promise<ContactoResumen> {
  // Si viene del dispositivo, verificar si ya existe por device_id
  if (payload.contacto_device_id) {
    const { data: existente } = await supabase
      .from('contactos')
      .select('id')
      .eq('residente_id', payload.residente_id)
      .eq('contacto_device_id', payload.contacto_device_id)
      .eq('activo', true)
      .maybeSingle();

    if (existente) {
      throw new Error('Este contacto ya está en tu lista.');
    }
  }

  const { data, error } = await supabase
    .from('contactos')
    .insert({
      ...payload,
      activo: true,
      whatsapp_disponible: payload.whatsapp_disponible ?? true,
      favorito: payload.favorito ?? false,
      orden: payload.orden ?? 0,
      origen_contacto: payload.origen_contacto ?? 'manual',
    })
    .select(CONTACTO_SELECT)
    .single();

  if (error) throw new Error(`Error al guardar contacto: ${error.message}`);
  return mapContactoRow(data as unknown as ContactoRow);
}

/**
 * Actualiza un contacto existente (favorito, whatsapp, foto, etc.)
 */
export async function actualizarContacto(
  id: string,
  updates: Partial<ContactoUpsert>,
): Promise<void> {
  const { error } = await supabase
    .from('contactos')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`Error al actualizar contacto: ${error.message}`);
}

/**
 * Marca/desmarca un contacto como favorito.
 */
export async function toggleFavorito(
  id: string,
  favorito: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('contactos')
    .update({ favorito, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`Error al actualizar favorito: ${error.message}`);
}

/**
 * Elimina un contacto (soft delete — pone activo = false).
 */
export async function eliminarContacto(id: string): Promise<void> {
  const { error } = await supabase
    .from('contactos')
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`Error al eliminar contacto: ${error.message}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normaliza un número de teléfono argentino al formato internacional.
 * Ej: "011-4567-8901" → "+541145678901"
 * Ej: "15-6789-0123" → "+5491167890123"
 * Números que ya tienen "+" se devuelven sin cambios.
 */
export function normalizarTelefono(telefono: string): string {
  // Solo dígitos
  let clean = telefono.replace(/\D/g, '');

  // Ya tiene código de país
  if (telefono.startsWith('+')) return telefono.replace(/\s|-/g, '');

  // Argentina — agregar +54
  if (clean.startsWith('0')) clean = clean.substring(1); // quitar el 0 inicial
  if (clean.startsWith('9')) {
    return `+54${clean}`;
  }
  // Celulares argentinos necesitan "9" entre +54 y el área
  if (clean.length === 10) {
    return `+549${clean}`;
  }
  // Si ya tiene 11 dígitos (54...)
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

  const sinPais = clean.substring(3); // quita "+54"

  // Celular argentino: empieza con 9
  if (sinPais.startsWith('9')) {
    const sinNueve = sinPais.substring(1); // quita el "9"

    // CABA / GBA: código de área 2 dígitos (11 → 8 dígitos de abonado)
    // Nota: "15" es prefijo local de celular, nunca aparece después de +54 9
    if (sinNueve.startsWith('11')) {
      const area = sinNueve.substring(0, 2);
      const num  = sinNueve.substring(2);
      return `+54 9 ${area} ${num.substring(0, 4)}-${num.substring(4)}`;
    }

    // Interior: código de área 3 dígitos (221, 351, etc. → 7 dígitos de abonado)
    const area = sinNueve.substring(0, 3);
    const num  = sinNueve.substring(3);
    if (num.length === 7) {
      return `+54 9 ${area} ${num.substring(0, 3)}-${num.substring(3)}`;
    }

    // Genérico con 9
    return `+54 9 ${sinNueve}`;
  }

  // Fijo argentino (sin 9)
  // CABA: área 2 dígitos
  if (sinPais.startsWith('11')) {
    const area = sinPais.substring(0, 2);
    const num  = sinPais.substring(2);
    return `+54 ${area} ${num.substring(0, 4)}-${num.substring(4)}`;
  }

  // Interior fijo: área 3 dígitos
  if (sinPais.length >= 10) {
    const area = sinPais.substring(0, 3);
    const num  = sinPais.substring(3);
    return `+54 ${area} ${num.substring(0, 3)}-${num.substring(3)}`;
  }

  return telefono;
}

/**
 * Sube una foto para un contacto y devuelve la URL pública.
 * Usa compresión alta (quality 0.5) para carga rápida.
 */
export async function uploadFotoContacto(
  contactoId: string,
  uri: string,
): Promise<string> {
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase() === 'png' ? 'png' : 'jpg';
  const path = `contactos/${contactoId}.${ext}`;
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

  let blob: Blob;

  // En web, expo-image-picker devuelve una URL blob: o data: — fetch() las maneja bien
  // En nativo, usamos XMLHttpRequest para content:// y file:// URIs
  if (uri.startsWith('blob:') || uri.startsWith('data:') || uri.startsWith('http')) {
    const response = await fetch(uri);
    blob = await response.blob();
  } else {
    blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new Error('No se pudo leer la imagen'));
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });
  }

  const { error } = await supabase.storage
    .from('fotos-perfil')
    .upload(path, blob, { contentType, upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from('fotos-perfil').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
