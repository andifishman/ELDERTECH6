// Jardín ElderTech — match-3 original (temática de jardín/naturaleza, sin
// relación con Candy Crush más allá de la mecánica general de "combinar 3").
// Interacción: tocar una pieza y después tocar una pieza adyacente para
// intercambiarlas — nada de arrastrar, más simple para motricidad reducida.
//
// Capa visual: gemas con gradiente + brillo + sombra (expo-linear-gradient,
// ya era dependencia del proyecto) y animaciones reales en el hilo de UI vía
// react-native-reanimated (idem — no hace falta ningún build nativo nuevo
// para ninguna de las dos). Las piezas se posicionan de forma absoluta
// dentro del tablero e interpolan su propia posición con un spring cuando
// cambian de fila/columna — así la "caída" por gravedad es un movimiento
// real, no un simple re-render en la celda de al lado.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
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

const FILAS = 6;
const COLUMNAS = 6;
const MOVIMIENTOS_INICIALES = 20;
const ESPERA_RESALTADO_MS = 320;
const ESPERA_GRAVEDAD_MS = 260;

type Fase = 'inicio' | 'jugando' | 'fin';
interface Pieza { id: number; tipo: number }
interface Coord { r: number; c: number }

const TIPOS_PIEZA: { icono: keyof typeof Ionicons.glyphMap; claro: string; oscuro: string; nombre: string }[] = [
  { icono: 'flower', claro: '#FF6FA5', oscuro: '#C2185B', nombre: 'flor' },
  { icono: 'leaf', claro: '#81C784', oscuro: '#1B5E20', nombre: 'hoja' },
  { icono: 'sunny', claro: '#FFB74D', oscuro: '#E65100', nombre: 'sol' },
  { icono: 'water', claro: '#64B5F6', oscuro: '#0D47A1', nombre: 'gota' },
  { icono: 'heart', claro: '#EF5350', oscuro: '#B71C1C', nombre: 'corazón' },
  { icono: 'star', claro: '#BA68C8', oscuro: '#4A148C', nombre: 'estrella' },
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

// ─── Gema animada: gradiente + brillo + sombra, posición absoluta con spring ──

interface GemaProps {
  tipo: (typeof TIPOS_PIEZA)[number];
  fila: number;
  columna: number;
  tamano: number;
  seleccionada: boolean;
  resaltada: boolean;
  invalida: boolean;
  nombreAccesible: string;
}

function Gema({ tipo, fila, columna, tamano, seleccionada, resaltada, invalida, nombreAccesible }: GemaProps) {
  const top = useSharedValue(fila * tamano - tamano * 0.4);
  const left = useSharedValue(columna * tamano);
  const escala = useSharedValue(0);
  const rotacion = useSharedValue(0);
  const primerRenderRef = useRef(true);

  useEffect(() => {
    if (primerRenderRef.current) {
      primerRenderRef.current = false;
      top.value = withSpring(fila * tamano, { damping: 12, stiffness: 140 });
      left.value = columna * tamano;
      escala.value = withSpring(1, { damping: 11, stiffness: 160 });
      return;
    }
    top.value = withSpring(fila * tamano, { damping: 13, stiffness: 120 });
    left.value = withSpring(columna * tamano, { damping: 13, stiffness: 120 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fila, columna, tamano]);

  useEffect(() => {
    if (primerRenderRef.current) return;
    if (resaltada) {
      escala.value = withSequence(withTiming(1.35, { duration: 140 }), withTiming(0, { duration: 180 }));
    } else {
      escala.value = withSpring(seleccionada ? 1.14 : 1, { damping: 9, stiffness: 170 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionada, resaltada]);

  useEffect(() => {
    if (invalida) {
      rotacion.value = withSequence(
        withTiming(-7, { duration: 55 }),
        withTiming(7, { duration: 55 }),
        withTiming(-5, { duration: 55 }),
        withTiming(0, { duration: 55 }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invalida]);

  const estiloAnimado = useAnimatedStyle(() => ({
    position: 'absolute',
    top: top.value,
    left: left.value,
    width: tamano,
    height: tamano,
    transform: [{ scale: escala.value }, { rotate: `${rotacion.value}deg` }],
  }));

  const relleno = tamano * 0.07;

  return (
    <Animated.View style={estiloAnimado} accessibilityLabel={nombreAccesible}>
      <View style={{ flex: 1, padding: relleno }}>
        <LinearGradient
          colors={[tipo.claro, tipo.oscuro]}
          start={{ x: 0.15, y: 0.1 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.gema, seleccionada && styles.gemaSeleccionada]}
        >
          <View style={styles.gemaBrilloGrande} />
          <View style={styles.gemaBrilloChico} />
          <Ionicons name={tipo.icono} size={tamano * 0.4} color="#FFFFFF" style={styles.gemaIconoSombra} />
        </LinearGradient>
      </View>
    </Animated.View>
  );
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
  const [medida, setMedida] = useState(0);

  const puntajeRef = useRef(0);
  const mejorPuntajeRef = useRef<number | null>(null);
  puntajeRef.current = puntaje;
  mejorPuntajeRef.current = mejorPuntaje;

  const puntajeEscala = useSharedValue(1);
  const estiloPuntaje = useAnimatedStyle(() => ({ transform: [{ scale: puntajeEscala.value }] }));

  useEffect(() => {
    obtenerEstadisticasPuntaje('jardin')
      .then((stats) => setMejorPuntaje(stats.mejorPuntaje))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (puntaje === 0) return;
    puntajeEscala.value = withSequence(withTiming(1.25, { duration: 110 }), withSpring(1, { damping: 8, stiffness: 180 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puntaje]);

  const resolverCadena = useCallback(async (tableroInicial: Pieza[][]) => {
    let actual = tableroInicial;
    let multiplicador = 1;
    let ganados = 0;
    setResolviendo(true);

    let marcadas = encontrarCoincidencias(actual);
    while (marcadas.size > 0) {
      setCeldasResaltadas(marcadas);
      reproducir(marcadas.size >= 7 ? 'linea_completa' : 'combinacion');
      await esperar(ESPERA_RESALTADO_MS);

      ganados += marcadas.size * 10 * multiplicador;

      actual = aplicarGravedadYRellenar(actual, marcadas);
      setTablero(actual);
      setCeldasResaltadas(new Set());
      await esperar(ESPERA_GRAVEDAD_MS);

      multiplicador += 1;
      marcadas = encontrarCoincidencias(actual);
    }

    if (ganados > 0) {
      setPuntaje((prev) => prev + ganados);
    }

    if (!hayMovimientoValido(actual)) {
      await esperar(200);
      actual = generarTableroValido();
      setTablero(actual);
      await esperar(ESPERA_GRAVEDAD_MS);
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

  const tamanoCelda = medida > 0 ? medida / COLUMNAS : 0;

  return (
    <View style={styles.container}>
      <AppHeader title="Jardín ElderTech" showBack />

      <View style={[styles.content, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.scoreboard}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Puntos</Text>
            <Animated.Text style={[styles.scoreValue, estiloPuntaje]}>{puntaje}</Animated.Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Movimientos</Text>
            <Text style={styles.scoreValue}>{fase === 'inicio' ? MOVIMIENTOS_INICIALES : movimientos}</Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreItem}>
            <Text style={[styles.scoreLabel, { color: '#FFD54F' }]}>Mejor</Text>
            <Text style={[styles.scoreValue, { color: '#FFD54F' }]}>{mejorPuntaje ?? '—'}</Text>
          </View>
        </View>

        <View style={styles.tableroWrap} onLayout={(e) => setMedida(e.nativeEvent.layout.width)}>
          <LinearGradient colors={['#4A148C', '#7B1550', '#AD1457']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tableroFondo}>
            {/* Checker de fondo, para separar visualmente las celdas */}
            <View style={StyleSheet.absoluteFill}>
              {Array.from({ length: FILAS }).map((_, r) => (
                <View key={r} style={{ flexDirection: 'row' }}>
                  {Array.from({ length: COLUMNAS }).map((_, c) => (
                    <View
                      key={c}
                      style={{
                        width: tamanoCelda,
                        height: tamanoCelda,
                        backgroundColor: (r + c) % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
                      }}
                    />
                  ))}
                </View>
              ))}
            </View>

            {/* Gemas animadas */}
            {tamanoCelda > 0 && tablero.map((fila, r) => fila.map((pieza, c) => {
              const clave = `${r},${c}`;
              const seleccionada = seleccionado?.r === r && seleccionado?.c === c;
              const resaltada = celdasResaltadas.has(clave);
              const invalida = intentoInvalido != null &&
                ((intentoInvalido.a.r === r && intentoInvalido.a.c === c) || (intentoInvalido.b.r === r && intentoInvalido.b.c === c));
              const tipo = TIPOS_PIEZA[pieza.tipo];
              return (
                <Gema
                  key={pieza.id}
                  tipo={tipo}
                  fila={r}
                  columna={c}
                  tamano={tamanoCelda}
                  seleccionada={seleccionada}
                  resaltada={resaltada}
                  invalida={invalida}
                  nombreAccesible={`${tipo.nombre}${seleccionada ? ', seleccionada' : ''}`}
                />
              );
            }))}

            {/* Grilla de toque, transparente, encima de todo */}
            {tamanoCelda > 0 && (
              <View style={StyleSheet.absoluteFill}>
                {Array.from({ length: FILAS }).map((_, r) => (
                  <View key={r} style={{ flexDirection: 'row' }}>
                    {Array.from({ length: COLUMNAS }).map((_, c) => (
                      <TouchableOpacity
                        key={c}
                        style={{ width: tamanoCelda, height: tamanoCelda }}
                        onPress={() => onTapCelda(r, c)}
                        activeOpacity={1}
                        accessibilityRole="button"
                      />
                    ))}
                  </View>
                ))}
              </View>
            )}
          </LinearGradient>
        </View>

        {fase !== 'jugando' && (
          <TouchableOpacity style={styles.startBtnWrap} onPress={empezar} activeOpacity={0.85}>
            <LinearGradient colors={['#66BB6A', Colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.startBtn}>
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
            <LinearGradient colors={['#FF6FA5', '#C2185B']} style={styles.modalIconWrap}>
              <Ionicons name="flower" size={40} color={Colors.white} />
            </LinearGradient>
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
            <LinearGradient colors={esRecordNuevo ? ['#FFD54F', '#F57F17'] : ['#66BB6A', Colors.primary]} style={styles.modalIconWrap}>
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
  content: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.lg },

  scoreboard: {
    flexDirection: 'row',
    backgroundColor: '#3D0F4A',
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
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  tableroFondo: { flex: 1 },

  gema: {
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
    overflow: 'hidden',
  },
  gemaSeleccionada: { borderWidth: 2.5, borderColor: '#FFFFFF' },
  gemaBrilloGrande: {
    position: 'absolute', top: '10%', left: '14%', width: '50%', height: '32%',
    borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.42)', transform: [{ rotate: '-18deg' }],
  },
  gemaBrilloChico: {
    position: 'absolute', bottom: '16%', right: '20%', width: '16%', height: '16%',
    borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.25)',
  },
  gemaIconoSombra: { textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },

  startBtnWrap: { width: '100%', borderRadius: Radius.sm, overflow: 'hidden' },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl,
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
