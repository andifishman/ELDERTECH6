//utilidad para texto a voz — usa expo-speech con voz en español para adultos mayores.
//en Android cada marca trae un motor distinto (Google TTS, Samsung TTS, etc.) y no siempre con
//la voz en español instalada: por eso se elige una voz española disponible y, si no hay ninguna,
//se le explica al usuario cómo activarla en vez de quedar mudo
import * as Speech from 'expo-speech';
import * as Updates from 'expo-updates';
import { Alert, AppState, Linking, Platform } from 'react-native';
import { detenerServidor, hablarConServidor, servidorHablando } from '@/utils/ttsServidor';

const RATE_DEFAULT = 0.85; // ligeramente más lento para adultos mayores
const MAX_CHUNK_NATIVO = 1500; // expo-speech tira error si el texto supera ~4000 caracteres
const MAX_CHUNK_WEB = 300;
const ESPERA_MIN_MOTOR_MS = 1500; // el motor de Android tarda en inicializar
const TIMEOUT_VOCES_MS = 4000;
const TIMEOUT_ARRANQUE_MS = 5000; // si no empieza a hablar en este tiempo, algo anda mal
const COOLDOWN_AVISO_MS = 20000;

type Problema = 'sin_motor' | 'sin_voz_es';
type ResultadoVoz =
  | { estado: 'ok'; voz: Speech.Voice }
  | { estado: 'desconocido' } // no se pudieron listar las voces: se intenta hablar igual
  | { estado: Problema };

export interface OpcionesHabla {
  rate?: number;
  //true (default): si ya está hablando, corta y no vuelve a hablar. false: corta y habla de nuevo
  alternar?: boolean;
}

let inicioMotor: number | null = null;
let vozCache: Speech.Voice | null = null;
let cierreActual: (() => void) | null = null;
let avisoVisible = false;
let ultimoAvisoMs = 0;
let pendiente: { texto: string; rate: number } | null = null;
let escuchandoRetorno = false;

//web: true si el navegador no tiene ninguna voz (Chrome de Android con Samsung TTS) — ahí se usa la voz del servidor
let webSinVoces: boolean | null = null;

async function detectarWebSinVoces(): Promise<boolean> {
  if (webSinVoces !== null) return webSinVoces;
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  if (!synth) {
    webSinVoces = true;
    return true;
  }
  if (synth.getVoices().length === 0) {
    // la lista puede tardar un instante en cargar: se espera el evento antes de decidir
    await Promise.race([
      new Promise<void>((res) => synth.addEventListener('voiceschanged', () => res(), { once: true })),
      esperar(1500),
    ]);
  }
  webSinVoces = synth.getVoices().length === 0;
  return webSinVoces;
}

let ultimoAvisoServidorMs = 0;
function avisarFallaServidor(): void {
  const ahora = Date.now();
  if (typeof window === 'undefined' || ahora - ultimoAvisoServidorMs < COOLDOWN_AVISO_MS) return;
  ultimoAvisoServidorMs = ahora;
  window.alert('No pudimos reproducir la voz en este momento. Probá de nuevo en unos segundos.');
}

//despierta el motor de voz al abrir la app para que el primer "Escuchar" no llegue en frío
export function iniciarTTS(): void {
  if (Platform.OS === 'web') void detectarWebSinVoces();
  if (Platform.OS !== 'android' || inicioMotor !== null) return;
  inicioMotor = Date.now();
  Speech.isSpeakingAsync().catch(() => undefined);
}

//espera una promesa del motor de voz pero no se queda colgado si el motor no responde (devuelve null)
function conTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p.catch(() => null), esperar(ms).then(() => null)]);
}

//identifica qué versión del código corre (para el código de diagnóstico del cartel)
function versionCodigo(): string {
  const id = Updates.updateId ? Updates.updateId.slice(0, 6) : 'embebido';
  return `v3-${id}`;
}

function esperar(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

//puntaje de una voz: -1 si no es español; más alto = mejor para un residente argentino
function puntuarVoz(v: Speech.Voice): number {
  const idioma = v.language.toLowerCase().replace('_', '-');
  if (!idioma.startsWith('es')) return -1;
  let p = 10;
  if (idioma === 'es-ar') p += 8;
  else if (idioma === 'es-us' || idioma === 'es-mx' || idioma === 'es-419') p += 5;
  else if (idioma === 'es-es') p += 2;
  if (!/network/i.test(v.name)) p += 4; // las "network" necesitan internet
  if (v.quality === Speech.VoiceQuality.Enhanced) p += 1;
  return p;
}

async function resolverVoz(): Promise<ResultadoVoz> {
  if (vozCache) return { estado: 'ok', voz: vozCache };

  if (Platform.OS === 'android') {
    iniciarTTS();
    const transcurrido = Date.now() - (inicioMotor ?? Date.now());
    if (transcurrido < ESPERA_MIN_MOTOR_MS) await esperar(ESPERA_MIN_MOTOR_MS - transcurrido);
  }

  let voces: Speech.Voice[] | null;
  try {
    voces = await Promise.race([
      Speech.getAvailableVoicesAsync(),
      esperar(TIMEOUT_VOCES_MS).then(() => null),
    ]);
  } catch {
    // algunos motores (Samsung) fallan al listar voces — no significa que no hablen
    return { estado: 'desconocido' };
  }

  if (voces === null) return { estado: 'sin_motor' };

  const mejor = voces
    .map((v) => ({ v, p: puntuarVoz(v) }))
    .filter((x) => x.p >= 0)
    .sort((a, b) => b.p - a.p)[0];

  if (!mejor) return { estado: 'sin_voz_es' };
  vozCache = mejor.v;
  return { estado: 'ok', voz: mejor.v };
}

//corta el texto en trozos por oraciones para no pasar el límite del motor
function dividirTexto(texto: string): string[] {
  // en la web Chrome corta las lecturas largas a los ~15s, así que se usan trozos chicos
  const MAX_CHUNK = Platform.OS === 'web' ? MAX_CHUNK_WEB : MAX_CHUNK_NATIVO;
  if (texto.length <= MAX_CHUNK) return [texto];
  const oraciones = texto.match(/[^.!?\n]+[.!?\n]*/g) ?? [texto];
  const partes: string[] = [];
  let actual = '';
  for (const o of oraciones) {
    if (actual.length + o.length > MAX_CHUNK && actual) {
      partes.push(actual);
      actual = '';
    }
    if (o.length > MAX_CHUNK) {
      for (let i = 0; i < o.length; i += MAX_CHUNK) partes.push(o.slice(i, i + MAX_CHUNK));
    } else {
      actual += o;
    }
  }
  if (actual.trim()) partes.push(actual);
  return partes;
}

//abre la pantalla más directa para instalar/activar la voz según el problema
async function abrirAjustesDeVoz(problema: Problema): Promise<void> {
  if (problema === 'sin_motor') {
    for (const url of [
      'market://details?id=com.google.android.tts',
      'https://play.google.com/store/apps/details?id=com.google.android.tts',
    ]) {
      try {
        await Linking.openURL(url);
        return;
      } catch {
        // probar el siguiente
      }
    }
  }
  for (const accion of [
    'android.speech.tts.engine.INSTALL_TTS_DATA',
    'com.android.settings.TTS_SETTINGS',
  ]) {
    try {
      await Linking.sendIntent(accion);
      return;
    } catch {
      // probar el siguiente
    }
  }
  await Linking.openSettings().catch(() => undefined);
}

//al volver de los ajustes, si ya hay voz en español, lee lo que el usuario había pedido
function escucharRetornoDeAjustes(): void {
  if (escuchandoRetorno) return;
  escuchandoRetorno = true;
  AppState.addEventListener('change', async (estado) => {
    if (estado !== 'active' || !pendiente) return;
    const p = pendiente;
    pendiente = null;
    vozCache = null;
    const r = await resolverVoz();
    if (r.estado === 'ok' || r.estado === 'desconocido') {
      void hablar(p.texto, { rate: p.rate, alternar: false });
    }
  });
}

function mostrarAviso(problema: Problema, texto: string, rate: number, detalle: string): void {
  const ahora = Date.now();
  if (avisoVisible || ahora - ultimoAvisoMs < COOLDOWN_AVISO_MS) return;
  avisoVisible = true;
  ultimoAvisoMs = ahora;
  escucharRetornoDeAjustes();

  const mensaje =
    problema === 'sin_motor'
      ? 'Este celular no tiene instalada la voz que lee los textos en voz alta.\n\nTocá "Activar" y después "Instalar" en la pantalla que se abre. Cuando termine, volvé a ElderTech.'
      : 'Al celular le falta la voz en español para leer los textos en voz alta.\n\nTocá "Activar", elegí "Español" y descargá la voz. Cuando termine, volvé a ElderTech y se va a escuchar sola.';
  const mensajeFinal = `${mensaje}

(código: ${detalle})`;

  const cerrar = () => { avisoVisible = false; };
  Alert.alert(
    'Activar la voz',
    mensajeFinal,
    [
      { text: 'Ahora no', style: 'cancel', onPress: cerrar },
      {
        text: 'Activar',
        onPress: () => {
          cerrar();
          pendiente = { texto, rate };
          void abrirAjustesDeVoz(problema);
        },
      },
    ],
    { cancelable: true, onDismiss: cerrar },
  );
}

type Intento = 'ok' | 'no_arranca' | 'silencio' | 'error';

//habla las partes y dice cómo terminó: bien, sin arrancar nunca, "terminó" al instante (mudo) o con error
function leer(partes: string[], voz: Speech.Voice | null, rate: number, android: boolean): Promise<Intento> {
  const conMedicion = android;
  return new Promise<Intento>((resolve) => {
    let inicioMs = 0;
    let terminado = false;
    let vigilante: ReturnType<typeof setTimeout> | undefined;
    let intervalo: ReturnType<typeof setInterval> | undefined;
    const largo = partes.reduce((n, p) => n + p.length, 0);

    const fin = (resultado: Intento) => {
      if (terminado) return;
      terminado = true;
      if (vigilante) clearTimeout(vigilante);
      if (intervalo) clearInterval(intervalo);
      if (cierreActual === cortado) cierreActual = null;
      resolve(resultado);
    };
    //terminó normal; si un texto largo "terminó" en menos de 0,4s, el motor no habló en realidad
    const terminoNormal = () => fin(conMedicion && inicioMs > 0 && largo > 40 && Date.now() - inicioMs < 400 ? 'silencio' : 'ok');
    const cortado = () => fin('ok');
    cierreActual = cortado;

    //red de seguridad: algunos navegadores/motores pierden el evento "terminó" y el botón quedaría pegado
    const vigilarFin = () => {
      intervalo = setInterval(async () => {
        if ((await conTimeout(Speech.isSpeakingAsync(), 2000)) === false) terminoNormal();
      }, 1000);
    };

    //si el motor nunca arranca (no hay voz, motor roto) se avisa en vez de quedar mudo
    vigilante = setTimeout(() => {
      if (inicioMs > 0) return;
      Speech.stop();
      fin('no_arranca');
    }, TIMEOUT_ARRANQUE_MS);

    partes.forEach((parte, i) => {
      Speech.speak(parte, {
        // en Android "es-AR" no es un locale válido para el módulo nativo; la voz elegida manda
        language: android ? 'es' : 'es-AR', // en la web audioWeb.ts elige la voz en español
        voice: voz?.identifier,
        pitch: 1.0,
        rate,
        onStart: i === 0 ? () => { inicioMs = Date.now(); vigilarFin(); } : undefined,
        onDone: i === partes.length - 1 ? terminoNormal : undefined,
        onStopped: cortado,
        onError: () => fin(inicioMs > 0 ? 'ok' : 'error'),
      });
    });
  });
}

//lee el texto en voz alta; por defecto, si ya está hablando lo detiene.
//la promesa se resuelve cuando termina (o se corta) la lectura
export async function hablar(texto: string, opciones: OpcionesHabla = {}): Promise<void> {
  const { rate = RATE_DEFAULT, alternar = true } = opciones;
  const limpio = texto.trim();
  if (!limpio) return;
  const android = Platform.OS === 'android';
  let detalle = versionCodigo();

  if (Platform.OS === 'web') {
    await hablarEnWeb(limpio, rate, alternar);
    return;
  }

  try {
    const hablando = await conTimeout(Speech.isSpeakingAsync(), 2000);
    if (hablando === null) detalle += ' motor-sin-respuesta';
    if (hablando) {
      cortarLectura();
      if (alternar) return;
    }

    // iOS trae voces en español de fábrica; en la web el navegador no tiene a dónde mandar al usuario
    const resultado: ResultadoVoz = android ? await resolverVoz() : { estado: 'desconocido' };
    detalle += ` ${resultado.estado}`;

    if (android && (resultado.estado === 'sin_motor' || resultado.estado === 'sin_voz_es')) {
      mostrarAviso(resultado.estado, limpio, rate, detalle);
      return;
    }
    const voz = resultado.estado === 'ok' ? resultado.voz : null;
    if (voz) detalle += ` ${voz.name}`;
    const partes = dividirTexto(limpio);

    let intento = await leer(partes, voz, rate, android);
    detalle += ` ${intento}`;

    //el motor listó la voz pero no habló: se reintenta con la voz que el motor elija solo
    if (android && voz && (intento === 'silencio' || intento === 'error')) {
      vozCache = null;
      intento = await leer(partes, null, rate, android);
      detalle += ` reintento:${intento}`;
    }

    if (android && intento !== 'ok') mostrarAviso('sin_voz_es', limpio, rate, detalle);
  } catch (e) {
    if (android) {
      mostrarAviso('sin_voz_es', limpio, rate, `${detalle} excepcion:${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

//web: voz del navegador si tiene voces; si no, o si no arranca, voz generada por el servidor
async function hablarEnWeb(texto: string, rate: number, alternar: boolean): Promise<void> {
  try {
    if (servidorHablando()) {
      detenerServidor();
      if (alternar) return;
    }
    if (await conTimeout(Speech.isSpeakingAsync(), 2000)) {
      cortarLectura();
      if (alternar) return;
    }

    const velocidadServidor = Math.min(1, rate + 0.1);
    if (await detectarWebSinVoces()) {
      await hablarConServidor(texto, velocidadServidor);
      return;
    }

    const intento = await leer(dividirTexto(texto), null, rate, false);
    if (intento !== 'ok') {
      webSinVoces = true; // el navegador dice tener voces pero no habla: no insistir
      await hablarConServidor(texto, velocidadServidor);
    }
  } catch {
    avisarFallaServidor();
  }
}

//corta la lectura actual y libera a quien esté esperando que termine
function cortarLectura(): void {
  detenerServidor();
  Speech.stop();
  cierreActual?.();
}

//detiene la lectura si está activa
export async function detenerHabla(): Promise<void> {
  if (servidorHablando() || (await conTimeout(Speech.isSpeakingAsync(), 2000))) cortarLectura();
}

//devuelve true si el sintetizador de voz está activo en este momento
export async function estaHablando(): Promise<boolean> {
  return servidorHablando() || (await conTimeout(Speech.isSpeakingAsync(), 2000)) === true;
}
