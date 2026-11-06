import { env } from '../config/env';
import { withRepoLogging } from '../logging/repoLogger';
import { getSupabaseAdmin } from './supabaseAdmin';

const REPO = 'familiaRepository';

export interface Familiar {
  id: string;
  organizacion_id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  activo: boolean;
  invitado_en: string | null;
  ultimo_acceso: string | null;
  created_at: string;
}

export interface ResidenteResumen {
  id: string;
  nombre: string;
  apellido: string;
  nombre_completo: string | null;
  seccion: string | null;
  habitacion: string | null;
}

export interface VinculoConResidente {
  id: string;
  familiar_id: string;
  residente_id: string;
  parentesco: string | null;
  activo: boolean;
  revocado_en: string | null;
  created_at: string;
  residente: ResidenteResumen | null;
}

export interface FamiliarConVinculos extends Familiar {
  vinculos: VinculoConResidente[];
}

const COLUMNAS_FAMILIAR = 'id, organizacion_id, nombre, apellido, email, telefono, activo, invitado_en, ultimo_acceso, created_at';
const COLUMNAS_RESIDENTE = 'id, nombre, apellido, nombre_completo, seccion, habitacion';
const COLUMNAS_VINCULO = `id, familiar_id, residente_id, parentesco, activo, revocado_en, created_at, residente:residentes(${COLUMNAS_RESIDENTE})`;

// ─── Familiares ──────────────────────────────────────────────────────────────

export const obtenerFamiliar = withRepoLogging(REPO, 'obtenerFamiliar', async (id: string): Promise<Familiar | null> => {
  const { data, error } = await getSupabaseAdmin().from('familiares').select(COLUMNAS_FAMILIAR).eq('id', id).maybeSingle();
  if (error) throw new Error(`Error al cargar el familiar: ${error.message}`);
  return (data as Familiar | null) ?? null;
});

export const obtenerFamiliarPorEmail = withRepoLogging(REPO, 'obtenerFamiliarPorEmail', async (email: string): Promise<Familiar | null> => {
  const { data, error } = await getSupabaseAdmin().from('familiares').select(COLUMNAS_FAMILIAR).eq('email', email.toLowerCase()).maybeSingle();
  if (error) throw new Error(`Error al buscar el familiar: ${error.message}`);
  return (data as Familiar | null) ?? null;
});

export interface CrearFamiliarInput {
  id: string;
  organizacionId: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  creadoPor: string;
}

/** Crea el perfil (rol familiar) y la ficha. Si la ficha falla, deshace el perfil. */
export const crearFamiliar = withRepoLogging(REPO, 'crearFamiliar', async (input: CrearFamiliarInput): Promise<Familiar> => {
  const db = getSupabaseAdmin();
  const { error: errorPerfil } = await db.from('perfiles_usuario').insert({
    id: input.id,
    organizacion_id: input.organizacionId,
    residente_id: null,
    username: input.email.toLowerCase(),
    rol: 'familiar',
    activo: true,
  });
  if (errorPerfil) throw new Error(`Error al crear el perfil del familiar: ${errorPerfil.message}`);

  const { data, error } = await db
    .from('familiares')
    .insert({
      id: input.id,
      organizacion_id: input.organizacionId,
      nombre: input.nombre,
      apellido: input.apellido,
      email: input.email.toLowerCase(),
      telefono: input.telefono,
      invitado_en: new Date().toISOString(),
      creado_por: input.creadoPor,
    })
    .select(COLUMNAS_FAMILIAR)
    .single();
  if (error) {
    await db.from('perfiles_usuario').delete().eq('id', input.id);
    throw new Error(`Error al crear el familiar: ${error.message}`);
  }
  return data as Familiar;
});

export const actualizarFamiliar = withRepoLogging(
  REPO,
  'actualizarFamiliar',
  async (id: string, cambios: { nombre?: string; apellido?: string; telefono?: string | null; activo?: boolean }): Promise<Familiar> => {
    const db = getSupabaseAdmin();
    const { data, error } = await db.from('familiares').update(cambios).eq('id', id).select(COLUMNAS_FAMILIAR).single();
    if (error) throw new Error(`Error al actualizar el familiar: ${error.message}`);
    // Deshabilitar al familiar también deshabilita su perfil: requireAuth ya lo rechaza en cualquier endpoint.
    if (cambios.activo !== undefined) {
      const { error: errorPerfil } = await db.from('perfiles_usuario').update({ activo: cambios.activo }).eq('id', id);
      if (errorPerfil) throw new Error(`Error al actualizar el perfil del familiar: ${errorPerfil.message}`);
    }
    return data as Familiar;
  },
);

export const registrarAcceso = withRepoLogging(REPO, 'registrarAcceso', async (id: string): Promise<void> => {
  const { error } = await getSupabaseAdmin().from('familiares').update({ ultimo_acceso: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`Error al registrar el acceso: ${error.message}`);
});

export const marcarInvitado = withRepoLogging(REPO, 'marcarInvitado', async (id: string): Promise<void> => {
  const { error } = await getSupabaseAdmin().from('familiares').update({ invitado_en: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`Error al registrar la invitación: ${error.message}`);
});

export const listarFamiliares = withRepoLogging(REPO, 'listarFamiliares', async (organizacionId: string): Promise<FamiliarConVinculos[]> => {
  const { data, error } = await getSupabaseAdmin()
    .from('familiares')
    .select(`${COLUMNAS_FAMILIAR}, vinculos:vinculos_familiares(${COLUMNAS_VINCULO})`)
    .eq('organizacion_id', organizacionId)
    .order('apellido', { ascending: true });
  if (error) throw new Error(`Error al cargar los familiares: ${error.message}`);
  return (data ?? []) as unknown as FamiliarConVinculos[];
});

export const listarFamiliaresDeResidente = withRepoLogging(
  REPO,
  'listarFamiliaresDeResidente',
  async (organizacionId: string, residenteId: string): Promise<Array<Familiar & { vinculo_id: string; parentesco: string | null; vinculo_activo: boolean }>> => {
    const { data, error } = await getSupabaseAdmin()
      .from('vinculos_familiares')
      .select(`id, parentesco, activo, familiar:familiares(${COLUMNAS_FAMILIAR})`)
      .eq('organizacion_id', organizacionId)
      .eq('residente_id', residenteId);
    if (error) throw new Error(`Error al cargar los familiares del residente: ${error.message}`);
    const filas = (data ?? []) as unknown as Array<{ id: string; parentesco: string | null; activo: boolean; familiar: Familiar | null }>;
    return filas.flatMap((f) => (f.familiar ? [{ ...f.familiar, vinculo_id: f.id, parentesco: f.parentesco, vinculo_activo: f.activo }] : []));
  },
);

// ─── Vínculos ────────────────────────────────────────────────────────────────

export const obtenerVinculo = withRepoLogging(REPO, 'obtenerVinculo', async (id: string): Promise<(VinculoConResidente & { organizacion_id: string }) | null> => {
  const { data, error } = await getSupabaseAdmin()
    .from('vinculos_familiares')
    .select(`${COLUMNAS_VINCULO}, organizacion_id`)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Error al cargar el vínculo: ${error.message}`);
  return (data as unknown as (VinculoConResidente & { organizacion_id: string }) | null) ?? null;
});

/** Vínculos ACTIVOS de un familiar con residentes también activos — es lo que define qué puede ver. */
export const listarVinculosActivos = withRepoLogging(REPO, 'listarVinculosActivos', async (familiarId: string): Promise<VinculoConResidente[]> => {
  const { data, error } = await getSupabaseAdmin()
    .from('vinculos_familiares')
    .select(COLUMNAS_VINCULO)
    .eq('familiar_id', familiarId)
    .eq('activo', true);
  if (error) throw new Error(`Error al cargar los vínculos: ${error.message}`);
  const filas = (data ?? []) as unknown as VinculoConResidente[];
  return filas.filter((v) => v.residente !== null);
});

/** Cuántos de los residentes dados son realmente de esa institución y están activos. */
export const contarResidentesDeOrganizacion = withRepoLogging(
  REPO,
  'contarResidentesDeOrganizacion',
  async (organizacionId: string, residenteIds: string[]): Promise<number> => {
    if (residenteIds.length === 0) return 0;
    const { count, error } = await getSupabaseAdmin()
      .from('residentes')
      .select('id', { count: 'exact', head: true })
      .eq('organizacion_id', organizacionId)
      .eq('activo', true)
      .in('id', residenteIds);
    if (error) throw new Error(`Error al verificar los residentes: ${error.message}`);
    return count ?? 0;
  },
);

export const crearOReactivarVinculo = withRepoLogging(
  REPO,
  'crearOReactivarVinculo',
  async (input: { organizacionId: string; familiarId: string; residenteId: string; parentesco: string | null; creadoPor: string }): Promise<string> => {
    const { data, error } = await getSupabaseAdmin()
      .from('vinculos_familiares')
      .upsert(
        {
          organizacion_id: input.organizacionId,
          familiar_id: input.familiarId,
          residente_id: input.residenteId,
          parentesco: input.parentesco,
          activo: true,
          creado_por: input.creadoPor,
          revocado_por: null,
          revocado_en: null,
        },
        { onConflict: 'familiar_id,residente_id' },
      )
      .select('id')
      .single();
    if (error) throw new Error(`Error al crear el vínculo: ${error.message}`);
    return (data as { id: string }).id;
  },
);

export const cambiarEstadoVinculo = withRepoLogging(REPO, 'cambiarEstadoVinculo', async (id: string, activo: boolean, usuarioId: string): Promise<void> => {
  const { error } = await getSupabaseAdmin()
    .from('vinculos_familiares')
    .update(activo ? { activo: true, revocado_por: null, revocado_en: null } : { activo: false, revocado_por: usuarioId, revocado_en: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`Error al actualizar el vínculo: ${error.message}`);
});

export const actualizarParentesco = withRepoLogging(REPO, 'actualizarParentesco', async (id: string, parentesco: string | null): Promise<void> => {
  const { error } = await getSupabaseAdmin().from('vinculos_familiares').update({ parentesco }).eq('id', id);
  if (error) throw new Error(`Error al actualizar el parentesco: ${error.message}`);
});

// ─── Cuenta de acceso (Supabase Auth) ────────────────────────────────────────

export type ResultadoInvitacion = { ok: true; userId: string } | { ok: false; motivo: 'ya_registrado' } | { ok: false; motivo: 'error'; mensaje: string };

/**
 * Crea la cuenta de Supabase Auth y manda el email de invitación. El link aterriza en la
 * app de familiares (FAMILIA_APP_URL), que abre la sesión sola. `ya_registrado` no es un
 * error: el email ya tiene cuenta y el llamador decide qué hacer.
 */
export const invitarPorEmail = withRepoLogging(REPO, 'invitarPorEmail', async (email: string): Promise<ResultadoInvitacion> => {
  const { data, error } = await getSupabaseAdmin().auth.admin.inviteUserByEmail(email, { redirectTo: env.familiaAppUrl });
  if (error) {
    if (/already (been )?registered|already exists/i.test(error.message)) return { ok: false, motivo: 'ya_registrado' };
    return { ok: false, motivo: 'error', mensaje: error.message };
  }
  return { ok: true, userId: data.user.id };
});

export const eliminarCuentaAuth = withRepoLogging(REPO, 'eliminarCuentaAuth', async (userId: string): Promise<void> => {
  const { error } = await getSupabaseAdmin().auth.admin.deleteUser(userId);
  if (error) throw new Error(`Error al eliminar la cuenta: ${error.message}`);
});

// ─── Institución ─────────────────────────────────────────────────────────────

export const obtenerOrganizacion = withRepoLogging(REPO, 'obtenerOrganizacion', async (organizacionId: string): Promise<{ id: string; nombre: string; telefono: string | null; email: string | null } | null> => {
  const { data, error } = await getSupabaseAdmin().from('organizaciones').select('id, nombre, telefono, email').eq('id', organizacionId).maybeSingle();
  if (error) throw new Error(`Error al cargar la institución: ${error.message}`);
  return (data as { id: string; nombre: string; telefono: string | null; email: string | null } | null) ?? null;
});

// ─── Agenda del residente (solo lectura) ─────────────────────────────────────

export interface RecordatorioResidente {
  id: string;
  titulo: string;
  fecha: string;
  hora: string;
  estado: string;
}

/** Recordatorios que cargó el propio residente entre dos fechas (YYYY-MM-DD, inclusive). */
export const listarRecordatoriosResidente = withRepoLogging(
  REPO,
  'listarRecordatoriosResidente',
  async (organizacionId: string, residenteId: string, desde: string, hasta: string): Promise<RecordatorioResidente[]> => {
    const { data, error } = await getSupabaseAdmin()
      .from('agenda_recordatorios')
      .select('id, titulo, fecha, hora, estado')
      .eq('organizacion_id', organizacionId)
      .eq('residente_id', residenteId)
      .neq('estado', 'cancelado')
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });
    if (error) throw new Error(`Error al cargar la agenda del residente: ${error.message}`);
    return (data ?? []) as RecordatorioResidente[];
  },
);
