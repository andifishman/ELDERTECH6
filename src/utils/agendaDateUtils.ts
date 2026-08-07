// Helpers de fecha específicos de Agenda — compartidos entre la pantalla
// principal (calendario) y el formulario de nuevo/editar recordatorio.
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const DIAS_LETRA_LUNES_PRIMERO = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
// Nombre completo del día — más claro que la letra sola (L/M/M se confunden entre sí).
export const DIAS_COMPLETO_LUNES_PRIMERO = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDias(d: Date, n: number): Date {
  const copia = new Date(d);
  copia.setDate(copia.getDate() + n);
  return copia;
}

export function lunesDeLaSemana(ref: Date): Date {
  const diaSemana = ref.getDay();
  return addDias(ref, -(diaSemana === 0 ? 6 : diaSemana - 1));
}

export function diasDeLaSemana(ref: Date): Date[] {
  const lunes = lunesDeLaSemana(ref);
  return Array.from({ length: 7 }, (_, i) => addDias(lunes, i));
}

export function formatearFechaLegible(fechaISO: string): string {
  const d = new Date(`${fechaISO}T00:00:00`);
  return `${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()}`;
}

// "Miércoles 8 de septiembre" — día de semana completo, sin abreviar, para
// que se lea sin esfuerzo (usado en la lista de Próximos recordatorios).
export function formatearFechaCompleta(fechaISO: string): string {
  const d = new Date(`${fechaISO}T00:00:00`);
  const diaSemana = DIAS_COMPLETO_LUNES_PRIMERO[d.getDay() === 0 ? 6 : d.getDay() - 1];
  return `${diaSemana} ${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()}`;
}

export function nombreMes(mes: number): string {
  return MESES[mes];
}

export interface CeldaMes {
  fecha: string;
  enMes: boolean;
  dia: number;
}

/** Grilla de 6×7 (o menos si el mes entra en 5 filas) para pintar un calendario mensual, semana empezando el lunes. */
export function generarGrillaMes(ref: Date): CeldaMes[] {
  const anio = ref.getFullYear();
  const mes = ref.getMonth();
  const primerDia = new Date(anio, mes, 1);
  const ultimoDia = new Date(anio, mes + 1, 0);
  const offsetInicio = primerDia.getDay() === 0 ? 6 : primerDia.getDay() - 1;

  const celdas: CeldaMes[] = [];
  for (let i = offsetInicio; i > 0; i--) {
    const d = new Date(anio, mes, 1 - i);
    celdas.push({ fecha: toISODate(d), enMes: false, dia: d.getDate() });
  }
  for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
    celdas.push({ fecha: toISODate(new Date(anio, mes, dia)), enMes: true, dia });
  }
  while (celdas.length % 7 !== 0) {
    const ultima = new Date(`${celdas[celdas.length - 1].fecha}T00:00:00`);
    ultima.setDate(ultima.getDate() + 1);
    celdas.push({ fecha: toISODate(ultima), enMes: false, dia: ultima.getDate() });
  }
  return celdas;
}
