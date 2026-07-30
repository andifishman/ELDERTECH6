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

// ─── Admin (backoffice) ──────────────────────────────────────────────────────

export interface ResidenteOverrideInput {
  residente_id: string;
  incluido: boolean;
}

export interface ActividadAdminInput {
  nombre: string;
  descripcion?: string | null;
  tipo_actividad_id?: string | null;
  ubicacion_id?: string | null;
  responsable_id?: string | null;
  emoji_icono?: string | null;
  fecha: string; // 'YYYY-MM-DD'
  hora_inicio: string; // 'HH:MM'
  hora_fin?: string | null;
  es_recurrente: boolean;
  patron_recurrencia?: PatronRecurrencia | null;
  secciones_objetivo?: string[] | null;
  residentesOverride?: ResidenteOverrideInput[];
  /** Módulo Notificaciones — ver `ActivitiesAdminService`. */
  notificar_al_crear?: boolean;
  recordatorio_minutos_antes?: number | null;
}

/** Fila lista para insert/update en `actividades` — ya sin `residentesOverride` y con horas normalizadas. */
export interface ActividadInputRow {
  organizacion_id?: string;
  tipo_actividad_id: string | null;
  ubicacion_id: string | null;
  responsable_id: string | null;
  nombre: string;
  descripcion: string | null;
  emoji_icono: string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string | null;
  es_recurrente: boolean;
  patron_recurrencia: PatronRecurrencia | null;
  secciones_objetivo: string[] | null;
  activo?: boolean;
  plantilla_id?: string | null;
  recordatorio_minutos_antes?: number | null;
  recordatorio_enviado?: boolean;
}
