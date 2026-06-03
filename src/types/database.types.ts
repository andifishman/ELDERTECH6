//tipos de todas las tablas de supabase usadas en el proyecto — generados manualmente
// Tipos generados manualmente a partir del schema Supabase de ElderTech
// Cuando tengas el proyecto Supabase creado, reemplazá con:
// npx supabase gen types typescript --project-id <tu-project-id> > src/types/database.types.ts

export type NivelDificultad = 'independiente' | 'necesita_ayuda' | 'dependiente';
export type TipoResponsable = 'empleado' | 'medico' | 'profesor' | 'familiar' | 'externo';
export type FuenteRadio = 'tunein' | 'radio100' | 'manual';
export type TipoEvento = 'medicamento' | 'cita' | 'recordatorio' | 'otro';
export type TipoArticulo = 'texto' | 'video' | 'guia';
export type NivelArticulo = 'principiante' | 'intermedio' | 'avanzado';
export type RolUsuario = 'residente' | 'admin' | 'staff';
export type UnidadTemperatura = 'celsius' | 'fahrenheit';

// ─── Núcleo ──────────────────────────────────────────────────────────────────

export interface Organizacion {
  id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string;
  timezone: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Sector {
  id: string;
  organizacion_id: string;
  nombre: string;
  descripcion: string | null;
  es_default: boolean;
  activo: boolean;
  created_at: string;
}

export interface Piso {
  id: string;
  organizacion_id: string;
  numero: number;
  nombre: string | null;
  descripcion: string | null;
  activo: boolean;
}

export interface Habitacion {
  id: string;
  piso_id: string;
  organizacion_id: string;
  numero: string;
  capacidad: number;
  tipo: string | null;
  activo: boolean;
}

export interface Interes {
  id: string;
  nombre: string;
  emoji: string | null;
  activo: boolean;
}

// ─── Residentes ──────────────────────────────────────────────────────────────

export interface Residente {
  id: string;
  organizacion_id: string;
  sector_id: string;
  habitacion_id: string | null;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  foto_url: string | null;
  nivel_dificultad: NivelDificultad;
  email: string | null;
  telefono: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Horarios ────────────────────────────────────────────────────────────────

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
  piso_id: string | null;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface Responsable {
  id: string;
  organizacion_id: string | null;
  tipo_responsable_id: string | null;
  nombre: string;
  apellido: string;
  email: string | null;
  telefono: string | null;
  foto_url: string | null;
  es_externo: boolean;
  empresa_organizacion: string | null;
  activo: boolean;
  created_at: string;
}

export interface Actividad {
  id: string;
  organizacion_id: string;
  tipo_actividad_id: string;
  ubicacion_id: string | null;
  responsable_id: string | null;
  nombre: string;
  descripcion: string | null;
  emoji_icono: string | null;
  fecha: string;          // 'YYYY-MM-DD'
  hora_inicio: string;    // 'HH:MM:SS'
  hora_fin: string | null;
  es_recurrente: boolean;
  patron_recurrencia: PatronRecurrencia | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatronRecurrencia {
  dias_semana?: number[]; // 0=Dom, 1=Lun ... 6=Sab
  hasta?: string;         // 'YYYY-MM-DD'
}

// Actividad con joins — lo que retorna actividadesService
export interface ActividadCompleta extends Actividad {
  tipo_actividad: TipoActividad;
  ubicacion: Ubicacion | null;
  responsable: Responsable | null;
}

// ─── Clima ───────────────────────────────────────────────────────────────────

export interface ConfiguracionClima {
  id: string;
  organizacion_id: string;
  ciudad: string;
  latitud: number | null;
  longitud: number | null;
  unidad_temperatura: UnidadTemperatura;
  proveedor_api: string;
  activo: boolean;
}

// ─── Radio ───────────────────────────────────────────────────────────────────

export interface CategoriaRadio {
  id: string;
  nombre: string;
  emoji: string | null;
  descripcion: string | null;
  orden: number;
  activo: boolean;
}

export interface Radio {
  id: string;
  categoria_id: string | null;
  nombre: string;
  descripcion: string | null;
  url_stream: string | null;
  url_logo: string | null;
  pais: string;
  ciudad: string | null;
  genero: string | null;
  es_destacada: boolean;
  fuente: FuenteRadio;
  stream_id_externo: string | null;
  activo: boolean;
  created_at: string;
}

export interface RadioConCategoria extends Radio {
  categoria: CategoriaRadio | null;
}

// ─── Contactos ───────────────────────────────────────────────────────────────

export interface TipoContacto {
  id: string;
  nombre: string;
}

export interface Contacto {
  id: string;
  residente_id: string;
  tipo_contacto_id: string | null;
  nombre: string;
  apellido: string | null;
  telefono: string;
  whatsapp_disponible: boolean;
  foto_url: string | null;
  notas: string | null;
  orden: number;
  activo: boolean;
  created_at: string;
}

// ─── Artículos ───────────────────────────────────────────────────────────────

export interface CategoriaArticulo {
  id: string;
  nombre: string;
  emoji: string | null;
  descripcion: string | null;
  orden: number;
  activo: boolean;
}

export interface Articulo {
  id: string;
  categoria_id: string | null;
  titulo: string;
  descripcion: string | null;
  tipo: TipoArticulo;
  url_contenido: string | null;
  duracion_minutos: number | null;
  nivel: NivelArticulo;
  imagen_preview_url: string | null;
  vistas: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}
