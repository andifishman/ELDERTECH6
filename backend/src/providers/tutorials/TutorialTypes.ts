export interface CategoriaTutorial {
  id: string;
  nombre: string;
  emoji: string | null;
  orden: number;
  activo: boolean;
}

export interface Tutorial {
  id: string;
  categoria_id: string | null;
  titulo: string;
  descripcion: string | null;
  formato: string;
  url_video: string | null;
  duracion_segundos: number | null;
  thumbnail_url: string | null;
  lo_que_aprenderas: string[] | null;
  orden: number;
  activo: boolean;
}

export interface PasoTutorial {
  id: string;
  tutorial_id: string;
  orden: number;
  titulo: string | null;
  descripcion: string | null;
  imagen_url: string | null;
  tip: string | null;
}

export interface ProgresoTutorial {
  id: string;
  residente_id: string;
  tutorial_id: string;
  favorito: boolean;
  completado: boolean;
  segundos_vistos: number;
  ultima_vista: string | null;
}

export interface TutorialConProgreso extends Tutorial {
  categoria: CategoriaTutorial | null;
  progreso: ProgresoTutorial | null;
}

/** Vista admin (backoffice) — incluye campos que la vista de residente no necesita. */
export interface TutorialAdmin extends Tutorial {
  nivel: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  categoria: CategoriaTutorial | null;
}

export interface TutorialAdminInput {
  titulo: string;
  descripcion?: string | null;
  categoria_id?: string | null;
  formato: string;
  nivel: string;
  url_video?: string | null;
  thumbnail_url?: string | null;
  duracion_segundos?: number | null;
  lo_que_aprenderas?: string[] | null;
  activo: boolean;
  pasos?: Array<{
    orden: number;
    titulo: string;
    descripcion: string;
    imagen_url: string | null;
    tip: string | null;
  }>;
}
