// Todo lo que la app de familiares le pide al backend (/api/familia).
import { apiClient } from '@/lib/apiClient';

const B = '/api/familia';

export interface ResidenteVinculado {
  id: string;
  vinculoId: string;
  nombre: string;
  apellido: string;
  parentesco: string | null;
  seccion: string | null;
}

export interface Me {
  familiar: { id: string; nombre: string; apellido: string; email: string };
  institucion: { nombre: string; telefono: string | null; email: string | null; colorPrincipal: string | null } | null;
  residentes: ResidenteVinculado[];
}

export interface Aviso {
  id: string;
  titulo: string;
  texto: string;
  importante: boolean;
  publicar_en: string;
  leido: boolean;
  leido_en: string | null;
}

export interface Evento {
  id: string;
  titulo: string;
  descripcion: string | null;
  lugar: string | null;
  inicia_en: string;
  termina_en: string | null;
  abierto_inscripcion: boolean;
  cupo: number | null;
  personas_inscriptas: number;
  mi_inscripcion: { personas: number } | null;
}

export interface ActividadHogar {
  id: number;
  nombre: string;
  dia: string;
  hora: string | null;
  horario: string;
  lugar: string | null;
  sectores: string[];
  tallerista: string | null;
  suspendido: boolean;
}

export interface Recordatorio {
  id: string;
  titulo: string;
  fecha: string;
  hora: string;
  estado: string;
}

export interface Inicio {
  avisosSinLeer: number;
  avisosImportantes: Aviso[];
  proximaActividad: { nombre: string; dia: string; horario: string; lugar: string | null; residenteNombre: string } | null;
  fotosNuevas: number;
  mensajesSinLeer: number;
  proximosEventos: Evento[];
}

export interface Noticia {
  id: string;
  titulo: string;
  texto: string;
  imagen_url: string | null;
  categoria: string;
  fecha_evento: string | null;
  fijada: boolean;
  publicar_en: string;
}

export interface Documento {
  id: string;
  titulo: string;
  descripcion: string | null;
  nombre_archivo: string;
  mime: string;
  tamano_bytes: number;
  created_at: string;
  url: string | null;
}

export interface Album {
  id: string;
  titulo: string;
  actividad: string | null;
  fecha: string;
  publicado_en: string | null;
  cantidad_fotos: number;
  portada_url: string | null;
}

export type TipoReaccion = 'corazon' | 'me_gusta' | 'abrazo';

export interface Foto {
  id: string;
  orden: number;
  url: string | null;
  reacciones: Record<TipoReaccion, number>;
  mi_reaccion: TipoReaccion | null;
  cantidad_comentarios: number;
}

export interface Comentario {
  id: string;
  texto: string;
  created_at: string;
  autor: string;
  mio: boolean;
}

export interface Hilo {
  vinculoId: string;
  residenteId: string;
  nombre: string;
  apellido: string;
  parentesco: string | null;
  ultimoMensaje: { autor: 'familiar' | 'residente'; vistaPrevia: string; creadoEn: string } | null;
  sinLeer: number;
}

export interface Mensaje {
  id: string;
  autor: 'familiar' | 'residente';
  contenido: string | null;
  imagenUrl: string | null;
  leido: boolean;
  creadoEn: string;
}

export type TipoCaso = 'consulta' | 'sugerencia' | 'reclamo';
export type EstadoCaso = 'pendiente' | 'en_proceso' | 'resuelta';

export interface Caso {
  id: string;
  tipo: TipoCaso;
  asunto: string;
  descripcion: string;
  estado: EstadoCaso;
  created_at: string;
  categoria_nombre: string | null;
  residente_nombre: string | null;
  cantidad_respuestas: number;
}

export interface MensajeCaso {
  id: string;
  autor: 'familiar' | 'personal';
  texto: string;
  created_at: string;
}

export interface Categoria {
  id: string;
  nombre: string;
}

export interface Propuesta {
  id: string;
  tipo: 'proponer' | 'ofrecerse';
  titulo: string;
  descripcion: string;
  estado: 'pendiente' | 'en_revision' | 'aceptada' | 'no_posible';
  respuesta: string | null;
  created_at: string;
}

export const getMe = () => apiClient.get<Me>(`${B}/me`);
export const getInicio = (residenteId: string | null) => apiClient.get<Inicio>(`${B}/inicio${residenteId ? `?residenteId=${residenteId}` : ''}`);
export const getAgenda = (residenteId: string, desde: string, hasta: string) =>
  apiClient.get<{ actividades: ActividadHogar[]; actividadesDisponibles: boolean; recordatorios: Recordatorio[] }>(`${B}/residentes/${residenteId}/agenda?desde=${desde}&hasta=${hasta}`);
export const getCalendario = (mes: string) => apiClient.get<{ eventos: Evento[]; actividades: ActividadHogar[]; actividadesDisponibles: boolean }>(`${B}/calendario?mes=${mes}`);

export const getAvisos = () => apiClient.get<Aviso[]>(`${B}/avisos`);
export const confirmarAviso = (id: string) => apiClient.post<void>(`${B}/avisos/${id}/leido`);
export const getNoticias = () => apiClient.get<Noticia[]>(`${B}/noticias`);
export const getDocumentos = () => apiClient.get<Documento[]>(`${B}/documentos`);
export const getEventos = () => apiClient.get<Evento[]>(`${B}/eventos`);
export const inscribirse = (id: string, personas: number) => apiClient.put<void>(`${B}/eventos/${id}/inscripcion`, { personas });
export const cancelarInscripcion = (id: string) => apiClient.delete<void>(`${B}/eventos/${id}/inscripcion`);

export const getAlbumes = () => apiClient.get<Album[]>(`${B}/fotos/albumes`);
export const getAlbum = (id: string) => apiClient.get<{ album: Omit<Album, 'cantidad_fotos' | 'portada_url'>; fotos: Foto[] }>(`${B}/fotos/albumes/${id}`);
export const reaccionar = (fotoId: string, tipo: TipoReaccion | null) => apiClient.put<void>(`${B}/fotos/${fotoId}/reaccion`, { tipo });
export const getComentarios = (fotoId: string) => apiClient.get<Comentario[]>(`${B}/fotos/${fotoId}/comentarios`);
export const comentar = (fotoId: string, texto: string) => apiClient.post<void>(`${B}/fotos/${fotoId}/comentarios`, { texto });
export const borrarComentario = (id: string) => apiClient.delete<void>(`${B}/comentarios/${id}`);

export const getHilos = () => apiClient.get<Hilo[]>(`${B}/mensajes`);
export const getMensajes = (residenteId: string) => apiClient.get<Mensaje[]>(`${B}/mensajes/${residenteId}`);
export const enviarMensaje = (residenteId: string, contenido: string, imagen: File | null) => {
  const form = new FormData();
  form.append('contenido', contenido);
  if (imagen) form.append('imagen', imagen);
  return apiClient.postForm<Mensaje>(`${B}/mensajes/${residenteId}`, form);
};

export const getCategorias = () => apiClient.get<Categoria[]>(`${B}/categorias`);
export const getCasos = () => apiClient.get<Caso[]>(`${B}/casos`);
export const crearCaso = (input: { tipo: TipoCaso; categoriaId?: string | null; residenteId?: string | null; asunto: string; descripcion: string }) => apiClient.post<{ id: string }>(`${B}/casos`, input);
export const getCaso = (id: string) => apiClient.get<{ caso: Caso; mensajes: MensajeCaso[] }>(`${B}/casos/${id}`);
export const responderCaso = (id: string, texto: string) => apiClient.post<void>(`${B}/casos/${id}/respuestas`, { texto });

export const getPropuestas = () => apiClient.get<Propuesta[]>(`${B}/propuestas`);
export const crearPropuesta = (input: { tipo: 'proponer' | 'ofrecerse'; titulo: string; descripcion: string }) => apiClient.post<Propuesta>(`${B}/propuestas`, input);
