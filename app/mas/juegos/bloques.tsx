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

// Colores vívidos y bien diferenciables — misma familia que Jardín ElderTech para que las dos secciones se sientan del mismo mundo.
const CLARO = ['#FF5252', '#FFD54F', '#66BB6A', '#42A5F5', '#BA68C8', '#FF6FA5'];
const OSCURO = ['#B71C1C', '#F57F17', '#1B5E20', '#0D47A1', '#4A148C', '#C2185B'];

const FORMAS: Forma[] = [
  [[0, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  [[0, 0], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 1]],
  [[0, 1], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 1]],
  [[0, 1], [1, 0], [1, 1], [1, 2]],
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

function dimensionesForma(forma: Forma): { filas: number; columnas: number } {
  let maxR = 0, maxC = 0;
  for (const [dr, dc] of forma) { maxR = Math.max(maxR, dr); maxC = Math.max(maxC, dc); }
  return { filas: maxR + 1, columnas: maxC + 1 };
}

function celdasDePieza(forma: Forma, anclaR: number, anclaC: number): Set<string> {
  return new Set(forma.map(([dr, dc]) => `${anclaR + dr},${anclaC + dc}`));
}

// ─── Visual de un bloque "gema": gradiente + faceta de brillo + sombra ────────

function BloqueVisual({ color, atenuado }: { color: number; atenuado?: boolean }) {
  return (
    <LinearGradient
      colors={[CLARO[color], OSCURO[color]]}
      start={{ x: 0.15, y: 0.1 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.bloqueLleno, atenuado && { opacity: 0.55 }]}
    >
      <View style={styles.bloqueFaceta} />
      <View style={styles.bloqueSombraInferior} />
    </LinearGradient>
  );
}

// ─── Celda animada del tablero: pop-in al aparecer, pop-out al limpiarse ──────

function BloqueCelda({ color, resaltada, previsualizada, previsualizadaInvalida }: {
  color: Celda; resaltada: boolean; previsualizada: boolean; previsualizadaInvalida: boolean;
}) {
  const escala = useSharedValue(color !== null ? 1 : 0);
  const colorAnteriorRef = useRef(color);

  useEffect(() => {
    if (colorAnteriorRef.current === null && color !== null) {
      escala.value = 0;
      escala.value = withSpring(1, { damping: 11, stiffness: 220 });
    }
    colorAnteriorRef.current = color;
  }, [color, escala]);

  useEffect(() => {
    if (resaltada) {
      escala.value = withSequence(withTiming(1.25, { duration: 110 }), withTiming(0, { duration: 170 }));
    }
  }, [resaltada, escala]);

  const estiloAnimado = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));

  if (color === null) {
    return (
      <View style={[styles.celdaVacia, previsualizada && (previsualizadaInvalida ? styles.celdaPreviaInvalida : styles.celdaPreviaValida)]} />
    );
  }

  return (
    <Animated.View style={[{ flex: 1 }, estiloAnimado]}>
      <BloqueVisual color={color} />
    </Animated.View>
  );
}

// ─── Pieza de la bandeja: se arrastra con el dedo ─────────────────────────────

interface PiezaArrastrableProps {
  pieza: PiezaBloque;
  tamano: number;
  oculta: boolean;
  onComenzar: (pieza: PiezaBloque) => void;
  onMover: (pieza: PiezaBloque, absX: number, absY: number) => void;
  onSoltar: (pieza: PiezaBloque, absX: number, absY: number) => void;
}

function PiezaArrastrable({ pieza, tamano, oculta, onComenzar, onMover, onSoltar }: PiezaArrastrableProps) {
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const escala = useSharedValue(1);
  const { filas, columnas } = dimensionesForma(pieza.forma);

  const gesto = Gesture.Pan()
    .onStart(() => {
      escala.value = withTiming(1.12, { duration: 120 });
      runOnJS(onComenzar)(pieza);
    })
    .onUpdate((e) => {
      dragX.value = e.translationX;
      dragY.value = e.translationY;
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
            <View key={i} style={{ position: 'absolute', top: dr * tamano, left: dc * tamano, width: tamano, height: tamano, padding: 1.5 }}>
              <BloqueVisual color={pieza.color} />
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
  const [resolviendo, setResolviendo] = useState(false);
  const [puntaje, setPuntaje] = useState(0);
  const [mejorPuntaje, setMejorPuntaje] = useState<number | null>(null);
  const [esRecordNuevo, setEsRecordNuevo] = useState(false);

  const [piezaArrastrandoId, setPiezaArrastrandoId] = useState<number | null>(null);
  const [piezaFantasma, setPiezaFantasma] = useState<PiezaBloque | null>(null);
  const [previewCeldas, setPreviewCeldas] = useState<Set<string>>(new Set());
  const [previewValida, setPreviewValida] = useState(false);
  const fantasmaX = useSharedValue(0);
  const fantasmaY = useSharedValue(0);

  const [tamanoCelda, setTamanoCelda] = useState(0);
  const boardRef = useRef<View>(null);
  const boardPos = useRef({ x: 0, y: 0 });
  const ultimaAnclaRef = useRef<{ r: number; c: number } | null>(null);

  const puntajeEscala = useSharedValue(1);
  const estiloPuntaje = useAnimatedStyle(() => ({ transform: [{ scale: puntajeEscala.value }] }));

  useEffect(() => {
    obtenerEstadisticasPuntaje('bloques')
      .then((stats) => setMejorPuntaje(stats.mejorPuntaje))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (puntaje === 0) return;
    puntajeEscala.value = withSequence(withTiming(1.25, { duration: 110 }), withSpring(1, { damping: 8, stiffness: 180 }));
  }, [puntaje, puntajeEscala]);

  const empezar = useCallback(() => {
    const vacio = tableroVacio();
    setTablero(vacio);
    setBandeja(generarBandeja(vacio));
    setPuntaje(0);
    setEsRecordNuevo(false);
    setFase('jugando');
  }, []);

  const finalizarPartida = useCallback((puntajeFinal: number) => {
    setFase('fin');
    const esRecord = mejorPuntaje == null || puntajeFinal > mejorPuntaje;
    setEsRecordNuevo(esRecord);
    if (esRecord) {
      setMejorPuntaje(puntajeFinal);
      reproducir('puntaje_alto');
    }
    void registrarPartida('bloques', null, puntajeFinal);
  }, [mejorPuntaje, reproducir]);

  const onLayoutTablero = useCallback((e: LayoutChangeEvent) => {
    const ancho = e.nativeEvent.layout.width;
    setTamanoCelda((ancho - PADDING_TABLERO * 2) / TAM);
    boardRef.current?.measureInWindow((x, y) => { boardPos.current = { x, y }; });
  }, []);

  const calcularAncla = useCallback((pieza: PiezaBloque, absX: number, absY: number): { r: number; c: number } | null => {
    if (tamanoCelda === 0) return null;
    const { filas, columnas } = dimensionesForma(pieza.forma);
    const xTablero = absX - boardPos.current.x - PADDING_TABLERO;
    const yTablero = absY - boardPos.current.y - PADDING_TABLERO - LEVANTAR_AL_ARRASTRAR;
    const colCentro = Math.floor(xTablero / tamanoCelda);
    const filaCentro = Math.floor(yTablero / tamanoCelda);
    const anclaR = filaCentro - Math.floor((filas - 1) / 2);
    const anclaC = colCentro - Math.floor((columnas - 1) / 2);
    return { r: anclaR, c: anclaC };
  }, [tamanoCelda]);

  const onComenzarArrastre = useCallback((pieza: PiezaBloque) => {
    setPiezaArrastrandoId(pieza.id);
    setPiezaFantasma(pieza);
  }, []);

  const onMoverArrastre = useCallback((pieza: PiezaBloque, absX: number, absY: number) => {
    if (tamanoCelda === 0) return;
    const { filas, columnas } = dimensionesForma(pieza.forma);
    fantasmaX.value = absX - (columnas * tamanoCelda) / 2;
    fantasmaY.value = absY - LEVANTAR_AL_ARRASTRAR - (filas * tamanoCelda) / 2;

    const ancla = calcularAncla(pieza, absX, absY);
    ultimaAnclaRef.current = ancla;
    if (!ancla) {
      setPreviewCeldas(new Set());
      return;
    }
    const valida = puedeColocarse(tablero, pieza.forma, ancla.r, ancla.c);
    setPreviewValida(valida);
    setPreviewCeldas(celdasDePieza(pieza.forma, ancla.r, ancla.c));
  }, [tamanoCelda, tablero, calcularAncla, fantasmaX, fantasmaY]);

  const onSoltarArrastre = useCallback((pieza: PiezaBloque) => {
    setPiezaArrastrandoId(null);
    setPiezaFantasma(null);
    setPreviewCeldas(new Set());

    const ancla = ultimaAnclaRef.current;
    ultimaAnclaRef.current = null;
    if (fase !== 'jugando' || resolviendo || !ancla || !puedeColocarse(tablero, pieza.forma, ancla.r, ancla.c)) {
      return;
    }

    const tableroConPieza = colocarPieza(tablero, pieza.forma, ancla.r, ancla.c, pieza.color);
    reproducir('colocar');
    const puntosBase = puntaje + pieza.forma.length * 10;

    const bandejaRestante = bandeja.filter((p) => p.id !== pieza.id);
    setTablero(tableroConPieza);
    setBandeja(bandejaRestante);
    setPuntaje(puntosBase);

    const { filas, columnas } = encontrarLineasCompletas(tableroConPieza);
    const lineasLimpiadas = filas.length + columnas.length;

    if (lineasLimpiadas === 0) {
      const nuevaBandeja = bandejaRestante.length > 0 ? bandejaRestante : generarBandeja(tableroConPieza);
      if (bandejaRestante.length === 0) setBandeja(nuevaBandeja);
      if (!hayJugadaPosible(tableroConPieza, nuevaBandeja)) finalizarPartida(puntosBase);
      return;
    }

    setResolviendo(true);
    reproducir('linea_completa');
    setCeldasLimpiandose(celdasDeLineas(filas, columnas));
    setTimeout(() => {
      const tableroLimpio = limpiarLineas(tableroConPieza, filas, columnas);
      const puntosFinal = puntosBase + lineasLimpiadas * 80 + (lineasLimpiadas > 1 ? lineasLimpiadas * 40 : 0);
      const nuevaBandeja = bandejaRestante.length > 0 ? bandejaRestante : generarBandeja(tableroLimpio);

      setTablero(tableroLimpio);
      setCeldasLimpiandose(new Set());
      setBandeja(nuevaBandeja);
      setPuntaje(puntosFinal);
      setResolviendo(false);

      if (!hayJugadaPosible(tableroLimpio, nuevaBandeja)) finalizarPartida(puntosFinal);
    }, 280);
  }, [fase, resolviendo, tablero, bandeja, puntaje, finalizarPartida, reproducir]);

  return (
    <View style={styles.container}>
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
        </View>

        <View ref={boardRef} style={styles.tableroWrap} onLayout={onLayoutTablero}>
          <LinearGradient colors={['#0D1024', '#181B3A', '#232752']} style={styles.tableroFondo}>
            {tablero.map((fila, r) => (
              <View key={r} style={styles.filaTablero}>
                {fila.map((celda, c) => {
                  const clave = `${r},${c}`;
                  const resaltada = celdasLimpiandose.has(clave);
                  const previsualizada = previewCeldas.has(clave);
                  return (
                    <View key={c} style={styles.celda}>
                      <BloqueCelda color={celda} resaltada={resaltada} previsualizada={previsualizada} previsualizadaInvalida={!previewValida} />
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
                  tamano={20}
                  oculta={pieza.id === piezaArrastrandoId}
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
  celda: { flex: 1, padding: 2 },
  celdaVacia: {
    flex: 1, borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  celdaPreviaValida: { backgroundColor: 'rgba(102,187,106,0.45)', borderColor: 'rgba(102,187,106,0.9)' },
  celdaPreviaInvalida: { backgroundColor: 'rgba(239,83,80,0.45)', borderColor: 'rgba(239,83,80,0.9)' },

  bloqueLleno: {
    flex: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(15,8,35,0.55)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.4, shadowRadius: 2, elevation: 3,
  },
  bloqueFaceta: {
    position: 'absolute', width: '60%', height: '60%', top: '4%', left: '20%',
    borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.32)', transform: [{ rotate: '45deg' }],
  },
  bloqueSombraInferior: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '32%', backgroundColor: 'rgba(0,0,0,0.2)',
  },

  bandeja: {
    flexDirection: 'row', gap: Spacing.md, justifyContent: 'center',
    backgroundColor: '#181B3A', borderRadius: Radius.lg, padding: Spacing.md, width: '100%', minHeight: 96,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },
  piezaBandejaSlot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  piezaBandeja: { alignItems: 'center', justifyContent: 'center' },

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
