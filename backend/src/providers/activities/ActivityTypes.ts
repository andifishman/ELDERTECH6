export interface TipoActividad {
  id: string;
  organizacion_id: string | null;
  nombre: string;
  emoji: string | null;
  color: string | null;
  descripcion: string | null;
  activo: boolean;
}

export interface Ubicacion {
  id: string;
  organizacion_id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface Responsable {
  id: string;
  organizacion_id: string | null;
  nombre: string;
  apellido: string;
  activo: boolean;
}

export interface PatronRecurrencia {
  dias_semana?: number[];
  hasta?: string;
}

export interface ActividadCompleta {
  id: string;
  organizacion_id: string;
  nombre: string;
  descripcion: string | null;
  emoji_icono: string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string | null;
  es_recurrente: boolean;
  patron_recurrencia: PatronRecurrencia | null;
  secciones_objetivo: string[] | null;
  activo: boolean;
  plantilla_id: string | null;
  tipo_actividad: TipoActividad | null;
  ubicacion: Ubicacion | null;
  responsable: Responsable | null;
  actividad_residentes_override: Array<{ residente_id: string; incluido: boolean }>;
}

export type PrioridadActividad = 1 | 3;

export interface ActividadConPrioridad extends ActividadCompleta {
  prioridad: PrioridadActividad;
  recomendada: boolean;
}
