// Grabación de voz en el navegador (MediaRecorder). Chrome/Android graba webm; Safari/iPhone graba mp4 —el backend
// acepta los dos y verifica el tipo por los bytes—.
import { useCallback, useEffect, useRef, useState } from 'react';

export const MAX_SEGUNDOS_AUDIO = 300;

export interface AudioGrabado {
  archivo: File;
  /** URL local para escucharlo antes de enviarlo. */
  vistaUrl: string;
  segundos: number;
}

const TIPOS = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];

export const grabacionDisponible = (): boolean => typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

export function useGrabadora() {
  const [grabando, setGrabando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [audio, setAudio] = useState<AudioGrabado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const grabadorRef = useRef<MediaRecorder | null>(null);
  const flujoRef = useRef<MediaStream | null>(null);
  const trozosRef = useRef<Blob[]>([]);
  const inicioRef = useRef(0);
  const reloj = useRef<ReturnType<typeof setInterval> | null>(null);
  const descartarAlParar = useRef(false);

  const soltarMicrofono = useCallback(() => {
    if (reloj.current) clearInterval(reloj.current);
    reloj.current = null;
    flujoRef.current?.getTracks().forEach((t) => t.stop());
    flujoRef.current = null;
  }, []);

  const quitar = useCallback(() => {
    setAudio((a) => {
      if (a) URL.revokeObjectURL(a.vistaUrl);
      return null;
    });
  }, []);

  const detener = useCallback(() => {
    if (grabadorRef.current && grabadorRef.current.state !== 'inactive') grabadorRef.current.stop();
  }, []);

  const iniciar = useCallback(async () => {
    setError(null);
    quitar();
    if (!grabacionDisponible()) return setError('Este navegador no permite grabar audio. Podés escribir el mensaje.');
    try {
      const flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
      flujoRef.current = flujo;
      const tipo = TIPOS.find((t) => MediaRecorder.isTypeSupported(t));
      const grabador = new MediaRecorder(flujo, tipo ? { mimeType: tipo } : undefined);
      trozosRef.current = [];
      descartarAlParar.current = false;
      grabador.ondataavailable = (e) => { if (e.data.size > 0) trozosRef.current.push(e.data); };
      grabador.onstop = () => {
        const duracion = Math.max(1, Math.round((Date.now() - inicioRef.current) / 1000));
        const mime = (grabador.mimeType || tipo || 'audio/webm').split(';')[0]!;
        soltarMicrofono();
        setGrabando(false);
        if (descartarAlParar.current || trozosRef.current.length === 0) return;
        const extension = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
        const blob = new Blob(trozosRef.current, { type: mime });
        setAudio({ archivo: new File([blob], `audio.${extension}`, { type: mime }), vistaUrl: URL.createObjectURL(blob), segundos: duracion });
      };
      grabadorRef.current = grabador;
      inicioRef.current = Date.now();
      setSegundos(0);
      grabador.start();
      setGrabando(true);
      reloj.current = setInterval(() => {
        const s = Math.round((Date.now() - inicioRef.current) / 1000);
        setSegundos(s);
        if (s >= MAX_SEGUNDOS_AUDIO) detener();
      }, 500);
    } catch (e) {
      soltarMicrofono();
      setGrabando(false);
      setError(e instanceof DOMException && e.name === 'NotAllowedError' ? 'Para grabar tenés que permitir el micrófono en el navegador.' : 'No se pudo usar el micrófono.');
    }
  }, [detener, quitar, soltarMicrofono]);

  /** Corta la grabación en curso sin guardar nada. */
  const cancelar = useCallback(() => {
    descartarAlParar.current = true;
    detener();
  }, [detener]);

  // Si se cierra la pantalla grabando, se suelta el micrófono.
  useEffect(() => () => {
    descartarAlParar.current = true;
    if (grabadorRef.current && grabadorRef.current.state !== 'inactive') grabadorRef.current.stop();
    soltarMicrofono();
  }, [soltarMicrofono]);

  return { grabando, segundos, audio, error, iniciar, detener, cancelar, quitar };
}

export const formatoDuracion = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
