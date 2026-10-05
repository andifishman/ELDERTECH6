// Ajustes de audio/voz que solo hacen falta en el navegador. En nativo es un no-op.
//
// 1) Safari/iOS bloquea toda reproducción de audio y de voz sintetizada que no
//    arranque DENTRO de un gesto del usuario (toque). La app lee respuestas del
//    asistente en voz alta después de esperar la respuesta del servidor (o sea, sin
//    gesto), así que en iPhone quedaban mudas. Truco estándar: en el primer toque
//    de la sesión se "desbloquea" el motor hablando un texto vacío y reanudando el
//    AudioContext; a partir de ahí Safari permite hablar sin gesto.
//
// 2) La voz por defecto del navegador depende del idioma del sistema: en un iPhone o
//    una PC en inglés, `lang = 'es-AR'` sin una voz instalada para ese idioma lee
//    el texto con acento inglés. Se envuelve `speechSynthesis.speak` para asignar
//    la mejor voz en español disponible (es-AR → es-419 → es-US/MX → cualquier es-*).
import { Platform } from 'react-native';

const PREFERENCIA_VOCES = ['es-ar', 'es-419', 'es-us', 'es-mx', 'es-es'];

function mejorVozEspanol(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
  const voces = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith('es'));
  if (voces.length === 0) return null;
  for (const lang of PREFERENCIA_VOCES) {
    const exacta = voces.find((v) => v.lang.toLowerCase().replace('_', '-') === lang);
    if (exacta) return exacta;
  }
  return voces[0];
}

function instalarSeleccionDeVoz(synth: SpeechSynthesis): void {
  const originalSpeak = synth.speak.bind(synth);
  synth.speak = (utterance: SpeechSynthesisUtterance) => {
    const idioma = (utterance.lang || '').toLowerCase();
    if (!utterance.voice && (idioma === '' || idioma.startsWith('es'))) {
      const voz = mejorVozEspanol(synth);
      if (voz) {
        utterance.voice = voz;
        if (!utterance.lang) utterance.lang = voz.lang;
      }
    }
    originalSpeak(utterance);
  };
}

function instalarDesbloqueo(synth: SpeechSynthesis): void {
  const eventos: Array<keyof WindowEventMap> = ['touchend', 'pointerup', 'click', 'keydown'];
  const desbloquear = () => {
    eventos.forEach((e) => window.removeEventListener(e, desbloquear, true));
    try {
      const vacio = new SpeechSynthesisUtterance('');
      vacio.volume = 0;
      synth.speak(vacio);
    } catch {
      // sin voz sintetizada disponible: nada que desbloquear
    }
    try {
      const Contexto = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Contexto) {
        const ctx = new Contexto();
        void ctx.resume().finally(() => void ctx.close());
      }
    } catch {
      // ignorar: el audio normal (<audio>) igual se desbloquea con su propio play() dentro del gesto
    }
  };
  eventos.forEach((e) => window.addEventListener(e, desbloquear, true));
}

let instalado = false;

export function instalarAudioWeb(): void {
  if (Platform.OS !== 'web' || instalado || typeof window === 'undefined') return;
  instalado = true;
  if ('speechSynthesis' in window) {
    instalarSeleccionDeVoz(window.speechSynthesis);
    instalarDesbloqueo(window.speechSynthesis);
  }
}
