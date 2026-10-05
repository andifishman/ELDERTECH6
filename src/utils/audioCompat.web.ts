// Reproducción de audio — versión WEB, con la misma forma de API que usa la app de `Audio` de expo-av
// (Sound.createAsync, stopAsync, unloadAsync, setVolumeAsync, getStatusAsync, replayAsync,
// setOnPlaybackStatusUpdate, setAudioModeAsync).
//
// Por qué no usar la implementación web de expo-av: arranca `play()` DESPUÉS de esperar a que el
// audio cargue. Safari/iOS solo permite iniciar audio dentro del gesto del usuario (el toque en
// "Escuchar radio"/"▶"); una radio en vivo tarda en cargar, el gesto ya venció y `play()` es
// rechazado con NotAllowedError — la radio quedaba muda en iPhone. Acá `play()` se llama de
// inmediato (el navegador va bufereando) y recién después se espera confirmación.
import { Asset } from 'expo-asset';

interface Estado {
  isLoaded: boolean;
  isPlaying: boolean;
  didJustFinish: boolean;
  positionMillis: number;
  durationMillis?: number;
  volume: number;
  error?: string;
}

type Oyente = (estado: Estado) => void;
type Fuente = { uri: string } | number;
interface OpcionesInicio {
  shouldPlay?: boolean;
  volume?: number;
  isLooping?: boolean;
}

function resolverUri(fuente: Fuente): string {
  const uri = typeof fuente === 'number' ? Asset.fromModule(fuente).uri : fuente.uri;
  // Contenido mixto: una página https NO puede reproducir audio http:// (el navegador lo bloquea).
  // Muchas radios sirven el mismo stream por https en el mismo host; si no, falla y la app cae al
  // `urlFallback` / muestra el error. Es una limitación real de la web — ver docs/WEB_PWA.md.
  if (uri.startsWith('http://') && window.location.protocol === 'https:') return `https://${uri.slice('http://'.length)}`;
  return uri;
}

class SonidoWeb {
  private oyente: Oyente | null = null;
  private descargado = false;

  constructor(private readonly el: HTMLAudioElement) {
    const emitir = () => this.emitir();
    el.addEventListener('playing', emitir);
    el.addEventListener('pause', emitir);
    el.addEventListener('timeupdate', emitir);
    el.addEventListener('ended', () => this.emitir({ didJustFinish: true }));
    el.addEventListener('error', () => this.emitir({ error: el.error?.message ?? 'No se pudo reproducir el audio.' }));
  }

  private estado(extra: Partial<Estado> = {}): Estado {
    const el = this.el;
    return {
      isLoaded: !this.descargado,
      isPlaying: !el.paused && !el.ended,
      didJustFinish: false,
      positionMillis: Math.round(el.currentTime * 1000),
      durationMillis: Number.isFinite(el.duration) ? Math.round(el.duration * 1000) : undefined,
      volume: el.volume,
      ...extra,
    };
  }

  private emitir(extra: Partial<Estado> = {}): void {
    this.oyente?.(this.estado(extra));
  }

  setOnPlaybackStatusUpdate(oyente: Oyente | null): void {
    this.oyente = oyente;
  }

  async getStatusAsync(): Promise<Estado> {
    return this.estado();
  }

  async playAsync(): Promise<Estado> {
    await this.el.play();
    return this.estado();
  }

  async replayAsync(): Promise<Estado> {
    this.el.currentTime = 0;
    await this.el.play();
    return this.estado();
  }

  async pauseAsync(): Promise<Estado> {
    this.el.pause();
    return this.estado();
  }

  async stopAsync(): Promise<Estado> {
    this.el.pause();
    try {
      this.el.currentTime = 0;
    } catch {
      // streams en vivo no se pueden reposicionar
    }
    return this.estado();
  }

  async setVolumeAsync(volumen: number): Promise<Estado> {
    this.el.volume = Math.min(1, Math.max(0, volumen));
    return this.estado();
  }

  async unloadAsync(): Promise<Estado> {
    this.descargado = true;
    this.oyente = null;
    this.el.pause();
    this.el.removeAttribute('src');
    this.el.load(); // corta la descarga (importante en streams de radio)
    return this.estado({ isLoaded: false });
  }
}

const Sound = {
  async createAsync(fuente: Fuente, inicial: OpcionesInicio = {}, alActualizar?: Oyente): Promise<{ sound: SonidoWeb }> {
    const el = new window.Audio();
    el.preload = 'auto';
    el.loop = inicial.isLooping ?? false;
    el.volume = inicial.volume ?? 1;
    el.setAttribute('playsinline', '');
    const sonido = new SonidoWeb(el);
    if (alActualizar) sonido.setOnPlaybackStatusUpdate(alActualizar);
    el.src = resolverUri(fuente);

    // Si se pide reproducir, `play()` se invoca ACÁ, todavía dentro del gesto del usuario (ver arriba).
    // Se espera a que realmente suene (o falle) para resolver/rechazar, como hace expo-av.
    if (inicial.shouldPlay) {
      await new Promise<void>((resolver, rechazar) => {
        const falla = () => rechazar(new Error(el.error?.message ?? 'No se pudo cargar el audio.'));
        el.addEventListener('error', falla, { once: true });
        el.play().then(
          () => {
            el.removeEventListener('error', falla);
            resolver();
          },
          (err: unknown) => rechazar(err instanceof Error ? err : new Error('Reproducción bloqueada por el navegador.')),
        );
      });
    } else {
      await new Promise<void>((resolver, rechazar) => {
        el.addEventListener('canplaythrough', () => resolver(), { once: true });
        el.addEventListener('loadeddata', () => resolver(), { once: true });
        el.addEventListener('error', () => rechazar(new Error(el.error?.message ?? 'No se pudo cargar el audio.')), { once: true });
        el.load();
      });
    }
    return { sound: sonido };
  },
};

export const Audio = {
  Sound,
  /** En web no existe "modo de audio" — el navegador decide. */
  async setAudioModeAsync(): Promise<void> {},
};
