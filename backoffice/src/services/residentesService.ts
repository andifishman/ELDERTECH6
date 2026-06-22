// ========================================
// SERVICIO: Residentes
// DESCRIPCIÓN:
// CRUD de residentes del geriátrico. Desactivar un
// residente le quita acceso a la app.
// ========================================
import { supabase, ORG_ID } from '@/lib/supabase';
import type { ContactoResumen, NivelDificultad, Residente } from '@/types/database.types';
import { registrarAuditoria } from './auditService';

export interface ResidenteInput {
  nombre: string;
  apellido: string;
  fecha_nacimiento?: string | null;
  habitacion?: string | null;
  piso?: string | null;
  nivel_dificultad: NivelDificultad;
  email?: string | null;
  telefono?: string | null;
  foto_url?: string | null;
  notas?: string | null;
}

export type ResidenteConCuenta = Residente & { tiene_cuenta: boolean };

export async function listarResidentes(): Promise<ResidenteConCuenta[]> {
  const [residentesR, perfilesR] = await Promise.allSettled([
    supabase
      .from('residentes')
      .select('*')
      .eq('organizacion_id', ORG_ID)
      .order('apellido', { ascending: true }),
    supabase
      .from('perfiles_usuario')
      .select('residente_id')
      .eq('organizacion_id', ORG_ID)
      .not('residente_id', 'is', null),
  ]);

  if (residentesR.status === 'rejected') throw residentesR.reason;
  if (residentesR.value.error) throw residentesR.value.error;

  const verificadosIds = new Set(
    perfilesR.status === 'fulfilled'
      ? ((perfilesR.value.data ?? []) as { residente_id: string }[]).map((p) => p.residente_id)
      : [],
  );

  return ((residentesR.value.data ?? []) as Residente[]).map((r) => ({
    ...r,
    tiene_cuenta: verificadosIds.has(r.id),
  }));
}

export async function crearResidente(input: ResidenteInput): Promise<string> {
  const { data, error } = await supabase
    .from('residentes')
    .insert({ ...input, organizacion_id: ORG_ID, activo: true })
    .select('id')
    .single();
  if (error) throw error;
  await registrarAuditoria({
    accion: 'crear',
    tabla: 'residentes',
    registroId: data.id,
    descripcion: `Creó al residente ${input.nombre} ${input.apellido}`,
  });
  return data.id;
}

export async function actualizarResidente(id: string, input: ResidenteInput): Promise<void> {
  const { error } = await supabase
    .from('residentes')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  await registrarAuditoria({
    accion: 'editar',
    tabla: 'residentes',
    registroId: id,
    descripcion: `Editó al residente ${input.nombre} ${input.apellido}`,
  });
}

export interface ResidenteDetalle {
  residente: Residente;
  mensajes: { id: string; contenido: string; created_at: string }[];
  intereses: { nombre: string; emoji: string | null }[];
  tutorialesCompletados: { titulo: string; thumbnail_url: string | null; completado_at: string | null }[];
  ciudadesClima: string[];
  contactos: ContactoResumen[];
}

export async function obtenerResidenteDetalle(id: string): Promise<ResidenteDetalle> {
  const { data: residente, error } = await supabase
    .from('residentes')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;

  const [mensajesR, interesesR, tutorialesR, climaR, contactosR] = await Promise.allSettled([
    supabase
      .from('mensajes_asistente')
      .select('id, contenido, created_at')
      .eq('residente_id', id)
      .eq('rol', 'usuario')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('residente_intereses')
      .select('interes:intereses(nombre, emoji)')
      .eq('residente_id', id),
    supabase
      .from('progreso_tutorial')
      .select('tutorial:tutoriales(titulo, thumbnail_url), completado, updated_at')
      .eq('residente_id', id)
      .eq('completado', true)
      .order('updated_at', { ascending: false })
      .limit(10),
    supabase
      .from('residente_ciudades_familiares')
      .select('ciudad:ciudades_familiares(nombre, pais_codigo)')
      .eq('residente_id', id),
    supabase
      .from('contactos')
      .select('id, nombre, apellido, telefono, whatsapp_disponible, foto_url, favorito, orden, tipo_contacto:tipos_contacto(id, nombre, emoji)')
      .eq('residente_id', id)
      .eq('activo', true)
      .order('favorito', { ascending: false })
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true }),
  ]);

  return {
    residente: residente as Residente,
    mensajes: mensajesR.status === 'fulfilled' ? (mensajesR.value.data ?? []) as any[] : [],
    intereses: interesesR.status === 'fulfilled'
      ? ((interesesR.value.data ?? []) as any[]).map((r) => r.interes).filter(Boolean)
      : [],
    tutorialesCompletados: tutorialesR.status === 'fulfilled'
      ? ((tutorialesR.value.data ?? []) as any[])
          .map((r) => ({ titulo: r.tutorial?.titulo ?? '', thumbnail_url: r.tutorial?.thumbnail_url ?? null, completado_at: r.updated_at }))
          .filter((r) => r.titulo)
      : [],
    ciudadesClima: climaR.status === 'fulfilled'
      ? ((climaR.value.data ?? []) as any[])
          .map((r) => {
            const ciudad = r.ciudad;
            if (!ciudad?.nombre) return null;
            const bandera = ciudad.pais_codigo
              ? [...(ciudad.pais_codigo as string).toUpperCase()].map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
              : '🌍';
            return `${bandera} ${ciudad.nombre}`;
          })
          .filter(Boolean) as string[]
      : [],
    contactos: contactosR.status === 'fulfilled'
      ? ((contactosR.value.data ?? []) as any[]).map((r) => ({
          ...r,
          tipo_contacto: Array.isArray(r.tipo_contacto) ? r.tipo_contacto[0] ?? null : r.tipo_contacto,
        })) as ContactoResumen[]
      : [],
  };
}

export async function setActivoResidente(id: string, activo: boolean, nombre?: string): Promise<void> {
  const { error } = await supabase
    .from('residentes')
    .update({ activo, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  await registrarAuditoria({
    accion: activo ? 'reactivar' : 'pausar',
    tabla: 'residentes',
    registroId: id,
    descripcion: `${activo ? 'Reactivó' : 'Desactivó'} a ${nombre ?? 'un residente'}`,
  });
}
