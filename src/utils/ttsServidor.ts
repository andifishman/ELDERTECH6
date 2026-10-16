// Texto a voz generado por el backend (POST /api/tts) y reproducido como un <audio> común.
// Solo web: en el navegador del celular el motor de voz propio puede no existir (Chrome de
// Android con Samsung TTS reporta 0 voces y deja el texto en cola para siempre, en silencio),
// pero reproducir un audio siempre anda.
import { apiClient } from '@/services/apiClient';

const MAX_TROZO = 400; // el backend acepta hasta 600; más corto = empieza a sonar antes

let sesion = 0;
let audioActual: HTMLAudioElement | null = null;
let hablandoServidor = false;

export function servidorHablando(): boolean {
  return hablandoServidor;
}

export function detenerServidor(): void {
  sesion += 1;
  if (audioActual) {
    audioActual.pause();
    audioActual.dispatchEvent(new Event('ended'));
    audioActual = null;
  }
  hablandoServidor = false;
}

function dividir(texto: string): string[] {
  const oraciones = texto.match(/[^.!?\n]+[.!?\n]*/g) ?? [texto];
  const trozos: string[] = [];
  let actual = '';
  for (const o of oraciones) {
    if (actual && actual.length + o.length > MAX_TROZO) {
      trozos.push(actual.trim());
      actual = '';
    }
    if (o.length > MAX_TROZO) {
      for (let i = 0; i < o.length; i += MAX_TROZO) trozos.push(o.slice(i, i + MAX_TROZO).trim());
    } else {
      actual += o;
    }
  }
  if (actual.trim()) trozos.push(actual.trim());
  return trozos.filter(Boolean);
}

async function pedirAudio(texto: string): Promise<string> {
  const { audio } = await apiClient.post<{ audio: string }>('/api/tts', { texto });
  return `data:audio/wav;base64,${audio}`;
}

function reproducir(src: string, velocidad: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const audio = new Audio(src);
    audio.playbackRate = velocidad;
    audioActual = audio;
    audio.addEventListener('ended', () => resolve());
    audio.addEventListener('error', () => reject(new Error('No se pudo reproducir el audio')));
    audio.play().catch(reject);
  });
}

/** Lee el texto con la voz del servidor. Se resuelve al terminar o al cortarse; tira error si falla. */
export async function hablarConServidor(texto: string, velocidad: number): Promise<void> {
  detenerServidor();
  const miSesion = sesion;
  hablandoServidor = true;
  try {
    const trozos = dividir(texto);
    let siguiente = pedirAudio(trozos[0]);
    for (let i = 0; i < trozos.length; i++) {
      const actual = siguiente;
      // el pedido del trozo siguiente arranca mientras suena este
      if (i + 1 < trozos.length) {
        siguiente = pedirAudio(trozos[i + 1]);
        siguiente.catch(() => undefined);
      }
      const src = await actual;
      if (miSesion !== sesion) return;
      await reproducir(src, velocidad);
      if (miSesion !== sesion) return;
    }
  } finally {
    if (miSesion === sesion) hablandoServidor = false;
  }
}
