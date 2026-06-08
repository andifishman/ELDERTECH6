// Tipos del módulo Asistente

export interface SesionAsistente {
  id: string;
  residente_id: string;
  titulo: string | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export interface MensajeAsistente {
  id: string;
  sesion_id: string;
  residente_id: string;
  rol: 'usuario' | 'asistente';
  contenido: string;
  es_favorito: boolean;
  created_at: string;
}

export interface FaqAsistente {
  id: string;
  pregunta: string;
  categoria: string;
  emoji: string;
  orden: number;
  activo: boolean;
}

// Mensaje local (antes de persistir, o para UI optimista)
export interface MensajeLocal {
  id: string;          // temp UUID para la UI
  rol: 'usuario' | 'asistente';
  contenido: string;
  es_favorito: boolean;
  cargando?: boolean;  // true mientras el asistente está "pensando"
  created_at: string;
}

// Configuración de voz del usuario
export interface ConfigVoz {
  velocidad: 'lenta' | 'normal';
  tamanoTexto: 'normal' | 'grande' | 'muy_grande';
  leerRespuestas: boolean;
}

// Contexto de conversación para la IA (últimos N mensajes)
export interface MensajeContexto {
  role: 'user' | 'model';
  parts: [{ text: string }];
}
