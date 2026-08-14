// Bloques ElderTech — puzzle de bloques original (temática propia, sin
// relación con Block Blast más allá de la mecánica general de "completar
// líneas"). Interacción: arrastrar una pieza de la bandeja con el dedo y
// soltarla sobre el tablero — igual que los juegos de bloques comerciales.
//
// Capa visual: tablero oscuro con bloques tipo "gema" (gradiente + faceta de
// brillo + sombra inferior + borde), vía expo-linear-gradient. Arrastre y
// animaciones con react-native-gesture-handler + react-native-reanimated —
// las tres ya eran dependencias del proyecto, no hace falta build nativo nuevo.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '@/components/ui/AppHeader';
import { SpeakButton } from '@/components/common/SpeakButton';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';
import { useTutorial } from '@/hooks/useTutorial';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useSonidoJuegos } from '@/context/SonidoJuegosContext';
import { registrarPartida, obtenerEstadisticasPuntaje } from '@/services/juegosService';

const TAM = 8;
const PADDING_TABLERO = 5;
const LEVANTAR_AL_ARRASTRAR = 70; // la pieza flota este tanto arriba del dedo, para no taparla con la mano

type Fase = 'inicio' | 'jugando' | 'fin';
type Celda = number | null;
type Forma = readonly (readonly [number, number])[];

// Paleta vívida tipo juego de bloques comercial: rojo, amarillo, verde, azul, violeta, celeste, naranja.
const CLARO = ['#FF5252', '#FFD54F', '#66BB6A', '#42A5F5', '#BA68C8', '#4DD0E1', '#FFA726'];
const OSCURO = ['#B71C1C', '#F57F17', '#1B5E20', '#0D47A1', '#4A148C', '#00838F', '#E65100'];

// Set completo estilo Tetris: I, O, T, S, Z, L, J en sus rotaciones, más
// algunas piezas chicas (1, 2 y 3 celdas) para variar la dificultad.
const FORMAS: Forma[] = [
  // chicas
  [[0, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [2, 0]],
  // O (cuadrado 2×2)
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  // I (recta de 4)
  [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  // T
  [[0, 0], [0, 1], [0, 2], [1, 1]],
  [[1, 0], [1, 1], [1, 2], [0, 1]],
  [[0, 0], [1, 0], [2, 0], [1, 1]],
  [[0, 1], [1, 0], [1, 1], [2, 1]],
  // S
  [[0, 1], [0, 2], [1, 0], [1, 1]],
  [[0, 0], [1, 0], [1, 1], [2, 1]],
  // Z
  [[0, 0], [0, 1], [1, 1], [1, 2]],
  [[0, 1], [1, 0], [1, 1], [2, 0]],
  // L
  [[0, 0], [1, 0], [2, 0], [2, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 0]],
  [[0, 0], [0, 1], [1, 1], [2, 1]],
  [[1, 0], [1, 1], [1, 2], [0, 2]],
  // J (espejo de la L)
  [[0, 1], [1, 1], [2, 0], [2, 1]],
  [[0, 0], [1, 0], [1, 1], [1, 2]],
  [[0, 0], [0, 1], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [0, 2], [1, 2]],
];

interface PiezaBloque { id: number; forma: Forma; color: number }

let siguienteIdPieza = 1;
function generarPieza(): PiezaBloque {
  const forma = FORMAS[Math.floor(Math.random() * FORMAS.length)];
  const color = Math.floor(Math.random() * CLARO.length);
  return { id: siguienteIdPieza++, forma, color };
}

function tableroVacio(): Celda[][] {
  return Array.from({ length: TAM }, () => new Array<Celda>(TAM).fill(null));
}

function puedeColocarse(tablero: Celda[][], forma: Forma, anclaR: number, anclaC: number): boolean {
  return forma.every(([dr, dc]) => {
    const r = anclaR + dr, c = anclaC + dc;
    return r >= 0 && r < TAM && c >= 0 && c < TAM && tablero[r][c] === null;
  });
}

function colocarPieza(tablero: Celda[][], forma: Forma, anclaR: number, anclaC: number, color: number): Celda[][] {
  const nuevo = tablero.map((fila) => fila.slice());
  for (const [dr, dc] of forma) nuevo[anclaR + dr][anclaC + dc] = color;
  return nuevo;
}

function hayColocacionPosibleParaPieza(tablero: Celda[][], forma: Forma): boolean {
  for (let r = 0; r < TAM; r++) {
    for (let c = 0; c < TAM; c++) {
      if (puedeColocarse(tablero, forma, r, c)) return true;
    }
  }
  return false;
}

function hayJugadaPosible(tablero: Celda[][], piezas: PiezaBloque[]): boolean {
  return piezas.some((p) => hayColocacionPosibleParaPieza(tablero, p.forma));
}

/** Si el ancla exacta no entra, prueba las 8 celdas vecinas — así no hace falta soltar pixel-perfecto. */
function buscarAnclaCercana(tablero: Celda[][], forma: Forma, anclaR: number, anclaC: number): { r: number; c: number } | null {
  if (puedeColocarse(tablero, forma, anclaR, anclaC)) return { r: anclaR, c: anclaC };
  const vecinos: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [dr, dc] of vecinos) {
    const r = anclaR + dr, c = anclaC + dc;
    if (puedeColocarse(tablero, forma, r, c)) return { r, c };
  }
  return null;
}

function generarBandeja(tablero: Celda[][]): PiezaBloque[] {
  let bandeja: PiezaBloque[];
  let intentos = 0;
  do {
    bandeja = [generarPieza(), generarPieza(), generarPieza()];
    intentos++;
  } while (!hayJugadaPosible(tablero, bandeja) && intentos < 15);
  return bandeja;
}

function encontrarLineasCompletas(tablero: Celda[][]): { filas: number[]; columnas: number[] } {
  const filas: number[] = [];
  const columnas: number[] = [];
  for (let r = 0; r < TAM; r++) if (tablero[r].every((v) => v !== null)) filas.push(r);
  for (let c = 0; c < TAM; c++) if (tablero.every((fila) => fila[c] !== null)) columnas.push(c);
  return { filas, columnas };
}

function limpiarLineas(tablero: Celda[][], filas: number[], columnas: number[]): Celda[][] {
  const nuevo = tablero.map((fila) => fila.slice());
  for (const r of filas) for (let c = 0; c < TAM; c++) nuevo[r][c] = null;
  for (const c of columnas) for (let r = 0; r < TAM; r++) nuevo[r][c] = null;
  return nuevo;
}

function celdasDeLineas(filas: number[], columnas: number[]): Set<string> {
  const set = new Set<string>();
  for (const r of filas) for (let c = 0; c < TAM; c++) set.add(`${r},${c}`);
  for (const c of columnas) for (let r = 0; r < TAM; r++) set.add(`${r},${c}`);
  return set;
}

// ─── Puntuación estilo Block Blast (investigado en guías del juego real) ──────
// 1 punto por celda colocada + 10 puntos por celda limpiada (única, sin
// contar dos veces la intersección fila×columna) + bono si se limpian varias
// líneas de un solo movimiento + un multiplicador de racha que sube mientras
// se siga limpiando en movimientos consecutivos y se resetea a la primera
// colocación que no limpia nada.
function bonoMultilinea(lineas: number, tableroQuedaVacio: boolean): number {
  if (tableroQuedaVacio) return 360;
  const tabla: Record<number, number> = { 2: 30, 3: 80, 4: 140, 5: 200, 6: 300, 7: 300, 8: 300 };
  return tabla[Math.min(lineas, 8)] ?? 0;
}
const RACHA_MULTIPLICADOR_MAX = 8;

function dimensionesForma(forma: Forma): { filas: number; columnas: number } {
  let maxR = 0, maxC = 0;
  for (const [dr, dc] of forma) { maxR = Math.max(maxR, dr); maxC = Math.max(maxC, dc); }
  return { filas: maxR + 1, columnas: maxC + 1 };
}

function celdasDePieza(forma: Forma, anclaR: number, anclaC: number): Set<string> {
  return new Set(forma.map(([dr, dc]) => `${anclaR + dr},${anclaC + dc}`));
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Rompe las celdas de a poco (como Block Blast) en vez de todas de golpe —
 * las va agregando a `celdasRompiendose` en tandas cortas; el llamador
 * limpia el tablero de verdad recién cuando termina. */
async function limpiarEnOleadas(celdas: string[], setRompiendose: (s: Set<string>) => void): Promise<void> {
  const OLEADAS = 4;
  const porOleada = Math.max(1, Math.ceil(celdas.length / OLEADAS));
  const acumulado = new Set<string>();
  for (let i = 0; i < celdas.length; i += porOleada) {
    celdas.slice(i, i + porOleada).forEach((c) => acumulado.add(c));
    setRompiendose(new Set(acumulado));
    await esperar(45);
  }
}

// ─── Visual de un bloque ───────────────────────────────────────────────────

// Sin gradiente ni sombra por celda — con 64 celdas en el tablero, eso era
// lo más caro de dibujar en Android y la causa real de la traba (no el
// arrastre en sí). Dos capas de color plano (oscuro de fondo + claro
// encima) dan casi el mismo volumen visual sin el costo de LinearGradient
// por celda. `resaltado` pinta la celda de un color parejo (blanco/dorado)
// para el aviso de "esta línea se va a completar".
function BloqueVisual({ color, atenuado, resaltado, sinBorde }: { color: number; atenuado?: boolean; resaltado?: boolean; sinBorde?: boolean }) {
  return (
    <View style={[styles.bloqueBorde, sinBorde && styles.bloqueSinBorde, { backgroundColor: resaltado ? '#FFFFFF' : OSCURO[color] }, atenuado && { opacity: 0.55 }]}>
      <View style={[styles.bloqueRelleno, { backgroundColor: resaltado ? '#FFF3C4' : CLARO[color] }]}>
        <View style={styles.bloqueBrilloSuave} />
      </View>
    </View>
  );
}

// ─── Celda del tablero — sin animación propia (se sacó "crecer" por rendimiento) ──

function BloqueCelda({ color, resaltada, rompiendo, previsualizada, previsualizadaInvalida, previsualizadaLinea }: {
  color: Celda; resaltada: boolean; rompiendo: boolean; previsualizada: boolean; previsualizadaInvalida: boolean; previsualizadaLinea: boolean;
}) {
  if (color === null) {
    return (
      <View
        style={[
          styles.celdaVacia,
          previsualizada && (previsualizadaInvalida ? styles.celdaPreviaInvalida : previsualizadaLinea ? styles.celdaPreviaLinea : styles.celdaPreviaValida),
        ]}
      />
    );
  }
  if (rompiendo) return null; // ya se está rompiendo de a poco, ver limpiarEnOleadas

  return <BloqueVisual color={color} resaltado={resaltada} />;
}

// ─── Pieza de la bandeja: se arrastra con el dedo ─────────────────────────────

interface PiezaArrastrableProps {
  pieza: PiezaBloque;
  tamano: number;
  tamanoCelda: number;
  oculta: boolean;
  fantasmaX: ReturnType<typeof useSharedValue<number>>;
  fantasmaY: ReturnType<typeof useSharedValue<number>>;
  containerPosX: ReturnType<typeof useSharedValue<number>>;
  containerPosY: ReturnType<typeof useSharedValue<number>>;
  onComenzar: (pieza: PiezaBloque) => void;
  onMover: (pieza: PiezaBloque, absX: number, absY: number) => void;
  onSoltar: (pieza: PiezaBloque, absX: number, absY: number) => void;
}

function PiezaArrastrable({
  pieza, tamano, tamanoCelda, oculta, fantasmaX, fantasmaY, containerPosX, containerPosY, onComenzar, onMover, onSoltar,
}: PiezaArrastrableProps) {
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const escala = useSharedValue(1);
  const { filas, columnas } = dimensionesForma(pieza.forma);

  // La posición del fantasma se calcula acá adentro, en el hilo de UI —
  // nada de cruzar al hilo de JS en cada cuadro del arrastre (eso era lo
  // que lo hacía sentir trabado). Solo se llama a onMover (JS) para
  // actualizar la previsualización de celdas, y esa función ya viene
  // limitada a una frecuencia baja (ver throttle en la pantalla principal).
  const gesto = Gesture.Pan()
    // Margen extra invisible alrededor de la pieza para agarrarla — no hace
    // falta tocar el pixel exacto, sobre todo para piezas chicas o con
    // celdas concentradas en una esquina (más difícil para manos con
    // movilidad reducida).
    .hitSlop({ top: 24, bottom: 24, left: 24, right: 24 })
    .onStart(() => {
      escala.value = withTiming(1.12, { duration: 100 });
      runOnJS(onComenzar)(pieza);
    })
    .onUpdate((e) => {
      dragX.value = e.translationX;
      dragY.value = e.translationY;
      fantasmaX.value = e.absoluteX - containerPosX.value - (columnas * tamanoCelda) / 2;
      fantasmaY.value = e.absoluteY - containerPosY.value - LEVANTAR_AL_ARRASTRAR - (filas * tamanoCelda) / 2;
      runOnJS(onMover)(pieza, e.absoluteX, e.absoluteY);
    })
    .onEnd((e) => {
      runOnJS(onSoltar)(pieza, e.absoluteX, e.absoluteY);
      dragX.value = withSpring(0);
      dragY.value = withSpring(0);
      escala.value = withSpring(1);
    });

  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value }, { translateY: dragY.value }, { scale: escala.value }],
    opacity: oculta ? 0 : 1,
    zIndex: oculta ? 0 : 10,
  }));

  return (
    <GestureDetector gesture={gesto}>
      <Animated.View style={[styles.piezaBandeja, estiloAnimado]} accessibilityRole="button" accessibilityLabel="Arrastrar esta pieza al tablero">
        <View style={{ width: columnas * tamano, height: filas * tamano }}>
          {pieza.forma.map(([dr, dc], i) => (
            <View key={i} style={{ position: 'absolute', top: dr * tamano, left: dc * tamano, width: tamano, height: tamano, padding: 1 }}>
              <BloqueVisual color={pieza.color} sinBorde />
            </View>
          ))}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

// ─── Fantasma flotante: la pieza que sigue al dedo mientras se arrastra ───────

function PiezaFantasma({ pieza, tamano, x, y }: {
  pieza: PiezaBloque | null;
  tamano: number;
  x: ReturnType<typeof useSharedValue<number>>;
  y: ReturnType<typeof useSharedValue<number>>;
}) {
  const estiloAnimado = useAnimatedStyle(() => ({
    position: 'absolute',
    left: x.value,
    top: y.value,
  }));
  if (!pieza || tamano === 0) return null;
  const { filas, columnas } = dimensionesForma(pieza.forma);
  return (
    <Animated.View style={[estiloAnimado, { width: columnas * tamano, height: filas * tamano }]} pointerEvents="none">
      {pieza.forma.map(([dr, dc], i) => (
        <View key={i} style={{ position: 'absolute', top: dr * tamano, left: dc * tamano, width: tamano, height: tamano, padding: 1.5 }}>
          <BloqueVisual color={pieza.color} />
        </View>
      ))}
    </Animated.View>
  );
}

export default function BloquesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showTutorial, dismissTutorial, reopenTutorial } = useTutorial('bloques');
  const { reproducir } = useGameSounds();
  const { sonidoActivado, toggleSonido } = useSonidoJuegos();

  const [fase, setFase] = useState<Fase>('inicio');
  const [tablero, setTablero] = useState<Celda[][]>(() => tableroVacio());
  const [bandeja, setBandeja] = useState<PiezaBloque[]>([]);
  const [celdasLimpiandose, setCeldasLimpiandose] = useState<Set<string>>(new Set());
  const [celdasRompiendose, setCeldasRompiendose] = useState<Set<string>>(new Set());
  const [resolviendo, setResolviendo] = useState(false);
  const [puntaje, setPuntaje] = useState(0);
  const [mejorPuntaje, setMejorPuntaje] = useState<number | null>(null);
  const [esRecordNuevo, setEsRecordNuevo] = useState(false);
  const [racha, setRacha] = useState(0);
  const rachaRef = useRef(0);
  // Espejo síncrono de mejorPuntaje — hace falta para comparar "¿esto es
  // récord?" sin depender de que React ya haya vuelto a renderizar (el
  // estado normal puede quedar desactualizado si se lee justo después de
  // actualizarlo en el mismo tick). esteJuegoRecordRef marca si ESTA
  // partida llegó a superar el récord en algún momento, para no depender
  // de comparar puntajeFinal contra mejorPuntaje al final (que para
  // entonces ya podrían ser iguales, porque se fue actualizando en vivo).
  const mejorPuntajeRef = useRef<number | null>(null);
  const esteJuegoRecordRef = useRef(false);

  const [piezaArrastrandoId, setPiezaArrastrandoId] = useState<number | null>(null);
  const [piezaFantasma, setPiezaFantasma] = useState<PiezaBloque | null>(null);
  const [previewCeldas, setPreviewCeldas] = useState<Set<string>>(new Set());
  const [previewValida, setPreviewValida] = useState(false);
  // Celdas (de la pieza Y de lo que ya estaba puesto) que forman parte de
  // una línea que se completaría si soltás acá — se pintan todas del mismo
  // color, como Block Blast, antes incluso de soltar.
  const [previewLineaCompleta, setPreviewLineaCompleta] = useState<Set<string>>(new Set());
  const fantasmaX = useSharedValue(0);
  const fantasmaY = useSharedValue(0);

  const [tamanoCelda, setTamanoCelda] = useState(0);
  const boardRef = useRef<View>(null);
  const boardPos = useRef({ x: 0, y: 0 });
  // El fantasma se dibuja con `position:absolute` dentro de este contenedor
  // (no de la pantalla entera) — hay que medir dónde arranca en la pantalla
  // real para convertir absX/absY (coordenadas de pantalla completa que da
  // el gesto) a coordenadas locales. Sin esto, la pieza se ve más abajo de
  // donde realmente termina cayendo (el desfasaje del status bar/header).
  const containerRef = useRef<View>(null);
  const containerPosX = useSharedValue(0);
  const containerPosY = useSharedValue(0);
  const ultimaAnclaRef = useRef<{ r: number; c: number } | null>(null);

  const puntajeEscala = useSharedValue(1);
  const estiloPuntaje = useAnimatedStyle(() => ({ transform: [{ scale: puntajeEscala.value }] }));

  useEffect(() => {
    obtenerEstadisticasPuntaje('bloques')
      .then((stats) => {
        setMejorPuntaje(stats.mejorPuntaje);
        mejorPuntajeRef.current = stats.mejorPuntaje;
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (puntaje === 0) return;
    puntajeEscala.value = withSequence(withTiming(1.25, { duration: 110 }), withSpring(1, { damping: 8, stiffness: 180 }));
  }, [puntaje, puntajeEscala]);

  // Actualiza el puntaje y, si hace falta, el mejor puntaje EN EL MISMO
  // instante (no en un efecto aparte) — así "Mejor" se ve actualizado en
  // vivo apenas se supera, no recién cuando termina la partida.
  const actualizarPuntaje = useCallback((nuevoPuntaje: number) => {
    setPuntaje(nuevoPuntaje);
    if (mejorPuntajeRef.current == null || nuevoPuntaje > mejorPuntajeRef.current) {
      mejorPuntajeRef.current = nuevoPuntaje;
      setMejorPuntaje(nuevoPuntaje);
      esteJuegoRecordRef.current = true;
    }
  }, []);

  const empezar = useCallback(() => {
    const vacio = tableroVacio();
    setTablero(vacio);
    setBandeja(generarBandeja(vacio));
    setPuntaje(0);
    setEsRecordNuevo(false);
    esteJuegoRecordRef.current = false;
    setRacha(0);
    rachaRef.current = 0;
    setFase('jugando');
  }, []);

  const finalizarPartida = useCallback((puntajeFinal: number) => {
    setFase('fin');
    // Si en algún momento de esta partida se superó el récord, esteJuegoRecordRef
    // ya quedó en true (lo pone actualizarPuntaje) — no hay que volver a comparar
    // acá contra mejorPuntaje, que para este punto ya podría ser igual a
    // puntajeFinal (por la actualización en vivo) y dar un falso "no es récord".
    const esRecord = esteJuegoRecordRef.current;
    setEsRecordNuevo(esRecord);
    if (esRecord) {
      setMejorPuntaje(puntajeFinal);
      reproducir('puntaje_alto');
    }
    void registrarPartida('bloques', null, puntajeFinal);
  }, [reproducir]);

  const onLayoutTablero = useCallback((e: LayoutChangeEvent) => {
    const ancho = e.nativeEvent.layout.width;
    setTamanoCelda((ancho - PADDING_TABLERO * 2) / TAM);
    boardRef.current?.measureInWindow((x, y) => { boardPos.current = { x, y }; });
  }, []);

  // Misma cuenta que usa el fantasma para dibujarse (ver onMoverArrastre) —
  // antes usaban fórmulas distintas ("centrado" acá vs. "esquina" en el
  // fantasma) y para piezas de ancho/alto par el ancla quedaba corrida una
  // celda entera respecto a donde se veía la pieza. Con Math.round en vez de
  // Math.floor además queda más tolerante: no hace falta soltar pixel-perfect,
  // alcanza con estar más cerca de una celda que de la de al lado.
  const calcularAncla = useCallback((pieza: PiezaBloque, absX: number, absY: number): { r: number; c: number } | null => {
    if (tamanoCelda === 0) return null;
    const { filas, columnas } = dimensionesForma(pieza.forma);
    const esquinaXPantalla = absX - (columnas * tamanoCelda) / 2;
    const esquinaYPantalla = absY - LEVANTAR_AL_ARRASTRAR - (filas * tamanoCelda) / 2;
    const xTablero = esquinaXPantalla - boardPos.current.x - PADDING_TABLERO;
    const yTablero = esquinaYPantalla - boardPos.current.y - PADDING_TABLERO;
    const anclaC = Math.round(xTablero / tamanoCelda);
    const anclaR = Math.round(yTablero / tamanoCelda);
    return { r: anclaR, c: anclaC };
  }, [tamanoCelda]);

  const onComenzarArrastre = useCallback((pieza: PiezaBloque) => {
    setPiezaArrastrandoId(pieza.id);
    setPiezaFantasma(pieza);
  }, []);

  // La posición visual del fantasma ya se calcula en el hilo de UI (ver
  // PiezaArrastrable) — acá solo queda actualizar qué celdas se
  // previsualizan, y con un límite de frecuencia: recalcular el tablero de
  // previsualización en cada cuadro del arrastre (hasta 60 veces por
  // segundo) era lo que trababa el juego. Cada ~70ms alcanza para que se
  // sienta instantáneo sin recalcular de más.
  const ultimaPreviewMsRef = useRef(0);

  const onMoverArrastre = useCallback((pieza: PiezaBloque, absX: number, absY: number) => {
    if (tamanoCelda === 0) return;
    const ahora = Date.now();
    if (ahora - ultimaPreviewMsRef.current < 70) return;
    ultimaPreviewMsRef.current = ahora;

    const anclaIdeal = calcularAncla(pieza, absX, absY);
    if (!anclaIdeal) {
      ultimaAnclaRef.current = null;
      setPreviewCeldas(new Set());
      setPreviewLineaCompleta(new Set());
      return;
    }
    // Si el punto exacto no entra, se muestra (y después se suelta) en la celda
    // vecina más cercana que sí entra — la previsualización tiene que
    // coincidir con lo que realmente va a pasar al soltar.
    const anclaResuelta = buscarAnclaCercana(tablero, pieza.forma, anclaIdeal.r, anclaIdeal.c);
    ultimaAnclaRef.current = anclaResuelta ?? anclaIdeal;
    setPreviewValida(anclaResuelta != null);
    setPreviewCeldas(celdasDePieza(pieza.forma, (anclaResuelta ?? anclaIdeal).r, (anclaResuelta ?? anclaIdeal).c));

    if (anclaResuelta) {
      const tableroHipotetico = colocarPieza(tablero, pieza.forma, anclaResuelta.r, anclaResuelta.c, pieza.color);
      const { filas, columnas } = encontrarLineasCompletas(tableroHipotetico);
      setPreviewLineaCompleta(filas.length + columnas.length > 0 ? celdasDeLineas(filas, columnas) : new Set());
    } else {
      setPreviewLineaCompleta(new Set());
    }
  }, [tamanoCelda, tablero, calcularAncla]);

  const onSoltarArrastre = useCallback((pieza: PiezaBloque, absX: number, absY: number) => {
    setPiezaArrastrandoId(null);
    setPiezaFantasma(null);
    setPreviewCeldas(new Set());
    setPreviewLineaCompleta(new Set());
    ultimaAnclaRef.current = null;

    // Se recalcula fresco con la posición real de soltada (no con la última
    // previsualización, que puede tener hasta ~70ms de atraso por el límite
    // de frecuencia de onMoverArrastre) — así el punto donde cae la pieza
    // siempre corresponde exactamente a dónde se soltó el dedo.
    const anclaIdeal = calcularAncla(pieza, absX, absY);
    const ancla = anclaIdeal && buscarAnclaCercana(tablero, pieza.forma, anclaIdeal.r, anclaIdeal.c);
    if (fase !== 'jugando' || resolviendo || !ancla || !puedeColocarse(tablero, pieza.forma, ancla.r, ancla.c)) {
      return;
    }

    const tableroConPieza = colocarPieza(tablero, pieza.forma, ancla.r, ancla.c, pieza.color);
    reproducir('colocar');
    // 1 punto por celda colocada (igual que el juego real) — se suma siempre, limpie línea o no.
    const puntajeConColocacion = puntaje + pieza.forma.length;

    const bandejaRestante = bandeja.filter((p) => p.id !== pieza.id);
    setTablero(tableroConPieza);
    setBandeja(bandejaRestante);
    actualizarPuntaje(puntajeConColocacion);

    const { filas, columnas } = encontrarLineasCompletas(tableroConPieza);
    const lineasLimpiadas = filas.length + columnas.length;

    if (lineasLimpiadas === 0) {
      // Colocar sin limpiar corta la racha — el multiplicador vuelve a cero.
      rachaRef.current = 0;
      setRacha(0);
      const nuevaBandeja = bandejaRestante.length > 0 ? bandejaRestante : generarBandeja(tableroConPieza);
      if (bandejaRestante.length === 0) setBandeja(nuevaBandeja);
      if (!hayJugadaPosible(tableroConPieza, nuevaBandeja)) finalizarPartida(puntajeConColocacion);
      return;
    }

    setResolviendo(true);
    reproducir('linea_completa');
    const celdasUnicas = celdasDeLineas(filas, columnas);
    setCeldasLimpiandose(celdasUnicas);

    const nuevaRacha = rachaRef.current + 1;
    const multiplicador = Math.min(nuevaRacha, RACHA_MULTIPLICADOR_MAX);
    rachaRef.current = nuevaRacha;
    setRacha(nuevaRacha);

    // Flash parejo (blanco/dorado, como Block Blast) un instante, y recién
    // ahí se empieza a romper de a poco en vez de desaparecer todo junto.
    (async () => {
      await esperar(140);
      setCeldasLimpiandose(new Set());

      const celdasOrdenadas = [...celdasUnicas].sort();
      await limpiarEnOleadas(celdasOrdenadas, setCeldasRompiendose);

      const tableroLimpio = limpiarLineas(tableroConPieza, filas, columnas);
      const tableroQuedaVacio = tableroLimpio.every((fila) => fila.every((v) => v === null));
      // 10 puntos por celda limpiada (única — la intersección fila×columna no se cuenta dos veces)
      // + bono si se limpian varias líneas de un solo movimiento, todo multiplicado por la racha.
      const puntosPorCeldas = celdasUnicas.size * 10;
      const bono = bonoMultilinea(lineasLimpiadas, tableroQuedaVacio);
      const puntosLimpieza = (puntosPorCeldas + bono) * multiplicador;
      const puntosFinal = puntajeConColocacion + puntosLimpieza;
      const nuevaBandeja = bandejaRestante.length > 0 ? bandejaRestante : generarBandeja(tableroLimpio);

      setTablero(tableroLimpio);
      setCeldasRompiendose(new Set());
      setBandeja(nuevaBandeja);
      actualizarPuntaje(puntosFinal);
      setResolviendo(false);

      if (!hayJugadaPosible(tableroLimpio, nuevaBandeja)) finalizarPartida(puntosFinal);
    })();
  }, [fase, resolviendo, tablero, bandeja, puntaje, finalizarPartida, reproducir, calcularAncla, actualizarPuntaje]);

  return (
    <View
      ref={containerRef}
      style={styles.container}
      onLayout={() => containerRef.current?.measureInWindow((x, y) => { containerPosX.value = x; containerPosY.value = y; })}
    >
      <AppHeader title="Bloques ElderTech" showBack />

      <View style={[styles.content, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.scoreboard}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Puntos</Text>
            <Animated.Text style={[styles.scoreValue, estiloPuntaje]}>{puntaje}</Animated.Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreItem}>
            <Text style={[styles.scoreLabel, { color: '#FFD54F' }]}>Mejor</Text>
            <Text style={[styles.scoreValue, { color: '#FFD54F' }]}>{mejorPuntaje ?? '—'}</Text>
          </View>
          {racha > 1 && (
            <>
              <View style={styles.scoreDivider} />
              <View style={styles.scoreItem}>
                <Text style={[styles.scoreLabel, { color: '#FF8A65' }]}>Racha</Text>
                <Text style={[styles.scoreValue, { color: '#FF8A65' }]}>×{Math.min(racha, RACHA_MULTIPLICADOR_MAX)}</Text>
              </View>
            </>
          )}
        </View>

        <View ref={boardRef} style={styles.tableroWrap} onLayout={onLayoutTablero}>
          <LinearGradient colors={['#0D1024', '#181B3A', '#232752']} style={styles.tableroFondo}>
            {tablero.map((fila, r) => (
              <View key={r} style={styles.filaTablero}>
                {fila.map((celda, c) => {
                  const clave = `${r},${c}`;
                  const enLineaPrevia = previewLineaCompleta.has(clave);
                  const resaltada = celdasLimpiandose.has(clave) || (enLineaPrevia && celda !== null);
                  const rompiendo = celdasRompiendose.has(clave);
                  const previsualizada = previewCeldas.has(clave);
                  return (
                    <View key={c} style={styles.celda}>
                      <BloqueCelda
                        color={celda}
                        resaltada={resaltada}
                        rompiendo={rompiendo}
                        previsualizada={previsualizada}
                        previsualizadaInvalida={!previewValida}
                        previsualizadaLinea={enLineaPrevia}
                      />
                    </View>
                  );
                })}
              </View>
            ))}
          </LinearGradient>
        </View>

        {fase === 'jugando' && (
          <View style={styles.bandeja}>
            {bandeja.map((pieza) => (
              <View key={pieza.id} style={styles.piezaBandejaSlot}>
                <PiezaArrastrable
                  pieza={pieza}
                  tamano={26}
                  tamanoCelda={tamanoCelda}
                  oculta={pieza.id === piezaArrastrandoId}
                  fantasmaX={fantasmaX}
                  fantasmaY={fantasmaY}
                  containerPosX={containerPosX}
                  containerPosY={containerPosY}
                  onComenzar={onComenzarArrastre}
                  onMover={onMoverArrastre}
                  onSoltar={onSoltarArrastre}
                />
              </View>
            ))}
          </View>
        )}

        {fase !== 'jugando' && (
          <TouchableOpacity style={styles.startBtnWrap} onPress={empezar} activeOpacity={0.85}>
            <LinearGradient colors={['#64B5F6', '#1565C0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.startBtn}>
              <Ionicons name="play" size={22} color={Colors.white} />
              <Text style={styles.startBtnText}>{fase === 'inicio' ? 'Empezar' : 'Jugar de nuevo'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.filaBotones}>
          <TouchableOpacity style={styles.helpBtn} onPress={reopenTutorial} accessibilityLabel="¿Cómo se juega?">
            <Ionicons name="help-circle-outline" size={20} color={Colors.primary} />
            <Text style={styles.helpBtnText}>¿Cómo se juega?</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.helpBtn}
            onPress={toggleSonido}
            accessibilityLabel={sonidoActivado ? 'Silenciar sonido' : 'Activar sonido'}
          >
            <Ionicons name={sonidoActivado ? 'volume-high-outline' : 'volume-mute-outline'} size={20} color={Colors.primary} />
            <Text style={styles.helpBtnText}>{sonidoActivado ? 'Sonido activado' : 'Sonido apagado'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <PiezaFantasma pieza={piezaFantasma} tamano={tamanoCelda} x={fantasmaX} y={fantasmaY} />

      <Modal visible={showTutorial} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <LinearGradient colors={['#64B5F6', '#1565C0']} style={styles.modalIconWrap}>
              <Ionicons name="apps" size={36} color={Colors.white} />
            </LinearGradient>
            <Text style={styles.modalTitle}>¿Cómo se juega?</Text>
            <View style={styles.speakRowWrapper}>
              <SpeakButton
                texto="Arrastrá con el dedo una de las tres piezas de abajo hasta el lugar del tablero donde la querés poner, y soltala ahí. Cuando completás una fila o una columna entera, se limpia y sumás puntos. El juego termina cuando ninguna pieza entra en el tablero."
                variante="escuchar"
              />
            </View>
            <Text style={styles.modalSub}>
              Arrastrá con el dedo una de las tres piezas de abajo hasta el lugar del tablero donde la querés poner, y soltala ahí.{'\n\n'}
              Cuando completás una fila o una columna entera, se limpia y sumás puntos.{'\n\n'}
              El juego termina cuando ninguna pieza entra en el tablero.
            </Text>
            <TouchableOpacity style={styles.modalBtnPrimary} onPress={dismissTutorial}>
              <Text style={styles.modalBtnPrimaryText}>¡Entendido, a jugar!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={fase === 'fin'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <LinearGradient colors={esRecordNuevo ? ['#FFD54F', '#F57F17'] : ['#64B5F6', '#1565C0']} style={styles.modalIconWrap}>
              <Ionicons name={esRecordNuevo ? 'trophy' : 'checkmark-circle'} size={40} color={Colors.white} />
            </LinearGradient>
            <Text style={styles.modalTitle}>{esRecordNuevo ? '¡Nuevo récord!' : '¡Fin de la partida!'}</Text>
            <Text style={styles.modalSub}>
              Conseguiste <Text style={{ fontWeight: 'bold', color: Colors.primary }}>{puntaje}</Text> puntos.{'\n'}
              Mejor puntaje: <Text style={{ fontWeight: 'bold', color: Colors.success }}>{mejorPuntaje}</Text>
            </Text>
            <TouchableOpacity style={styles.modalBtnPrimary} onPress={empezar}>
              <Text style={styles.modalBtnPrimaryText}>Jugar de nuevo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => router.back()}>
              <Text style={styles.modalBtnSecondaryText}>Volver a Juegos</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.md },

  scoreboard: {
    flexDirection: 'row',
    backgroundColor: '#181B3A',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    width: '100%',
    justifyContent: 'space-between',
  },
  scoreItem: { alignItems: 'center', flex: 1 },
  scoreLabel: { fontSize: FontSizes.xs, color: 'rgba(255,255,255,0.75)' },
  scoreValue: { fontSize: FontSizes.xl, fontWeight: 'bold', color: '#FFFFFF' },
  scoreDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

  tableroWrap: {
    width: '100%', aspectRatio: 1, borderRadius: Radius.lg, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  tableroFondo: { flex: 1, padding: PADDING_TABLERO },
  filaTablero: { flex: 1, flexDirection: 'row' },
  celda: { flex: 1, padding: 1.5 },
  celdaVacia: {
    flex: 1, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  celdaPreviaValida: { backgroundColor: 'rgba(102,187,106,0.45)', borderColor: 'rgba(102,187,106,0.9)' },
  celdaPreviaInvalida: { backgroundColor: 'rgba(239,83,80,0.45)', borderColor: 'rgba(239,83,80,0.9)' },
  celdaPreviaLinea: { backgroundColor: 'rgba(255,213,79,0.55)', borderColor: 'rgba(255,213,79,0.95)' },

  // Cuadrados de verdad (radio mínimo, no redondeado) y borde sólido en vez
  // de punteado — el borde "dashed" con esquinas redondeadas es pesado de
  // dibujar en Android y era la causa más probable de que el juego se
  // sintiera trabado al arrastrar.
  bloqueBorde: {
    flex: 1, borderRadius: 3, padding: 1.5, overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
  },
  // Piezas de la bandeja: sin borde (pedido explícito) — solo el color de
  // relleno, más fácil de leer de un vistazo y más liviano todavía.
  bloqueSinBorde: { borderWidth: 0, padding: 0 },
  bloqueRelleno: { flex: 1, borderRadius: 2 },
  bloqueBrilloSuave: {
    position: 'absolute', top: '8%', left: '12%', width: '48%', height: '30%',
    borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.25)',
  },

  bandeja: {
    flexDirection: 'row', gap: Spacing.md, justifyContent: 'center',
    backgroundColor: '#181B3A', borderRadius: Radius.lg, padding: Spacing.md, width: '100%', minHeight: 116,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },
  // minWidth/minHeight generosos — junto con el hitSlop del gesto, hace que
  // agarrar una pieza chica (o con celdas concentradas en una esquina) no
  // dependa de tocar el pixel exacto.
  piezaBandejaSlot: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 100 },
  piezaBandeja: { alignItems: 'center', justifyContent: 'center', minWidth: 64, minHeight: 64 },

  startBtnWrap: { width: '100%', borderRadius: Radius.sm, overflow: 'hidden' },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl,
  },
  startBtnText: { color: Colors.white, fontSize: FontSizes.xl, fontWeight: 'bold' },

  filaBotones: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  helpBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 2, borderColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, backgroundColor: Colors.white,
  },
  helpBtnText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: '#00000066', alignItems: 'center', justifyContent: 'center' },
  modalBox: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.xxl, width: '82%', alignItems: 'center' },
  modalIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  modalTitle: { fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: Spacing.sm },
  speakRowWrapper: { flexDirection: 'row', justifyContent: 'center', width: '100%', marginBottom: Spacing.md },
  modalSub: { fontSize: FontSizes.lg, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 26 },
  modalBtnPrimary: {
    backgroundColor: Colors.primary, borderRadius: Radius.sm,
    paddingVertical: Spacing.md, width: '100%', alignItems: 'center', marginBottom: Spacing.sm,
  },
  modalBtnPrimaryText: { color: Colors.white, fontSize: FontSizes.xl, fontWeight: 'bold' },
  modalBtnSecondary: {
    borderWidth: 2, borderColor: Colors.primary, borderRadius: Radius.sm,
    paddingVertical: Spacing.md, width: '100%', alignItems: 'center',
  },
  modalBtnSecondaryText: { color: Colors.primary, fontSize: FontSizes.xl, fontWeight: 'bold' },
});
