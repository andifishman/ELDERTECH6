import { withRepoLogging } from '../logging/repoLogger';
import { getSupabaseAdmin } from './supabaseAdmin';

const REPO = 'familiaAccesoRepository';

export interface Institucion {
  id: string;
  nombre: string;
}

export interface SolicitudAcceso {
  id: string;
  organizacion_id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  telefono: string | null;
  residente_texto: string | null;
  parentesco: string | null;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  intentos: number;
  familiar_id: string | null;
  resuelto_en: string | null;
  created_at: string;
  updated_at: string;
}

const COLUMNAS = 'id, organizacion_id, email, nombre, apellido, telefono, residente_texto, parentesco, estado, intentos, familiar_id, resuelto_en, created_at, updated_at';

export const listarInstitucionesActivas = withRepoLogging(REPO, 'listarInstitucionesActivas', async (): Promise<Institucion[]> => {
  const { data, error } = await getSupabaseAdmin().from('organizaciones').select('id, nombre').eq('activo', true).order('nombre', { ascending: true });
  if (error) throw new Error(`Error al cargar las instituciones: ${error.message}`);
  return (data ?? []) as Institucion[];
});

export const contarPendientes = withRepoLogging(REPO, 'contarPendientes', async (organizacionId: string): Promise<number> => {
  const { count, error } = await getSupabaseAdmin()
    .from('familia_solicitudes_acceso')
    .select('id', { count: 'exact', head: true })
    .eq('organizacion_id', organizacionId)
    .eq('estado', 'pendiente');
  if (error) throw new Error(`Error al contar las solicitudes: ${error.message}`);
  return count ?? 0;
});

export const registrarSolicitud = withRepoLogging(
  REPO,
  'registrarSolicitud',
  async (input: { organizacionId: string; email: string; nombre: string | null; apellido: string | null; telefono: string | null; residenteTexto: string | null; parentesco: string | null }): Promise<{ id: string; nueva: boolean }> => {
    const { data, error } = await getSupabaseAdmin().rpc('familia_registrar_solicitud', {
      p_organizacion: input.organizacionId,
      p_email: input.email,
      p_nombre: input.nombre,
      p_apellido: input.apellido,
      p_telefono: input.telefono,
      p_residente_texto: input.residenteTexto,
      p_parentesco: input.parentesco,
    });
    if (error) throw new Error(`Error al registrar la solicitud: ${error.message}`);
    const fila = (Array.isArray(data) ? data[0] : data) as { id: string; nueva: boolean } | undefined;
    if (!fila) throw new Error('Error al registrar la solicitud: respuesta vacía');
    return fila;
  },
);

export const listarSolicitudes = withRepoLogging(REPO, 'listarSolicitudes', async (organizacionId: string): Promise<SolicitudAcceso[]> => {
  const { data, error } = await getSupabaseAdmin()
    .from('familia_solicitudes_acceso')
    .select(COLUMNAS)
    .eq('organizacion_id', organizacionId)
    .order('estado', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(`Error al cargar las solicitudes: ${error.message}`);
  return (data ?? []) as SolicitudAcceso[];
});

export const obtenerSolicitud = withRepoLogging(REPO, 'obtenerSolicitud', async (id: string): Promise<SolicitudAcceso | null> => {
  const { data, error } = await getSupabaseAdmin().from('familia_solicitudes_acceso').select(COLUMNAS).eq('id', id).maybeSingle();
  if (error) throw new Error(`Error al cargar la solicitud: ${error.message}`);
  return (data as SolicitudAcceso | null) ?? null;
});

/** Cierra una solicitud que sigue pendiente. Devuelve false si ya la había resuelto otra persona. */
export const resolverSolicitud = withRepoLogging(
  REPO,
  'resolverSolicitud',
  async (id: string, estado: 'aprobada' | 'rechazada', usuarioId: string, familiarId: string | null): Promise<boolean> => {
    const { data, error } = await getSupabaseAdmin()
      .from('familia_solicitudes_acceso')
      .update({ estado, resuelto_por: usuarioId, resuelto_en: new Date().toISOString(), familiar_id: familiarId })
      .eq('id', id)
      .eq('estado', 'pendiente')
      .select('id')
      .maybeSingle();
    if (error) throw new Error(`Error al resolver la solicitud: ${error.message}`);
    return data !== null;
  },
);
