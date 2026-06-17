// ========================================
// UTIL: Recurrencia de actividades
// DESCRIPCIÓN:
// Define los presets de recurrencia y genera la vista
// previa textual que se muestra en el formulario.
// ========================================
import type { PatronRecurrencia } from '@/types/database.types';

export type PresetRecurrencia = 'unica' | 'diaria' | 'lun_vie' | 'fin_semana' | 'especificos';

export const DIAS_SEMANA = [
  { valor: 1, label: 'Lun' },
  { valor: 2, label: 'Mar' },
  { valor: 3, label: 'Mié' },
  { valor: 4, label: 'Jue' },
  { valor: 5, label: 'Vie' },
  { valor: 6, label: 'Sáb' },
  { valor: 0, label: 'Dom' },
] as const;

// convierte un preset + días elegidos en el patrón que guarda la DB
export function construirPatron(preset: PresetRecurrencia, diasElegidos: number[]): {
  es_recurrente: boolean;
  patron: PatronRecurrencia | null;
} {
  switch (preset) {
    case 'unica':
      return { es_recurrente: false, patron: null };
    case 'diaria':
      return { es_recurrente: true, patron: { dias_semana: [0, 1, 2, 3, 4, 5, 6] } };
    case 'lun_vie':
      return { es_recurrente: true, patron: { dias_semana: [1, 2, 3, 4, 5] } };
    case 'fin_semana':
      return { es_recurrente: true, patron: { dias_semana: [0, 6] } };
    case 'especificos':
      return { es_recurrente: diasElegidos.length > 0, patron: { dias_semana: diasElegidos } };
  }
}

// genera el texto de vista previa de la recurrencia
export function vistaPreviaRecurrencia(preset: PresetRecurrencia, dias: number[]): string {
  const nombre = (v: number) => DIAS_SEMANA.find((d) => d.valor === v)?.label ?? '';
  switch (preset) {
    case 'unica':
      return 'Esta actividad ocurre una sola vez en la fecha indicada.';
    case 'diaria':
      return 'Se repite todos los días sin excepción.';
    case 'lun_vie':
      return 'Se repite de lunes a viernes.';
    case 'fin_semana':
      return 'Se repite sábados y domingos.';
    case 'especificos':
      return dias.length
        ? `Se repite los días: ${dias.map(nombre).join(', ')}.`
        : 'Elegí al menos un día de la semana.';
  }
}
