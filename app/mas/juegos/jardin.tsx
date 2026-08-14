// Jardín ElderTech — match-3 original (temática de jardín/naturaleza, sin
// relación con Candy Crush más allá de la mecánica general de "combinar 3").
// Interacción: tocar una pieza y después tocar una pieza adyacente para
// intercambiarlas — nada de arrastrar, más simple para motricidad reducida.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, LayoutAnimation, Platform, UIManager } from 'react-native';
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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FILAS = 6;
const COLUMNAS = 6;
const MOVIMIENTOS_INICIALES = 20;

type Fase = 'inicio' | 'jugando' | 'fin';
interface Pieza { id: number; tipo: number }
interface Coord { r: number; c: number }

const TIPOS_PIEZA: { icono: keyof typeof Ionicons.glyphMap; color: string; nombre: string }[] = [
  { icono: 'flower', color: '#D81B60', nombre: 'flor' },
  { icono: 'leaf', color: '#2E7D32', nombre: 'hoja' },
  { icono: 'sunny', color: '#EF6C00', nombre: 'sol' },
  { icono: 'water', color: '#1565C0', nombre: 'gota' },
  { icono: 'heart', color: '#C62828', nombre: 'corazón' },
  { icono: 'star', color: '#6A1B9A', nombre: 'estrella' },
];

let siguienteId = 1;
function crearPieza(tipo: number): Pieza {
  return { id: siguienteId++, tipo };
}
function tipoAleatorio(excluidos: number[] = []): number {
  let t: number;
  do { t = Math.floor(Math.random() * TIPOS_PIEZA.length); } while (excluidos.includes(t));
  return t;
}
function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generarTablero(): Pieza[][] {
  const tablero: Pieza[][] = [];
  for (let r = 0; r < FILAS; r++) {
    const fila: Pieza[] = [];
    for (let c = 0; c < COLUMNAS; c++) {
      const excluidos: number[] = [];
      if (c >= 2 && fila[c - 1].tipo === fila[c - 2].tipo) excluidos.push(fila[c - 1].tipo);
      if (r >= 2 && tablero[r - 1][c].tipo === tablero[r - 2][c].tipo) excluidos.push(tablero[r - 1][c].tipo);
      fila.push(crearPieza(tipoAleatorio(excluidos)));
    }
    tablero.push(fila);
  }
  return tablero;
}

function intercambiar(tablero: Pieza[][], a: Coord, b: Coord): Pieza[][] {
  const copia = tablero.map((fila) => fila.slice());
  const tmp = copia[a.r][a.c];
  copia[a.r][a.c] = copia[b.r][b.c];
  copia[b.r][b.c] = tmp;
  return copia;
}

/** Corridas horizontales/verticales de 3+ — devuelve las celdas a limpiar, con los efectos
 * especiales ya aplicados (4 en línea limpia toda la fila/columna, 5+ limpia un área 3×3). */
function encontrarCoincidencias(tablero: Pieza[][]): Set<string> {
  const marcadas = new Set<string>();

  for (let r = 0; r < FILAS; r++) {
    let c = 0;
    while (c < COLUMNAS) {
      let fin = c;
      while (fin + 1 < COLUMNAS && tablero[r][fin + 1].tipo === tablero[r][c].tipo) fin++;
      const largo = fin - c + 1;
      if (largo >= 3) {
        for (let k = c; k <= fin; k++) marcadas.add(`${r},${k}`);
        if (largo === 4) {
          for (let k = 0; k < COLUMNAS; k++) marcadas.add(`${r},${k}`);
        } else if (largo >= 5) {
          const medio = Math.floor((c + fin) / 2);
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            const rr = r + dr, cc = medio + dc;
            if (rr >= 0 && rr < FILAS && cc >= 0 && cc < COLUMNAS) marcadas.add(`${rr},${cc}`);
          }
        }
      }
      c = fin + 1;
    }
  }

  for (let c = 0; c < COLUMNAS; c++) {
    let r = 0;
    while (r < FILAS) {
      let fin = r;
      while (fin + 1 < FILAS && tablero[fin + 1][c].tipo === tablero[r][c].tipo) fin++;
      const largo = fin - r + 1;
      if (largo >= 3) {
        for (let k = r; k <= fin; k++) marcadas.add(`${k},${c}`);
        if (largo === 4) {
          for (let k = 0; k < FILAS; k++) marcadas.add(`${k},${c}`);
        } else if (largo >= 5) {
          const medio = Math.floor((r + fin) / 2);
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            const rr = medio + dr, cc = c + dc;
            if (rr >= 0 && rr < FILAS && cc >= 0 && cc < COLUMNAS) marcadas.add(`${rr},${cc}`);
          }
        }
      }
      r = fin + 1;
    }
  }

  return marcadas;
}

function aplicarGravedadYRellenar(tablero: Pieza[][], marcadas: Set<string>): Pieza[][] {
  const nuevo: Pieza[][] = Array.from({ length: FILAS }, () => new Array<Pieza>(COLUMNAS));
  for (let c = 0; c < COLUMNAS; c++) {
    const restante: Pieza[] = [];
    for (let r = 0; r < FILAS; r++) {
      if (!marcadas.has(`${r},${c}`)) restante.push(tablero[r][c]);
    }
    const faltantes = FILAS - restante.length;
    const nuevas = Array.from({ length: faltantes }, () => crearPieza(tipoAleatorio()));
    const columna = [...nuevas, ...restante];
    for (let r = 0; r < FILAS; r++) nuevo[r][c] = columna[r];
  }
  return nuevo;
}

function hayMovimientoValido(tablero: Pieza[][]): boolean {
  for (let r = 0; r < FILAS; r++) {
    for (let c = 0; c < COLUMNAS; c++) {
      if (c + 1 < COLUMNAS && encontrarCoincidencias(intercambiar(tablero, { r, c }, { r, c: c + 1 })).size > 0) return true;
      if (r + 1 < FILAS && encontrarCoincidencias(intercambiar(tablero, { r, c }, { r: r + 1, c })).size > 0) return true;
    }
  }
  return false;
}

function generarTableroValido(): Pieza[][] {
  let tablero = generarTablero();
  let intentos = 0;
  while (!hayMovimientoValido(tablero) && intentos < 30) {
    tablero = generarTablero();
    intentos++;
  }
  return tablero;
}

export default function JardinScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showTutorial, dismissTutorial, reopenTutorial } = useTutorial('jardin');
  const { reproducir } = useGameSounds();
  const { sonidoActivado, toggleSonido } = useSonidoJuegos();

  const [fase, setFase] = useState<Fase>('inicio');
  const [tablero, setTablero] = useState<Pieza[][]>(() => generarTableroValido());
  const [seleccionado, setSeleccionado] = useState<Coord | null>(null);
  const [intentoInvalido, setIntentoInvalido] = useState<{ a: Coord; b: Coord } | null>(null);
  const [celdasResaltadas, setCeldasResaltadas] = useState<Set<string>>(new Set());
  const [puntaje, setPuntaje] = useState(0);
  const [movimientos, setMovimientos] = useState(MOVIMIENTOS_INICIALES);
  const [resolviendo, setResolviendo] = useState(false);
  const [mejorPuntaje, setMejorPuntaje] = useState<number | null>(null);
  const [esRecordNuevo, setEsRecordNuevo] = useState(false);

  const puntajeRef = useRef(0);
  const mejorPuntajeRef = useRef<number | null>(null);
  puntajeRef.current = puntaje;
  mejorPuntajeRef.current = mejorPuntaje;

  useEffect(() => {
    obtenerEstadisticasPuntaje('jardin')
      .then((stats) => setMejorPuntaje(stats.mejorPuntaje))
      .catch(() => {});
  }, []);

  const resolverCadena = useCallback(async (tableroInicial: Pieza[][]) => {
    let actual = tableroInicial;
    let multiplicador = 1;
    let ganados = 0;
    setResolviendo(true);

    let marcadas = encontrarCoincidencias(actual);
    while (marcadas.size > 0) {
      setCeldasResaltadas(marcadas);
      reproducir(marcadas.size >= 7 ? 'linea_completa' : 'combinacion');
      await esperar(220);

      ganados += marcadas.size * 10 * multiplicador;

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      actual = aplicarGravedadYRellenar(actual, marcadas);
      setTablero(actual);
      setCeldasResaltadas(new Set());
      await esperar(260);

      multiplicador += 1;
      marcadas = encontrarCoincidencias(actual);
    }

    if (ganados > 0) {
      setPuntaje((prev) => prev + ganados);
    }

    if (!hayMovimientoValido(actual)) {
      await esperar(200);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      actual = generarTableroValido();
      setTablero(actual);
      await esperar(200);
    }

    setResolviendo(false);
    return actual;
  }, [reproducir]);

  const finalizarPartida = useCallback(() => {
    setFase('fin');
    const puntajeFinal = puntajeRef.current;
    const esRecord = mejorPuntajeRef.current == null || puntajeFinal > mejorPuntajeRef.current;
    setEsRecordNuevo(esRecord);
    if (esRecord) {
      setMejorPuntaje(puntajeFinal);
      reproducir('puntaje_alto');
    }
    void registrarPartida('jardin', null, puntajeFinal);
  }, [reproducir]);

  const onTapCelda = useCallback((r: number, c: number) => {
    if (resolviendo || fase !== 'jugando') return;

    if (!seleccionado) {
      setSeleccionado({ r, c });
      return;
    }
    if (seleccionado.r === r && seleccionado.c === c) {
      setSeleccionado(null);
      return;
    }

    const esAdyacente = Math.abs(seleccionado.r - r) + Math.abs(seleccionado.c - c) === 1;
    if (!esAdyacente) {
      setSeleccionado({ r, c });
      return;
    }

    const origen = seleccionado;
    const destino = { r, c };
    const probado = intercambiar(tablero, origen, destino);
    const marcadas = encontrarCoincidencias(probado);
    setSeleccionado(null);

    if (marcadas.size === 0) {
      setIntentoInvalido({ a: origen, b: destino });
      setTimeout(() => setIntentoInvalido(null), 260);
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTablero(probado);
    reproducir('colocar');
    const movimientosNuevos = movimientos - 1;
    setMovimientos(movimientosNuevos);

    void resolverCadena(probado).then(() => {
      if (movimientosNuevos <= 0) finalizarPartida();
    });
  }, [seleccionado, tablero, resolviendo, fase, movimientos, resolverCadena, finalizarPartida, reproducir]);

  const empezar = useCallback(() => {
    setTablero(generarTableroValido());
    setPuntaje(0);
    setMovimientos(MOVIMIENTOS_INICIALES);
    setSeleccionado(null);
    setCeldasResaltadas(new Set());
    setEsRecordNuevo(false);
    setFase('jugando');
  }, []);

  return (
    <View style={styles.container}>
      <AppHeader title="Jardín ElderTech" showBack />

      <View style={[styles.content, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.scoreboard}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Puntos</Text>
            <Text style={styles.scoreValue}>{puntaje}</Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Movimientos</Text>
            <Text style={styles.scoreValue}>{fase === 'inicio' ? MOVIMIENTOS_INICIALES : movimientos}</Text>
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
                {fila.map((pieza, c) => {
                  const clave = `${r},${c}`;
                  const seleccionada = seleccionado?.r === r && seleccionado?.c === c;
                  const resaltada = celdasResaltadas.has(clave);
                  const enIntentoInvalido =
                    intentoInvalido != null &&
                    ((intentoInvalido.a.r === r && intentoInvalido.a.c === c) ||
                      (intentoInvalido.b.r === r && intentoInvalido.b.c === c));
                  const tipo = TIPOS_PIEZA[pieza.tipo];
                  return (
                    <TouchableOpacity
                      key={pieza.id}
                      style={styles.celda}
                      onPress={() => onTapCelda(r, c)}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel={`${tipo.nombre}${seleccionada ? ', seleccionada' : ''}`}
                    >
                      <View
                        style={[
                          styles.pieza,
                          { backgroundColor: tipo.color },
                          seleccionada && styles.piezaSeleccionada,
                          resaltada && styles.piezaResaltada,
                          enIntentoInvalido && styles.piezaInvalida,
                        ]}
                      >
                        <Ionicons name={tipo.icono} size={22} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

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
              <Ionicons name="flower" size={40} color={Colors.white} />
            </View>
            <Text style={styles.modalTitle}>¿Cómo se juega?</Text>
            <View style={styles.speakRowWrapper}>
              <SpeakButton
                texto="Tocá una pieza y después tocá una pieza vecina para intercambiarlas. Si formás una fila o columna de 3 o más piezas iguales, desaparecen y sumás puntos. Combiná 4 para limpiar toda la fila, o 5 para limpiar un área más grande. Tenés 20 movimientos por partida."
                variante="escuchar"
              />
            </View>
            <Text style={styles.modalSub}>
              Tocá una pieza y después tocá una pieza vecina para intercambiarlas.{'\n\n'}
              Si formás una fila o columna de 3 o más piezas iguales, desaparecen y sumás puntos.{'\n\n'}
              Combiná 4 para limpiar toda la fila, o 5 para limpiar un área más grande.{'\n\n'}
              Tenés {MOVIMIENTOS_INICIALES} movimientos por partida.
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
  content: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.lg },

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
  tablero: { width: '100%', height: '100%' },
  filaTablero: { flex: 1, flexDirection: 'row' },
  celda: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 3 },
  pieza: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  piezaSeleccionada: { borderWidth: 3, borderColor: Colors.textPrimary, transform: [{ scale: 1.08 }] },
  piezaResaltada: { transform: [{ scale: 1.15 }], opacity: 0.55 },
  piezaInvalida: { opacity: 0.4 },

  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    minWidth: 220,
    justifyContent: 'center',
  },
  startBtnText: { color: Colors.white, fontSize: FontSizes.xl, fontWeight: 'bold' },

  filaBotones: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  helpBtnText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: '#00000066', alignItems: 'center', justifyContent: 'center' },
  modalBox: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.xxl, width: '82%', alignItems: 'center' },
  modalIconWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#D81B60',
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
