// Bloques ElderTech — puzzle de bloques original (temática propia, sin
// relación con Block Blast más allá de la mecánica general de "completar
// líneas"). Interacción: tocar una pieza de la bandeja y después tocar la
// celda del tablero donde va — nada de arrastrar.
//
// Capa visual: tablero oscuro con bloques en gradiente + bisel + brillo
// (expo-linear-gradient) y animaciones reales vía react-native-reanimated —
// ambas ya eran dependencias del proyecto, no hace falta build nativo nuevo.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence } from 'react-native-reanimated';
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
type Fase = 'inicio' | 'jugando' | 'fin';
type Celda = number | null;
type Forma = readonly (readonly [number, number])[];

// Misma paleta que Jardín ElderTech, para que las dos secciones de Juegos se sientan del mismo mundo.
const CLARO = ['#FF6FA5', '#81C784', '#FFB74D', '#64B5F6', '#EF5350', '#BA68C8'];
const OSCURO = ['#C2185B', '#1B5E20', '#E65100', '#0D47A1', '#B71C1C', '#4A148C'];

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

// ─── Celda animada del tablero: pop-in al aparecer, pop-out al limpiarse ──────

function BloqueCelda({ color, resaltada }: { color: Celda; resaltada: boolean }) {
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
    return <View style={styles.celdaVacia} />;
  }

  return (
    <Animated.View style={[{ flex: 1 }, estiloAnimado]}>
      <LinearGradient colors={[CLARO[color], OSCURO[color]]} start={{ x: 0.15, y: 0.1 }} end={{ x: 0.9, y: 1 }} style={styles.bloqueLleno}>
        <View style={styles.bloqueBrillo} />
      </LinearGradient>
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
  const [piezaSeleccionadaId, setPiezaSeleccionadaId] = useState<number | null>(null);
  const [celdaInvalida, setCeldaInvalida] = useState<{ r: number; c: number } | null>(null);
  const [celdasLimpiandose, setCeldasLimpiandose] = useState<Set<string>>(new Set());
  const [resolviendo, setResolviendo] = useState(false);
  const [puntaje, setPuntaje] = useState(0);
  const [mejorPuntaje, setMejorPuntaje] = useState<number | null>(null);
  const [esRecordNuevo, setEsRecordNuevo] = useState(false);

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
    setPiezaSeleccionadaId(null);
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

  const piezaSeleccionada = bandeja.find((p) => p.id === piezaSeleccionadaId) ?? null;

  const onTapPiezaBandeja = useCallback((id: number) => {
    setPiezaSeleccionadaId((prev) => (prev === id ? null : id));
  }, []);

  const onTapCeldaTablero = useCallback((r: number, c: number) => {
    if (fase !== 'jugando' || !piezaSeleccionada || resolviendo) return;

    if (!puedeColocarse(tablero, piezaSeleccionada.forma, r, c)) {
      setCeldaInvalida({ r, c });
      setTimeout(() => setCeldaInvalida(null), 260);
      return;
    }

    const tableroConPieza = colocarPieza(tablero, piezaSeleccionada.forma, r, c, piezaSeleccionada.color);
    reproducir('colocar');
    const puntosBase = puntaje + piezaSeleccionada.forma.length * 10;

    const bandejaRestante = bandeja.filter((p) => p.id !== piezaSeleccionada.id);
    setTablero(tableroConPieza);
    setBandeja(bandejaRestante);
    setPiezaSeleccionadaId(null);
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
  }, [fase, piezaSeleccionada, resolviendo, tablero, bandeja, puntaje, finalizarPartida, reproducir]);

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

        <View style={styles.tableroWrap}>
          <LinearGradient colors={['#0D1024', '#181B3A', '#232752']} style={styles.tableroFondo}>
            {tablero.map((fila, r) => (
              <View key={r} style={styles.filaTablero}>
                {fila.map((celda, c) => {
                  const invalida = celdaInvalida?.r === r && celdaInvalida?.c === c;
                  const resaltada = celdasLimpiandose.has(`${r},${c}`);
                  return (
                    <TouchableOpacity
                      key={c}
                      style={styles.celda}
                      onPress={() => onTapCeldaTablero(r, c)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={celda !== null ? 'Celda ocupada' : 'Celda vacía'}
                    >
                      <BloqueCelda color={celda} resaltada={resaltada} />
                      {invalida && <View style={styles.celdaInvalidaOverlay} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </LinearGradient>
        </View>

        {fase === 'jugando' && (
          <View style={styles.bandeja}>
            {bandeja.map((pieza) => {
              const { filas, columnas } = dimensionesForma(pieza.forma);
              const seleccionada = pieza.id === piezaSeleccionadaId;
              return (
                <TouchableOpacity
                  key={pieza.id}
                  style={[styles.piezaBandeja, seleccionada && styles.piezaBandejaSeleccionada]}
                  onPress={() => onTapPiezaBandeja(pieza.id)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={seleccionada ? 'Pieza seleccionada' : 'Elegir esta pieza'}
                >
                  <View style={{ width: columnas * 17, height: filas * 17 }}>
                    {pieza.forma.map(([dr, dc], i) => (
                      <LinearGradient
                        key={i}
                        colors={[CLARO[pieza.color], OSCURO[pieza.color]]}
                        start={{ x: 0.15, y: 0.1 }}
                        end={{ x: 0.9, y: 1 }}
                        style={[styles.miniCelda, { top: dr * 17, left: dc * 17 }]}
                      >
                        <View style={styles.miniCeldaBrillo} />
                      </LinearGradient>
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
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

      <Modal visible={showTutorial} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <LinearGradient colors={['#64B5F6', '#1565C0']} style={styles.modalIconWrap}>
              <Ionicons name="apps" size={36} color={Colors.white} />
            </LinearGradient>
            <Text style={styles.modalTitle}>¿Cómo se juega?</Text>
            <View style={styles.speakRowWrapper}>
              <SpeakButton
                texto="Tocá una de las tres piezas de abajo para elegirla, y después tocá el lugar del tablero donde la querés poner. Cuando completás una fila o una columna entera, se limpia y sumás puntos. El juego termina cuando ninguna pieza entra en el tablero."
                variante="escuchar"
              />
            </View>
            <Text style={styles.modalSub}>
              Tocá una de las tres piezas de abajo para elegirla, y después tocá el lugar del tablero donde la querés poner.{'\n\n'}
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
  tableroFondo: { flex: 1, padding: 5 },
  filaTablero: { flex: 1, flexDirection: 'row' },
  celda: { flex: 1, padding: 2 },
  celdaVacia: {
    flex: 1, borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  celdaInvalidaOverlay: {
    position: 'absolute', top: 2, left: 2, right: 2, bottom: 2,
    borderRadius: 5, backgroundColor: 'rgba(239,83,80,0.55)',
  },

  bloqueLleno: {
    flex: 1, borderRadius: 5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.4, shadowRadius: 2, elevation: 3,
  },
  bloqueBrillo: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '45%',
    backgroundColor: 'rgba(255,255,255,0.28)', borderTopLeftRadius: 5, borderTopRightRadius: 5,
  },

  bandeja: {
    flexDirection: 'row', gap: Spacing.md, justifyContent: 'center',
    backgroundColor: '#181B3A', borderRadius: Radius.lg, padding: Spacing.md, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },
  piezaBandeja: {
    flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 80,
    borderRadius: Radius.md, borderWidth: 2, borderColor: 'transparent',
  },
  piezaBandejaSeleccionada: { borderColor: '#FFD54F', backgroundColor: 'rgba(255,213,79,0.14)' },
  miniCelda: {
    position: 'absolute', width: 15, height: 15, borderRadius: 4, margin: 1, overflow: 'hidden',
  },
  miniCeldaBrillo: { position: 'absolute', top: 0, left: 0, right: 0, height: '45%', backgroundColor: 'rgba(255,255,255,0.3)' },

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
