// Grabación de voz — implementación WEB con MediaRecorder + getUserMedia.
//
// Por qué no expo-av en web: su preset HIGH_QUALITY fuerza `audio/webm;codecs=opus`,
// y Safari/iOS no siempre soporta ese contenedor en MediaRecorder (graba `audio/mp4`).
// Acá se negocia el formato con `MediaRecorder.isTypeSupported`.
//
// Por qué no Web Speech API (SpeechRecognition) para el asistente: en iOS no funciona
// dentro de una PWA instalada en pantalla de inicio y en Firefox no existe. Grabar el
// audio y mandarlo al backend (Whisper) funciona igual en todos los navegadores y es
// el mismo camino que ya usa la app nativa.
//
// Requisitos del navegador: contexto seguro (HTTPS o localhost) y un gesto del usuario.
import type { Grabacion, PermisoMicrofono } from './grabadora';
import { marcarEnCurso } from '@/pwa/enCursoWeb';

export type { Grabacion, PermisoMicrofono };

// Solo formatos que aceptan los buckets de Supabase (hablemos-audio / pedidos-audio:
// audio/mp4, audio/webm…) y que Whisper entiende. Orden: mp4 primero porque es el
// único que reproduce Safari de forma garantizada en iPhone (los mensajes de voz
// los escucha el otro residente, que puede estar en iOS).
const FORMATOS_PREFERIDOS = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];

const MENSAJE_SAFARI =
  'Para usar el micrófono: en el iPhone andá a Ajustes › Safari › Micrófono y elegí "Preguntar" o "Permitir", ' +
  'y volvé a intentar. En la app instalada, cerrala y volvela a abrir.';

// getUserMedia se llama UNA vez (en pedirPermisoMicrofono) y el stream se reutiliza
// al iniciar: en Safari cada llamada puede volver a mostrar el diálogo de permiso.
let streamPendiente: MediaStream | null = null;

function soportaGrabacion(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  );
}

export async function pedirPermisoMicrofono(): Promise<PermisoMicrofono> {
  if (!soportaGrabacion()) {
    return {
      granted: false,
      mensaje: window.isSecureContext
        ? 'Este navegador no permite grabar audio. Probá con Safari o Chrome actualizado.'
        : 'El micrófono solo funciona en una dirección segura (https). Avisá al equipo técnico.',
    };
  }
  try {
    streamPendiente = await navigator.mediaDevices.getUserMedia({ audio: true });
    return { granted: true, mensaje: '' };
  } catch (err) {
    const nombre = err instanceof DOMException ? err.name : '';
    if (nombre === 'NotFoundError') {
      return { granted: false, mensaje: 'No se encontró ningún micrófono en este dispositivo.' };
    }
    if (nombre === 'NotReadableError') {
      return { granted: false, mensaje: 'El micrófono está siendo usado por otra aplicación. Cerrala y probá de nuevo.' };
    }
    return { granted: false, mensaje: `No diste permiso para usar el micrófono. ${MENSAJE_SAFARI}` };
  }
}

function elegirFormato(): string | undefined {
  return FORMATOS_PREFERIDOS.find((f) => MediaRecorder.isTypeSupported(f));
}

class GrabacionWeb implements Grabacion {
  private readonly trozos: Blob[] = [];
  private uri: string | null = null;

  constructor(private readonly recorder: MediaRecorder, private readonly stream: MediaStream) {
    recorder.addEventListener('dataavailable', (e) => {
      if (e.data.size > 0) this.trozos.push(e.data);
    });
  }

  empezar(): void {
    marcarEnCurso(this, true); // no recargar la página por una actualización mientras se graba
    this.recorder.start();
  }

  stopAndUnloadAsync(): Promise<void> {
    return new Promise((resolve) => {
      const terminar = () => {
        marcarEnCurso(this, false);
        this.stream.getTracks().forEach((t) => t.stop()); // apaga el indicador de micrófono del navegador
        if (this.trozos.length > 0) {
          // Sin forzar `type` con codecs: el MIME real queda en el blob (ver utils/archivoForm.ts).
          this.uri = URL.createObjectURL(new Blob(this.trozos, { type: this.recorder.mimeType }));
        }
        resolve();
      };
      if (this.recorder.state === 'inactive') {
        terminar();
        return;
      }
      this.recorder.addEventListener('stop', terminar, { once: true });
      this.recorder.stop();
    });
  }

  getURI(): string | null {
    return this.uri;
  }
}

export async function iniciarGrabacion(): Promise<Grabacion> {
  const stream = streamPendiente ?? (await navigator.mediaDevices.getUserMedia({ audio: true }));
  streamPendiente = null;
  const formato = elegirFormato();
  const recorder = formato ? new MediaRecorder(stream, { mimeType: formato }) : new MediaRecorder(stream);
  const grabacion = new GrabacionWeb(recorder, stream);
  grabacion.empezar();
  return grabacion;
}

export async function finalizarModoGrabacion(): Promise<void> {
  // En web no existe "modo de audio" — nada que restaurar.
}
