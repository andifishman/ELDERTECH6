// ========================================
// TIPOS: Entidades específicas del Backoffice
// DESCRIPCIÓN:
// Tablas y estructuras nuevas que agrega el backoffice
// sobre el schema existente: roles/permisos, FAQ del
// asistente, auditoría y notificaciones.
// Acompañan a la migración SQL del módulo backoffice.
// ========================================

// Roles del panel administrativo (distintos del rol del residente en la app)
export type RolBackoffice = 'super_admin' | 'admin' | 'editor';

// Perfil de usuario administrador (extiende auth.users de Supabase)
export interface PerfilUsuario {
  id: string; // = auth.users.id
  organizacion_id: string | null;
  residente_id: string | null;
  rol: RolBackoffice;
  nombre_completo: string | null;
  avatar_url: string | null;
  email: string | null;
  activo: boolean;
  ultimo_acceso: string | null;
  created_at: string;
}

// ─── FAQ del asistente ─────────────────────────────────────────────────────────
export interface Faq {
  id: string;
  organizacion_id: string | null;
  pregunta: string;
  respuesta: string;
  categoria: string | null;
  veces_consultada: number;
  orden: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Auditoría ───────────────────────────────────────────────────────────────
export type AccionAuditoria = 'crear' | 'editar' | 'eliminar' | 'pausar' | 'reactivar' | 'publicar';

export interface AuditLog {
  id: string;
  organizacion_id: string | null;
  usuario_id: string | null;
  usuario_nombre: string | null;
  accion: AccionAuditoria;
  tabla_afectada: string;
  registro_id: string | null;
  descripcion: string | null;
  datos_previos: Record<string, unknown> | null;
  datos_nuevos: Record<string, unknown> | null;
  created_at: string;
}

// ─── Notificaciones ──────────────────────────────────────────────────────────
export interface Notificacion {
  id: string;
  organizacion_id: string;
  residente_id: string | null;
  titulo: string;
  cuerpo: string | null;
  tipo: 'actividad' | 'tutorial' | 'sistema';
  referencia_id: string | null;
  leida: boolean;
  created_at: string;
}

// ─── Logs del asistente IA ─────────────────────────────────────────────────────
export interface AssistantLog {
  id: string;
  organizacion_id: string | null;
  residente_id: string | null;
  pregunta: string;
  respuesta: string | null;
  fue_respondida: boolean;
  ms_respuesta: number | null;
  created_at: string;
}

// ─── KPIs del dashboard ────────────────────────────────────────────────────────
export interface DashboardKpis {
  residentesActivos: number;
  actividadesHoy: number;
  tutorialesPublicados: number;
  consultasAsistente: number;
  usuariosRegistrados: number;
  tutorialMasVisto: { titulo: string; vistas: number } | null;
}

// Permisos derivados del rol — fuente única de verdad para la UI
export interface Permisos {
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  puedeGestionarUsuarios: boolean;
  puedeConfigurar: boolean;
}
