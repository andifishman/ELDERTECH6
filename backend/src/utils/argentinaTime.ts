// El servidor (Vercel) corre en UTC, pero `fecha`/`hora` en la base son la hora
// de pared que cargó el residente — hoy siempre Buenos Aires (ver
// CONTEXT.md: la app es de un solo geriátrico). Argentina no tiene horario de
// verano desde 2009, así que UTC-3 fijo alcanza — el día que haya
// organizaciones en otros husos horarios, esto deja de ser suficiente y hay
// que guardar el timezone por organización.
const OFFSET_ARGENTINA = '-03:00';
const TRES_HORAS_MS = 3 * 60 * 60 * 1000;

/** Instante real (epoch ms) de una fecha+hora de pared en Argentina. */
export function momentoDesdeFechaHoraArgentina(fecha: string, hora: string): number {
  return new Date(`${fecha}T${hora}${OFFSET_ARGENTINA}`).getTime();
}

/** "Ahora" pero con los componentes de fecha/hora ya corridos a hora de pared de Argentina. */
function ahoraComoFechaArgentina(): Date {
  return new Date(Date.now() - TRES_HORAS_MS);
}

export function hoyArgentinaISO(): string {
  return ahoraComoFechaArgentina().toISOString().slice(0, 10);
}

export function horaActualArgentina(): string {
  return ahoraComoFechaArgentina().toISOString().slice(11, 19);
}
