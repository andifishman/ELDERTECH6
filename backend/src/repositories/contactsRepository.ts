import { getSupabaseAdmin } from './supabaseAdmin';

export interface TipoContacto {
  id: string;
  nombre: string;
  emoji: string | null;
  orden: number;
}

export interface ContactoResumen {
  id: string;
  nombre: string;
  apellido: string | null;
  telefono: string;
  whatsapp_disponible: boolean;
  foto_url: string | null;
  favorito: boolean;
  orden: number;
  tipo_contacto: TipoContacto | null;
}

export interface ContactoUpsert {
  residente_id: string;
  nombre: string;
  apellido?: string | null;
  telefono: string;
  whatsapp_disponible?: boolean;
  foto_url?: string | null;
  origen_contacto?: 'dispositivo' | 'manual';
  contacto_device_id?: string | null;
  favorito?: boolean;
  orden?: number;
  tipo_contacto_id?: string | null;
  notas?: string | null;
}

const CONTACTO_SELECT = `
  id, nombre, apellido, telefono, whatsapp_disponible, foto_url, favorito, orden,
  tipo_contacto:tipos_contacto(id, nombre, emoji, orden)
`;

type ContactoRow = Omit<ContactoResumen, 'tipo_contacto'> & { tipo_contacto: TipoContacto | TipoContacto[] | null };

function mapContactoRow(row: ContactoRow): ContactoResumen {
  return { ...row, tipo_contacto: Array.isArray(row.tipo_contacto) ? (row.tipo_contacto[0] ?? null) : row.tipo_contacto };
}

export async function getContactos(residenteId: string): Promise<ContactoResumen[]> {
  const { data, error } = await getSupabaseAdmin()
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

export async function getTiposContacto(): Promise<TipoContacto[]> {
  const { data, error } = await getSupabaseAdmin().from('tipos_contacto').select('id, nombre, emoji, orden').order('orden', { ascending: true });
  if (error) throw new Error(`Error al cargar tipos: ${error.message}`);
  return (data ?? []) as TipoContacto[];
}

export async function existeContactoPorDeviceId(residenteId: string, deviceId: string): Promise<boolean> {
  const { data } = await getSupabaseAdmin()
    .from('contactos')
    .select('id')
    .eq('residente_id', residenteId)
    .eq('contacto_device_id', deviceId)
    .eq('activo', true)
    .maybeSingle();
  return data !== null;
}

export async function crearContacto(payload: ContactoUpsert): Promise<ContactoResumen> {
  const { data, error } = await getSupabaseAdmin()
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

/** Dueño real del contacto — usado para validar ownership antes de update/toggle/delete/foto. */
export async function getResidenteIdDeContacto(id: string): Promise<string | null> {
  const { data } = await getSupabaseAdmin().from('contactos').select('residente_id').eq('id', id).maybeSingle();
  return data?.residente_id ?? null;
}

export async function actualizarContacto(id: string, updates: Partial<ContactoUpsert>): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('contactos')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`Error al actualizar contacto: ${error.message}`);
}

export async function toggleFavorito(id: string, favorito: boolean): Promise<void> {
  const { error } = await getSupabaseAdmin().from('contactos').update({ favorito, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`Error al actualizar favorito: ${error.message}`);
}

/** Soft delete — pone activo=false, igual que hacía el cliente. */
export async function eliminarContacto(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from('contactos').update({ activo: false, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`Error al eliminar contacto: ${error.message}`);
}

/** Sube la foto al bucket `fotos-perfil` — antes lo hacía el cliente con supabase.storage directo. */
export async function subirFotoContacto(contactoId: string, buffer: Buffer, contentType: string): Promise<string> {
  const ext = contentType === 'image/png' ? 'png' : 'jpg';
  const path = `contactos/${contactoId}.${ext}`;

  const { error } = await getSupabaseAdmin().storage.from('fotos-perfil').upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Error al subir la foto: ${error.message}`);

  const { data } = getSupabaseAdmin().storage.from('fotos-perfil').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
