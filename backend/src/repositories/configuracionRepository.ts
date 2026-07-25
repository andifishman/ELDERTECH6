import { getSupabaseAdmin } from './supabaseAdmin';

export interface Organizacion {
  id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string;
  timezone: string;
  logo_url?: string | null;
  activo: boolean;
  created_at: string;
}

export async function obtenerOrganizacion(organizacionId: string): Promise<Organizacion | null> {
  const { data, error } = await getSupabaseAdmin().from('organizaciones').select('*').eq('id', organizacionId).maybeSingle();
  if (error) throw new Error(`Error al cargar la organización: ${error.message}`);
  return (data as Organizacion) ?? null;
}

export interface ActualizarOrganizacionInput {
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  logo_url: string | null;
}

export async function actualizarOrganizacion(organizacionId: string, input: ActualizarOrganizacionInput): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('organizaciones')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', organizacionId);
  if (error) throw new Error(`Error al guardar la configuración: ${error.message}`);
}
