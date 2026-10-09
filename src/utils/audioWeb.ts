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
import { Alert, Platform } from 'react-native';

const PREFERENCIA_VOCES = ['es-ar', 'es-419', 'es-us', 'es-mx', 'es-es'];

// Si el navegador/sistema no tiene NINGUNA voz en español (pasa en algunos
// Android con Chrome, ej. sin el paquete de voz instalado), antes quedaba en
// silencio total sin ninguna pista — justo el mismo bug que había del lado
// nativo. Se avisa una sola vez por sesión en vez de fallar sin explicación,
// ya que esto lo usan personas con poca visibilidad que dependen de
// escuchar el texto.
//
// Ojo: `getVoices()` en Chrome carga la lista de forma asíncrona — puede
// devolver [] un instante mientras todavía no cargó, no porque falte la voz
// de verdad. Por eso solo se avisa cuando SÍ hay voces cargadas (de
// cualquier idioma) pero ninguna es española — una lista total vacía se
// trata como "todavía cargando", no como "no hay voz".
let avisoVozFaltanteMostrado = false;
function avisarSiFaltaVoz(todasLasVoces: SpeechSynthesisVoice[]): void {
  if (avisoVozFaltanteMostrado || todasLasVoces.length === 0) return;
  const hayVozEs = todasLasVoces.some((v) => v.lang.toLowerCase().startsWith('es'));
  if (hayVozEs) return;
  avisoVozFaltanteMostrado = true;
  Alert.alert(
    'Función de voz no disponible',
    'Este navegador no tiene instalada una voz en español para leer en voz alta. Se puede instalar desde Ajustes del teléfono → Accesibilidad → Texto a voz.',
  );
}

function mejorVozEspanol(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
  const todas = synth.getVoices();
  avisarSiFaltaVoz(todas);
  const voces = todas.filter((v) => v.lang.toLowerCase().startsWith('es'));
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

/**
 * Los botones "Escuchar" funcionan como interruptor (utils/tts.ts): si `speechSynthesis.speaking` dice
 * que ya está hablando, cortan en vez de leer. En Chrome/Safari ese `speaking` a veces queda trabado
 * en `true` sin que suene nada (ej. tras el texto vacío del desbloqueo), y el botón no leía nunca.
 * Además Chrome puede dejar el motor "en pausa" al volver de segundo plano (speak() queda en cola,
 * mudo) y descartar textos en cola que nadie referencia (nunca suenan ni terminan).
 * Y Chrome (sobre todo en Android) DESCARTA en silencio un speak() hecho enseguida después de un
 * cancel() — justo lo que hacen los botones "Escuchar" de la Home (Speech.stop() + Speech.speak()):
 * por eso, si hubo un cancel() recién, el speak() se demora un instante.
 * Acá: `speaking` pasa a significar "uno de NUESTROS textos está en curso de verdad", se reanuda el
 * motor antes de hablar y se guarda una referencia a cada texto hasta que termina.
 */
const DEMORA_TRAS_CANCELAR_MS = 120;

function instalarSeguimientoDeVoz(synth: SpeechSynthesis): void {
  const activas = new Set<SpeechSynthesisUtterance>();
  const demoradas = new Set<SpeechSynthesisUtterance>();
  let ultimoCancel = -Infinity;
  const descriptor = (nombre: 'speaking' | 'pending') => Object.getOwnPropertyDescriptor(Object.getPrototypeOf(synth), nombre)?.get;
  const speakingNativo = descriptor('speaking');
  const pendingNativo = descriptor('pending');
  if (!speakingNativo) return;

  const originalSpeak = synth.speak.bind(synth);
  const hablarYa = (utterance: SpeechSynthesisUtterance) => {
    if (synth.paused) synth.resume();
    originalSpeak(utterance);
  };
  synth.speak = (utterance: SpeechSynthesisUtterance) => {
    if (utterance.text.trim() !== '') {
      activas.add(utterance);
      const fin = () => activas.delete(utterance);
      utterance.addEventListener('end', fin);
      utterance.addEventListener('error', fin);
    }
    const desdeCancel = performance.now() - ultimoCancel;
    if (desdeCancel >= DEMORA_TRAS_CANCELAR_MS) {
      hablarYa(utterance);
      return;
    }
    demoradas.add(utterance);
    setTimeout(() => {
      if (!demoradas.delete(utterance)) return; // la cancelaron mientras esperaba
      hablarYa(utterance);
    }, DEMORA_TRAS_CANCELAR_MS - desdeCancel);
  };

  const originalCancel = synth.cancel.bind(synth);
  synth.cancel = () => {
    ultimoCancel = performance.now();
    activas.clear();
    demoradas.clear();
    originalCancel();
  };

  Object.defineProperty(synth, 'speaking', {
    configurable: true,
    get: () => {
      if (demoradas.size > 0) return true;
      if (activas.size === 0) return false;
      const enCurso = speakingNativo.call(synth) === true || pendingNativo?.call(synth) === true;
      if (!enCurso) activas.clear(); // terminaron sin avisar (pasa en Chrome): no quedar trabado
      return enCurso;
    },
  });
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
    instalarSeguimientoDeVoz(window.speechSynthesis);
    instalarDesbloqueo(window.speechSynthesis);
  }
}
