export interface NavegacionAccion {
  ruta: string;
  etiqueta: string;
  emoji: string;
}

export interface MensajeContexto {
  role: 'user' | 'assistant';
  content: string;
}

export interface RespuestaAsistente {
  texto: string;
  navegacion?: NavegacionAccion;
}
