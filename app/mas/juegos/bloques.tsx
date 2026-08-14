// Bloques ElderTech — puzzle de bloques original (temática propia, sin
// relación con Block Blast más allá de la mecánica general de "completar
// líneas"). Interacción: tocar una pieza de la bandeja y después tocar la
// celda del tablero donde va — nada de arrastrar.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, LayoutAnimation } from 'react-native';
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

const COLORES = ['#D81B60', '#2E7D32', '#EF6C00', '#1565C0', '#C62828', '#6A1B9A'];

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
  const color = Math.floor(Math.random() * COLORES.length);
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

/** Dimensiones de la miniatura de una pieza, para dibujarla en la bandeja. */
function dimensionesForma(forma: Forma): { filas: number; columnas: number } {
  let maxR = 0, maxC = 0;
  for (const [dr, dc] of forma) { maxR = Math.max(maxR, dr); maxC = Math.max(maxC, dc); }
  return { filas: maxR + 1, columnas: maxC + 1 };
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
  const [puntaje, setPuntaje] = useState(0);
  const [mejorPuntaje, setMejorPuntaje] = useState<number | null>(null);
  const [esRecordNuevo, setEsRecordNuevo] = useState(false);

  useEffect(() => {
    obtenerEstadisticasPuntaje('bloques')
      .then((stats) => setMejorPuntaje(stats.mejorPuntaje))
      .catch(() => {});
  }, []);

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
    if (fase !== 'jugando' || !piezaSeleccionada) return;

    if (!puedeColocarse(tablero, piezaSeleccionada.forma, r, c)) {
      setCeldaInvalida({ r, c });
      setTimeout(() => setCeldaInvalida(null), 260);
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    let nuevoTablero = colocarPieza(tablero, piezaSeleccionada.forma, r, c, piezaSeleccionada.color);
    reproducir('colocar');
    let puntosPartida = puntaje + piezaSeleccionada.forma.length * 10;

    const { filas, columnas } = encontrarLineasCompletas(nuevoTablero);
    const lineasLimpiadas = filas.length + columnas.length;
    if (lineasLimpiadas > 0) {
      nuevoTablero = limpiarLineas(nuevoTablero, filas, columnas);
      puntosPartida += lineasLimpiadas * 80 + (lineasLimpiadas > 1 ? lineasLimpiadas * 40 : 0);
      reproducir('linea_completa');
    }

    const bandejaRestante = bandeja.filter((p) => p.id !== piezaSeleccionada.id);
    const nuevaBandeja = bandejaRestante.length > 0 ? bandejaRestante : generarBandeja(nuevoTablero);

    setTablero(nuevoTablero);
    setBandeja(nuevaBandeja);
    setPiezaSeleccionadaId(null);
    setPuntaje(puntosPartida);

    if (!hayJugadaPosible(nuevoTablero, nuevaBandeja)) {
      finalizarPartida(puntosPartida);
    }
  }, [fase, piezaSeleccionada, tablero, bandeja, puntaje, finalizarPartida, reproducir]);

  return (
    <View style={styles.container}>
      <AppHeader title="Bloques ElderTech" showBack />

      <View style={[styles.content, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.scoreboard}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Puntos</Text>
            <Text style={styles.scoreValue}>{puntaje}</Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Mejor</Text>
            <Text style={[styles.scoreValue, { color: Colors.success }]}>{mejorPuntaje ?? '—'}</Text>
          </View>
        </View>

        <View style={styles.tableroWrap}>
          <View style={styles.tablero}>
            {tablero.map((fila, r) => (
              <View key={r} style={styles.filaTablero}>
                {fila.map((celda, c) => {
                  const invalida = celdaInvalida?.r === r && celdaInvalida?.c === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={styles.celda}
                      onPress={() => onTapCeldaTablero(r, c)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={celda !== null ? 'Celda ocupada' : 'Celda vacía'}
                    >
                      <View
                        style={[
                          styles.celdaInterior,
                          celda !== null && { backgroundColor: COLORES[celda] },
                          invalida && styles.celdaInvalida,
                        ]}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
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
                  <View style={{ width: columnas * 16, height: filas * 16 }}>
                    {pieza.forma.map(([dr, dc], i) => (
                      <View
                        key={i}
                        style={[
                          styles.miniCelda,
                          { backgroundColor: COLORES[pieza.color], top: dr * 16, left: dc * 16 },
                        ]}
                      />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {fase !== 'jugando' && (
          <TouchableOpacity style={styles.startBtn} onPress={empezar} activeOpacity={0.85}>
            <Ionicons name="play" size={22} color={Colors.white} />
            <Text style={styles.startBtnText}>{fase === 'inicio' ? 'Empezar' : 'Jugar de nuevo'}</Text>
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
            <View style={styles.modalIconWrap}>
              <Ionicons name="apps" size={36} color={Colors.white} />
            </View>
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
            <View style={[styles.modalIconWrap, { backgroundColor: Colors.success }]}>
              <Ionicons name={esRecordNuevo ? 'trophy' : 'checkmark-circle'} size={40} color={Colors.white} />
            </View>
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
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    width: '100%',
    justifyContent: 'space-between',
  },
  scoreItem: { alignItems: 'center', flex: 1 },
  scoreLabel: { fontSize: FontSizes.xs, color: Colors.textSecondary },
  scoreValue: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.textPrimary },
  scoreDivider: { width: 1, backgroundColor: Colors.border },

  tableroWrap: { width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  tablero: {
    width: '100%', height: '100%',
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: 4,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  filaTablero: { flex: 1, flexDirection: 'row' },
  celda: { flex: 1, padding: 1.5 },
  celdaInterior: { flex: 1, borderRadius: 4, backgroundColor: '#EDEDED' },
  celdaInvalida: { backgroundColor: '#FFCDD2' },

  bandeja: {
    flexDirection: 'row', gap: Spacing.md, justifyContent: 'center',
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, width: '100%',
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1,
  },
  piezaBandeja: {
    flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 76,
    borderRadius: Radius.md, borderWidth: 2, borderColor: 'transparent',
  },
  piezaBandejaSeleccionada: { borderColor: Colors.primary, backgroundColor: '#E8F5E9' },
  miniCelda: { position: 'absolute', width: 14, height: 14, borderRadius: 3, margin: 1 },

  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, borderRadius: Radius.sm,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl, minWidth: 220, justifyContent: 'center',
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
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#1565C0',
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
