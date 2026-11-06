import { StatusCodes } from 'http-status-codes';
import { HttpError } from '../../middlewares/errorHandler';
import type { AuthUser } from '../../middlewares/auth';
import { logger } from '../../logging/logger';
import * as familiaRepo from '../../repositories/familiaRepository';
import * as contenidoRepo from '../../repositories/familiaContenidoRepository';
import * as comunicacionRepo from '../../repositories/familiaComunicacionRepository';
import * as auditService from '../audit/AuditService';
import * as horariosExternos from '../horariosExternos/HorariosExternosService';
import type { ActividadExterna } from '../horariosExternos/HorariosExternosService';
import { exigirVinculo, type FamiliarContext } from '../../utils/familia';
import { filtrarPorPiso } from '../../utils/pisoHogar';
import { feedAplicaA } from '../../config/feedHorarios';

function requireOrganizacionId(user: AuthUser): string {
  if (!user.organizacionId) throw new HttpError(StatusCodes.FORBIDDEN, 'Este usuario no tiene una organización asociada.');
  return user.organizacionId;
}

// ─── Backoffice: familiares y vínculos ───────────────────────────────────────

export async function listarFamiliares(user: AuthUser): Promise<familiaRepo.FamiliarConVinculos[]> {
  return familiaRepo.listarFamiliares(requireOrganizacionId(user));
}

export async function listarFamiliaresDeResidente(user: AuthUser, residenteId: string): Promise<Awaited<ReturnType<typeof familiaRepo.listarFamiliaresDeResidente>>> {
  return familiaRepo.listarFamiliaresDeResidente(requireOrganizacionId(user), residenteId);
}

export interface CrearFamiliarInput {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  residentes: Array<{ residenteId: string; parentesco: string | null }>;
}

export interface ResultadoAlta {
  familiar: familiaRepo.Familiar;
  /** El email ya era de un familiar de esta institución: solo se sumaron los vínculos, sin invitación nueva. */
  yaExistia: boolean;
}

/**
 * Da de alta a un familiar: valida que los residentes sean de la institución, crea la cuenta de acceso y manda la
 * invitación por email, y lo vincula. Si falla un paso a la mitad, deshace la cuenta para no dejar huérfanos.
 */
export async function crearFamiliar(user: AuthUser, input: CrearFamiliarInput): Promise<ResultadoAlta> {
  const organizacionId = requireOrganizacionId(user);

  const residenteIds = [...new Set(input.residentes.map((r) => r.residenteId))];
  const validos = await familiaRepo.contarResidentesDeOrganizacion(organizacionId, residenteIds);
  if (validos !== residenteIds.length) throw new HttpError(StatusCodes.BAD_REQUEST, 'Alguno de los residentes elegidos no existe en esta institución.');

  const existente = await familiaRepo.obtenerFamiliarPorEmail(input.email);
  let familiar: familiaRepo.Familiar;
  let yaExistia = false;

  if (existente) {
    if (existente.organizacion_id !== organizacionId) throw new HttpError(StatusCodes.CONFLICT, 'Ese email ya está registrado como familiar en otra institución.');
    familiar = existente;
    yaExistia = true;
  } else {
    const invitacion = await familiaRepo.invitarPorEmail(input.email);
    if (!invitacion.ok) {
      if (invitacion.motivo === 'ya_registrado') {
        throw new HttpError(StatusCodes.CONFLICT, 'Ese email ya tiene una cuenta en ElderTech (de un residente o del personal). Usá otro email para el familiar.');
      }
      logger.error('[familia] no se pudo mandar la invitación', { error: invitacion.mensaje });
      throw new HttpError(StatusCodes.BAD_GATEWAY, 'No se pudo mandar la invitación por email. Probá de nuevo en unos minutos.');
    }
    try {
      familiar = await familiaRepo.crearFamiliar({
        id: invitacion.userId,
        organizacionId,
        nombre: input.nombre,
        apellido: input.apellido,
        email: input.email,
        telefono: input.telefono,
        creadoPor: user.supabaseUserId,
      });
    } catch (err) {
      await familiaRepo.eliminarCuentaAuth(invitacion.userId).catch((e: unknown) => logger.error('[familia] no se pudo deshacer la cuenta', { e }));
      throw err;
    }
  }

  for (const r of input.residentes) {
    await familiaRepo.crearOReactivarVinculo({ organizacionId, familiarId: familiar.id, residenteId: r.residenteId, parentesco: r.parentesco, creadoPor: user.supabaseUserId });
  }

  await auditService.registrarAuditoria(user, {
    accion: 'crear',
    tabla: 'familiares',
    registroId: familiar.id,
    descripcion: `${yaExistia ? 'Vinculó a' : 'Dio de alta a'} ${familiar.nombre} ${familiar.apellido} (${familiar.email}) con ${residenteIds.length} residente(s)`,
    datosNuevos: { residenteIds },
  });
  return { familiar, yaExistia };
}

async function familiarDeLaInstitucion(user: AuthUser, familiarId: string): Promise<familiaRepo.Familiar> {
  const familiar = await familiaRepo.obtenerFamiliar(familiarId);
  if (!familiar || familiar.organizacion_id !== requireOrganizacionId(user)) throw new HttpError(StatusCodes.NOT_FOUND, 'Familiar no encontrado.');
  return familiar;
}

export async function actualizarFamiliar(
  user: AuthUser,
  familiarId: string,
  cambios: { nombre?: string; apellido?: string; telefono?: string | null; activo?: boolean },
): Promise<familiaRepo.Familiar> {
  const actual = await familiarDeLaInstitucion(user, familiarId);
  const actualizado = await familiaRepo.actualizarFamiliar(familiarId, cambios);
  await auditService.registrarAuditoria(user, {
    accion: cambios.activo === undefined ? 'editar' : cambios.activo ? 'reactivar' : 'pausar',
    tabla: 'familiares',
    registroId: familiarId,
    descripcion: cambios.activo === undefined ? `Editó los datos de ${actual.nombre} ${actual.apellido}` : `${cambios.activo ? 'Habilitó' : 'Deshabilitó'} la cuenta de ${actual.nombre} ${actual.apellido}`,
    datosPrevios: { activo: actual.activo },
    datosNuevos: cambios,
  });
  return actualizado;
}

/** Vuelve a mandar el email de invitación a quien todavía no activó su cuenta. */
export async function reinvitar(user: AuthUser, familiarId: string): Promise<{ enviada: boolean }> {
  const familiar = await familiarDeLaInstitucion(user, familiarId);
  const resultado = await familiaRepo.invitarPorEmail(familiar.email);
  if (resultado.ok) {
    // Supabase devolvió un usuario nuevo con el mismo email: no debería pasar (el email es único). Se limpia por las dudas.
    if (resultado.userId !== familiar.id) await familiaRepo.eliminarCuentaAuth(resultado.userId).catch(() => undefined);
    await familiaRepo.marcarInvitado(familiar.id);
    return { enviada: true };
  }
  if (resultado.motivo === 'ya_registrado') return { enviada: false };
  throw new HttpError(StatusCodes.BAD_GATEWAY, 'No se pudo mandar la invitación por email. Probá de nuevo en unos minutos.');
}

export async function vincular(user: AuthUser, familiarId: string, residenteId: string, parentesco: string | null): Promise<void> {
  const organizacionId = requireOrganizacionId(user);
  const familiar = await familiarDeLaInstitucion(user, familiarId);
  if ((await familiaRepo.contarResidentesDeOrganizacion(organizacionId, [residenteId])) !== 1) throw new HttpError(StatusCodes.BAD_REQUEST, 'El residente no existe en esta institución.');
  const vinculoId = await familiaRepo.crearOReactivarVinculo({ organizacionId, familiarId, residenteId, parentesco, creadoPor: user.supabaseUserId });
  await auditService.registrarAuditoria(user, {
    accion: 'crear',
    tabla: 'vinculos_familiares',
    registroId: vinculoId,
    descripcion: `Vinculó a ${familiar.nombre} ${familiar.apellido} con un residente`,
    datosNuevos: { residenteId, parentesco },
  });
}

async function vinculoDeLaInstitucion(user: AuthUser, vinculoId: string): Promise<NonNullable<Awaited<ReturnType<typeof familiaRepo.obtenerVinculo>>>> {
  const vinculo = await familiaRepo.obtenerVinculo(vinculoId);
  if (!vinculo || vinculo.organizacion_id !== requireOrganizacionId(user)) throw new HttpError(StatusCodes.NOT_FOUND, 'Vínculo no encontrado.');
  return vinculo;
}

/** Revocar = el familiar deja de ver todo lo de ese residente al instante. No se borra nada: queda registro y se puede reactivar. */
export async function revocarVinculo(user: AuthUser, vinculoId: string): Promise<void> {
  const vinculo = await vinculoDeLaInstitucion(user, vinculoId);
  await familiaRepo.cambiarEstadoVinculo(vinculoId, false, user.supabaseUserId);
  await auditService.registrarAuditoria(user, {
    accion: 'pausar',
    tabla: 'vinculos_familiares',
    registroId: vinculoId,
    descripcion: `Revocó el vínculo de un familiar con ${vinculo.residente?.nombre ?? 'un residente'} ${vinculo.residente?.apellido ?? ''}`.trim(),
  });
}

export async function reactivarVinculo(user: AuthUser, vinculoId: string): Promise<void> {
  const vinculo = await vinculoDeLaInstitucion(user, vinculoId);
  await familiaRepo.cambiarEstadoVinculo(vinculoId, true, user.supabaseUserId);
  await auditService.registrarAuditoria(user, {
    accion: 'reactivar',
    tabla: 'vinculos_familiares',
    registroId: vinculoId,
    descripcion: `Reactivó el vínculo de un familiar con ${vinculo.residente?.nombre ?? 'un residente'} ${vinculo.residente?.apellido ?? ''}`.trim(),
  });
}

export async function actualizarParentesco(user: AuthUser, vinculoId: string, parentesco: string | null): Promise<void> {
  await vinculoDeLaInstitucion(user, vinculoId);
  await familiaRepo.actualizarParentesco(vinculoId, parentesco);
}

// ─── App de familiares ───────────────────────────────────────────────────────

export async function obtenerMe(ctx: FamiliarContext): Promise<{
  familiar: { id: string; nombre: string; apellido: string; email: string };
  institucion: { nombre: string; telefono: string | null; email: string | null; colorPrincipal: string | null } | null;
  residentes: Array<{ id: string; vinculoId: string; nombre: string; apellido: string; parentesco: string | null; seccion: string | null }>;
}> {
  const organizacion = await familiaRepo.obtenerOrganizacion(ctx.organizacionId);
  void familiaRepo.registrarAcceso(ctx.familiarId).catch((err: unknown) => logger.warn('[familia] no se pudo registrar el acceso', { err }));
  return {
    familiar: { id: ctx.familiarId, nombre: ctx.nombre, apellido: ctx.apellido, email: ctx.email },
    institucion: organizacion ? { nombre: organizacion.nombre, telefono: organizacion.telefono, email: organizacion.email, colorPrincipal: organizacion.colorPrincipal } : null,
    residentes: ctx.vinculos.map((v) => ({ id: v.residenteId, vinculoId: v.vinculoId, nombre: v.nombre, apellido: v.apellido, parentesco: v.parentesco, seccion: v.seccion })),
  };
}

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

/** Grilla semanal del Hogar. Si el sistema externo no responde, la pantalla se muestra igual, sin actividades y avisando. */
async function grillaDelHogar(organizacionId: string): Promise<{ actividades: ActividadExterna[]; disponible: boolean }> {
  // El feed del Hogar es de UNA institución: las demás no heredan su grilla.
  if (!feedAplicaA(organizacionId)) return { actividades: [], disponible: true };
  try {
    return { actividades: (await horariosExternos.obtenerSnapshot()).actividades, disponible: true };
  } catch (err) {
    logger.warn('[familia] no se pudo leer la grilla del Hogar', { error: err instanceof Error ? err.message : String(err) });
    return { actividades: [], disponible: false };
  }
}

/** Agenda de UN residente vinculado: actividades de su piso y recordatorios que cargó él, por separado. Solo lectura. */
export async function agendaDelResidente(
  ctx: FamiliarContext,
  residenteId: string,
  rango: { desde: string; hasta: string },
): Promise<{
  actividades: ActividadExterna[];
  actividadesDisponibles: boolean;
  recordatorios: familiaRepo.RecordatorioResidente[];
}> {
  const vinculo = exigirVinculo(ctx, residenteId);
  const [grilla, recordatorios] = await Promise.all([
    grillaDelHogar(ctx.organizacionId),
    familiaRepo.listarRecordatoriosResidente(ctx.organizacionId, residenteId, rango.desde, rango.hasta),
  ]);
  return { actividades: filtrarPorPiso(grilla.actividades, vinculo.seccion), actividadesDisponibles: grilla.disponible, recordatorios };
}

/** Calendario de la institución: eventos del mes (abiertos o no) y la grilla semanal general del Hogar. */
export async function calendario(ctx: FamiliarContext, mes: string): Promise<{ eventos: contenidoRepo.EventoParaFamiliar[]; actividades: ActividadExterna[]; actividadesDisponibles: boolean }> {
  const [anio, numeroMes] = mes.split('-').map(Number) as [number, number];
  // Rango en hora de Argentina (UTC-3): del primer instante del mes al último.
  const desde = new Date(Date.UTC(anio, numeroMes - 1, 1, 3, 0, 0)).toISOString();
  const hasta = new Date(Date.UTC(anio, numeroMes, 1, 2, 59, 59)).toISOString();
  const [eventos, grilla] = await Promise.all([contenidoRepo.listarEventos(ctx.organizacionId, ctx.familiarId, desde, hasta), grillaDelHogar(ctx.organizacionId)]);
  return { eventos, actividades: grilla.actividades, actividadesDisponibles: grilla.disponible };
}

export interface ResumenInicio {
  avisosSinLeer: number;
  avisosImportantes: contenidoRepo.AvisoParaFamiliar[];
  proximaActividad: { nombre: string; dia: string; horario: string; lugar: string | null; residenteNombre: string } | null;
  fotosNuevas: number;
  mensajesSinLeer: number;
  proximosEventos: contenidoRepo.EventoParaFamiliar[];
}

function minutos(hora: string | null): number | null {
  if (!hora) return null;
  const [h, m] = hora.split(':').map(Number);
  return h !== undefined && m !== undefined && !Number.isNaN(h) && !Number.isNaN(m) ? h * 60 + m : null;
}

/** Lo importante de hoy: avisos sin leer, la próxima actividad del residente elegido, fotos nuevas y mensajes. */
export async function inicio(ctx: FamiliarContext, residenteId: string | null): Promise<ResumenInicio> {
  const vinculo = residenteId ? exigirVinculo(ctx, residenteId) : ctx.vinculos[0];
  const [avisos, albumes, eventos, hilos, grilla] = await Promise.all([
    contenidoRepo.listarAvisosParaFamiliar(ctx.organizacionId, ctx.familiarId),
    contenidoRepo.listarAlbumesPublicados(ctx.organizacionId),
    contenidoRepo.listarEventos(ctx.organizacionId, ctx.familiarId, new Date().toISOString()),
    comunicacionRepo.resumirHilos(ctx.vinculos.map((v) => v.vinculoId), 'familiar'),
    grillaDelHogar(ctx.organizacionId),
  ]);

  const sinLeer = avisos.filter((a) => !a.leido);
  const haceUnaSemana = Date.now() - 7 * 86_400_000;

  let proximaActividad: ResumenInicio['proximaActividad'] = null;
  if (vinculo) {
    const ahora = new Date(Date.now() - 3 * 3_600_000); // hora de pared de Argentina
    const hoy = DIAS[ahora.getUTCDay()];
    const ahoraMin = ahora.getUTCHours() * 60 + ahora.getUTCMinutes();
    const delPiso = filtrarPorPiso(grilla.actividades, vinculo.seccion).filter((a) => !a.suspendido);
    const proxima = delPiso
      .filter((a) => normalizarDia(a.dia) === hoy && (minutos(a.hora) ?? -1) >= ahoraMin)
      .sort((a, b) => (minutos(a.hora) ?? 0) - (minutos(b.hora) ?? 0))[0];
    if (proxima) proximaActividad = { nombre: proxima.nombre, dia: proxima.dia, horario: proxima.horario, lugar: proxima.lugar, residenteNombre: vinculo.nombre };
  }

  return {
    avisosSinLeer: sinLeer.length,
    avisosImportantes: sinLeer.filter((a) => a.importante).slice(0, 3),
    proximaActividad,
    fotosNuevas: albumes.filter((a) => a.publicado_en && new Date(a.publicado_en).getTime() >= haceUnaSemana).length,
    mensajesSinLeer: hilos.reduce((s, h) => s + h.sin_leer, 0),
    proximosEventos: eventos.slice(0, 3),
  };
}

function normalizarDia(dia: string): string {
  return horariosExternos.normalizarDia(dia);
}

