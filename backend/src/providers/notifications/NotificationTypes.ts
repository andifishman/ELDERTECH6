export type TipoNotificacion = 'informacion' | 'importante' | 'recordatorio' | 'urgente' | 'actividad' | 'tutorial' | 'general';
export type DestinoTipo = 'todos' | 'residentes' | 'especificos' | 'seccion' | 'habitacion' | 'intereses' | 'nivel_dificultad';
export type ProgramacionTipo = 'instantanea' | 'programada';
export type Recurrencia = 'ninguna' | 'diaria' | 'semanal' | 'mensual';
export type EstadoNotificacion = 'borrador' | 'programada' | 'enviando' | 'enviada' | 'fallida' | 'cancelada';
export type PrioridadNotificacion = 'alta' | 'normal' | 'baja';
export type EstadoDestinatario = 'pendiente' | 'enviado' | 'entregado' | 'fallido' | 'abierto';

export interface DestinoFiltro {
  seccion?: string;
  habitacion?: string;
  nivel_dificultad?: string;
  interes_ids?: string[];
  residente_ids?: string[];
}

export interface Notification {
  id: string;
  organizacion_id: string;
  titulo: string;
  mensaje: string;
  imagen_url: string | null;
  icono: string | null;
  tipo: TipoNotificacion;
  destino_tipo: DestinoTipo;
  destino_filtro: DestinoFiltro | null;
  excluir_residente_ids: string[] | null;
  incluir_residente_ids: string[] | null;
  programacion_tipo: ProgramacionTipo;
  programada_para: string | null;
  recurrencia: Recurrencia;
  estado: EstadoNotificacion;
  silenciosa: boolean;
  sonido: boolean;
  vibracion: boolean;
  prioridad: PrioridadNotificacion;
  pantalla_destino: string | null;
  actividad_id: string | null;
  creado_por: string | null;
  enviado_por: string | null;
  enviada_en: string | null;
  cancelada_en: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationInput {
  titulo: string;
  mensaje: string;
  imagen_url?: string | null;
  icono?: string | null;
  tipo: TipoNotificacion;
  destino_tipo: DestinoTipo;
  destino_filtro?: DestinoFiltro | null;
  excluir_residente_ids?: string[] | null;
  incluir_residente_ids?: string[] | null;
  programacion_tipo: ProgramacionTipo;
  programada_para?: string | null;
  recurrencia?: Recurrencia;
  silenciosa?: boolean;
  sonido?: boolean;
  vibracion?: boolean;
  prioridad?: PrioridadNotificacion;
  pantalla_destino?: string | null;
}

export interface NotificationRecipient {
  id: string;
  notification_id: string;
  residente_id: string;
  device_token_id: string | null;
  estado: EstadoDestinatario;
  expo_ticket_id: string | null;
  error_mensaje: string | null;
  enviado_en: string | null;
  entregado_en: string | null;
  abierto_en: string | null;
  created_at: string;
}

export interface RecipientStats {
  alcanzados: number;
  enviados: number;
  entregados: number;
  abiertos: number;
  fallidos: number;
  pendientes: number;
}
