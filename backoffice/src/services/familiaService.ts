// ========================================
// SERVICIO: Familias
// DESCRIPCIÓN:
// Todo lo que el personal gestiona de la app de familiares: quién es
// familiar de quién (vínculos), avisos con confirmación de lectura,
// eventos, documentos, álbumes de fotos, y las consultas, reclamos y
// propuestas que mandan las familias. Habla con /api/admin/familia.
// ========================================
import { apiClient } from '@/lib/apiClient';

const BASE = '/api/admin/familia';

// ─── Familiares y vínculos ───────────────────────────────────────────────────

export interface ResidenteResumen {
  id: string;
  nombre: string;
  apellido: string;
  nombre_completo: string | null;
  seccion: string | null;
  habitacion: string | null;
}

export interface VinculoFamiliar {
  id: string;
  residente_id: string;
  parentesco: string | null;
  activo: boolean;
  revocado_en: string | null;
  residente: ResidenteResumen | null;
}

export interface Familiar {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  activo: boolean;
  invitado_en: string | null;
  ultimo_acceso: string | null;
  created_at: string;
  vinculos: VinculoFamiliar[];
}

export interface CrearFamiliarInput {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  residentes: Array<{ residenteId: string; parentesco: string | null }>;
}

export const listarFamiliares = () => apiClient.get<Familiar[]>(`${BASE}/familiares`);
export const crearFamiliar = (input: CrearFamiliarInput) => apiClient.post<{ familiar: Familiar; yaExistia: boolean }>(`${BASE}/familiares`, input);
export const actualizarFamiliar = (id: string, cambios: { nombre?: string; apellido?: string; telefono?: string | null; activo?: boolean }) =>
  apiClient.patch<Familiar>(`${BASE}/familiares/${id}`, cambios);
export const reinvitarFamiliar = (id: string) => apiClient.post<{ enviada: boolean }>(`${BASE}/familiares/${id}/reinvitar`);
export const vincularFamiliar = (familiarId: string, residenteId: string, parentesco: string | null) =>
  apiClient.post<void>(`${BASE}/familiares/${familiarId}/vinculos`, { residenteId, parentesco });
export const revocarVinculo = (vinculoId: string) => apiClient.post<void>(`${BASE}/vinculos/${vinculoId}/revocar`);
export const reactivarVinculo = (vinculoId: string) => apiClient.post<void>(`${BASE}/vinculos/${vinculoId}/reactivar`);

// ─── Pedidos de acceso (quien intentó entrar sin estar dado de alta) ───────────

export interface SolicitudAcceso {
  id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  telefono: string | null;
  /** A quién dice ser familiar (texto libre, lo lee el personal) */
  residente_texto: string | null;
  parentesco: string | null;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  intentos: number;
  created_at: string;
}

export const listarSolicitudes = () => apiClient.get<SolicitudAcceso[]>(`${BASE}/solicitudes`);
/** Aprobar = dar de alta al familiar con los residentes elegidos. El email sale de la solicitud. */
export const aprobarSolicitud = (id: string, input: Omit<CrearFamiliarInput, 'email'>) => apiClient.post<{ familiarId: string }>(`${BASE}/solicitudes/${id}/aprobar`, input);
export const rechazarSolicitud = (id: string) => apiClient.post<void>(`${BASE}/solicitudes/${id}/rechazar`);

// ─── Avisos ──────────────────────────────────────────────────────────────────

export interface AvisoFamilia {
  id: string;
  titulo: string;
  texto: string;
  importante: boolean;
  publicar_en: string;
  created_at: string;
  cantidad_lecturas: number;
  cantidad_familias: number;
}

export interface LecturaAviso {
  familiar_id: string;
  nombre: string;
  apellido: string;
  email: string;
  leido_en: string | null;
}

export const listarAvisos = () => apiClient.get<AvisoFamilia[]>(`${BASE}/avisos`);
export const crearAviso = (input: { titulo: string; texto: string; importante: boolean; publicarEn?: string }) => apiClient.post<AvisoFamilia>(`${BASE}/avisos`, input);
export const eliminarAviso = (id: string) => apiClient.delete<void>(`${BASE}/avisos/${id}`);
export const lecturasDeAviso = (id: string) => apiClient.get<LecturaAviso[]>(`${BASE}/avisos/${id}/lecturas`);

// ─── Eventos ─────────────────────────────────────────────────────────────────

export interface EventoFamilia {
  id: string;
  titulo: string;
  descripcion: string | null;
  lugar: string | null;
  inicia_en: string;
  termina_en: string | null;
  abierto_inscripcion: boolean;
  cupo: number | null;
  personas_inscriptas: number;
}

export interface EventoInput {
  titulo: string;
  descripcion: string | null;
  lugar: string | null;
  iniciaEn: string;
  terminaEn: string | null;
  abiertoInscripcion: boolean;
  cupo: number | null;
}

export interface Inscripcion {
  familiar_id: string;
  personas: number;
  created_at: string;
  nombre: string;
  apellido: string;
  email: string;
}

export const listarEventos = () => apiClient.get<EventoFamilia[]>(`${BASE}/eventos`);
export const crearEvento = (input: EventoInput) => apiClient.post<EventoFamilia>(`${BASE}/eventos`, input);
export const actualizarEvento = (id: string, input: Partial<EventoInput>) => apiClient.patch<EventoFamilia>(`${BASE}/eventos/${id}`, input);
export const eliminarEvento = (id: string) => apiClient.delete<void>(`${BASE}/eventos/${id}`);
export const inscripcionesDeEvento = (id: string) => apiClient.get<Inscripcion[]>(`${BASE}/eventos/${id}/inscripciones`);

// ─── Documentos ──────────────────────────────────────────────────────────────

export interface DocumentoFamilia {
  id: string;
  titulo: string;
  descripcion: string | null;
  nombre_archivo: string;
  mime: string;
  tamano_bytes: number;
  created_at: string;
  url: string | null;
}

export const listarDocumentos = () => apiClient.get<DocumentoFamilia[]>(`${BASE}/documentos`);
export const subirDocumento = (titulo: string, descripcion: string, archivo: File) => {
  const form = new FormData();
  form.append('titulo', titulo);
  form.append('descripcion', descripcion);
  form.append('archivo', archivo);
  return apiClient.postForm<{ id: string }>(`${BASE}/documentos`, form);
};
export const eliminarDocumento = (id: string) => apiClient.delete<void>(`${BASE}/documentos/${id}`);

// ─── Álbumes de fotos ────────────────────────────────────────────────────────

export interface AlbumFamilia {
  id: string;
  titulo: string;
  actividad: string | null;
  fecha: string;
  publicado_en: string | null;
  created_at: string;
  cantidad_fotos: number;
  portada_url: string | null;
}

export interface ComentarioFoto {
  id: string;
  foto_id: string;
  familiar_id: string;
  texto: string;
  created_at: string;
  autor: string;
}

export interface AlbumDetalle {
  album: { id: string; titulo: string; actividad: string | null; fecha: string; publicado_en: string | null };
  fotos: Array<{ id: string; orden: number; url: string | null }>;
  comentarios: ComentarioFoto[];
}

export const listarAlbumes = () => apiClient.get<AlbumFamilia[]>(`${BASE}/albumes`);
export const crearAlbum = (input: { titulo: string; actividad: string | null; fecha?: string; publicar: boolean }) => apiClient.post<{ id: string }>(`${BASE}/albumes`, input);
export const obtenerAlbum = (id: string) => apiClient.get<AlbumDetalle>(`${BASE}/albumes/${id}`);
export const actualizarAlbum = (id: string, cambios: { titulo?: string; actividad?: string | null; fecha?: string; publicar?: boolean }) =>
  apiClient.patch<{ id: string }>(`${BASE}/albumes/${id}`, cambios);
export const eliminarAlbum = (id: string) => apiClient.delete<void>(`${BASE}/albumes/${id}`);
export const subirFotos = (albumId: string, archivos: File[]) => {
  const form = new FormData();
  archivos.forEach((a) => form.append('fotos', a));
  return apiClient.postForm<{ subidas: number }>(`${BASE}/albumes/${albumId}/fotos`, form);
};
export const eliminarFoto = (fotoId: string) => apiClient.delete<void>(`${BASE}/fotos/${fotoId}`);
export const eliminarComentario = (comentarioId: string) => apiClient.delete<void>(`${BASE}/comentarios/${comentarioId}`);

// ─── Consultas, reclamos y propuestas ────────────────────────────────────────

export type TipoCaso = 'consulta' | 'sugerencia' | 'reclamo';
export type EstadoCaso = 'pendiente' | 'en_proceso' | 'resuelta';

export interface CasoFamilia {
  id: string;
  familiar_id: string;
  tipo: TipoCaso;
  asunto: string;
  descripcion: string;
  estado: EstadoCaso;
  created_at: string;
  updated_at: string;
  categoria_nombre: string | null;
  residente_nombre: string | null;
  familiar_nombre: string | null;
  cantidad_respuestas: number;
}

export interface MensajeCaso {
  id: string;
  autor: 'familiar' | 'personal';
  texto: string;
  created_at: string;
}

export interface CategoriaCaso {
  id: string;
  nombre: string;
  activa: boolean;
  orden: number;
}

export type EstadoPropuesta = 'pendiente' | 'en_revision' | 'aceptada' | 'no_posible';

export interface PropuestaFamilia {
  id: string;
  tipo: 'proponer' | 'ofrecerse';
  titulo: string;
  descripcion: string;
  estado: EstadoPropuesta;
  respuesta: string | null;
  respondido_en: string | null;
  created_at: string;
  familiar_nombre: string | null;
}

export const listarCasos = () => apiClient.get<CasoFamilia[]>(`${BASE}/casos`);
export const obtenerCaso = (id: string) => apiClient.get<{ caso: CasoFamilia; mensajes: MensajeCaso[] }>(`${BASE}/casos/${id}`);
export const responderCaso = (id: string, texto: string) => apiClient.post<void>(`${BASE}/casos/${id}/respuestas`, { texto });
export const cambiarEstadoCaso = (id: string, estado: EstadoCaso) => apiClient.patch<void>(`${BASE}/casos/${id}/estado`, { estado });
export const listarCategorias = () => apiClient.get<CategoriaCaso[]>(`${BASE}/categorias`);
export const crearCategoria = (nombre: string) => apiClient.post<CategoriaCaso>(`${BASE}/categorias`, { nombre });
export const actualizarCategoria = (id: string, cambios: { nombre?: string; activa?: boolean }) => apiClient.patch<CategoriaCaso>(`${BASE}/categorias/${id}`, cambios);
export const listarPropuestas = () => apiClient.get<PropuestaFamilia[]>(`${BASE}/propuestas`);
export const responderPropuesta = (id: string, estado: EstadoPropuesta, respuesta: string | null) =>
  apiClient.patch<PropuestaFamilia>(`${BASE}/propuestas/${id}`, { estado, respuesta });
