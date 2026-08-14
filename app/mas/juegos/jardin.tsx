// Jardín ElderTech — match-3 estilo "candy crush" (gráficos originales, no
// copiados de ningún juego con derechos de autor). Se puede jugar de dos
// formas: tocar una pieza y después tocar una vecina para intercambiarlas
// (accesible para motricidad reducida), o arrastrar directamente el dedo
// desde una pieza hacia el lado al que se quiere mover.
//
// Réplica de las mecánicas reales de "combinar 3":
// - 4 en línea → caramelo RAYADO: al activarse limpia toda la fila (si el
//   match fue horizontal) o toda la columna (si fue vertical).
// - Forma de L o T (una corrida horizontal y una vertical que se cruzan) →
//   caramelo ENVUELTO: al activarse explota un área de 3×3 a su alrededor.
// - 5 en línea → BOMBA (esfera con puntitos de colores): al activarse limpia
//   TODOS los caramelos del color con el que se combinó.
// - Combinar dos especiales entre sí (arrastrando o tocando uno al lado del
//   otro) da un efecto todavía más grande: dos rayados limpian fila+columna,
//   un envuelto+rayado limpia 3 filas y 3 columnas, dos envueltos hacen una
//   explosión más grande, y cualquier combo con una bomba arrasa el tablero.
//
// Capa visual: gradientes + brillo + sombra (expo-linear-gradient) y
// animaciones reales en el hilo de UI vía react-native-reanimated — igual
// que antes, sin builds nativos nuevos. El arrastre usa react-native-
// gesture-handler, que ya está instalado y montado en la raíz de la app.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
const ESPERA_ESPECIAL_MS = 90;
const UMBRAL_ARRASTRE = 14;

type Fase = 'inicio' | 'jugando' | 'fin';
type Forma = 'circulo' | 'cuadrado' | 'pildora';
type EspecialTipo = 'rayada-h' | 'rayada-v' | 'envuelta' | 'bomba';
interface Pieza { id: number; tipo: number; especial?: EspecialTipo }
interface Coord { r: number; c: number }

const CARAMELOS: { nombre: string; forma: Forma; claro: string; oscuro: string }[] = [
  { nombre: 'cereza', forma: 'circulo', claro: '#FF8A80', oscuro: '#C62828' },
  { nombre: 'arándano', forma: 'circulo', claro: '#64B5F6', oscuro: '#1565C0' },
  { nombre: 'limón', forma: 'cuadrado', claro: '#FFF59D', oscuro: '#F9A825' },
  { nombre: 'manzana', forma: 'cuadrado', claro: '#AED581', oscuro: '#2E7D32' },
  { nombre: 'naranja', forma: 'pildora', claro: '#FFB74D', oscuro: '#E65100' },
  { nombre: 'uva', forma: 'pildora', claro: '#CE93D8', oscuro: '#6A1B9A' },
];

const NOMBRE_ESPECIAL: Record<EspecialTipo, string> = {
  'rayada-h': 'especial, limpia una fila entera',
  'rayada-v': 'especial, limpia una columna entera',
  envuelta: 'especial, explota un área',
  bomba: 'bomba, limpia todo un color',
};

let siguienteId = 1;
function crearPieza(tipo: number): Pieza {
  return { id: siguienteId++, tipo };
}
function tipoAleatorio(excluidos: number[] = []): number {
  let t: number;
  do { t = Math.floor(Math.random() * CARAMELOS.length); } while (excluidos.includes(t));
  return t;
}
function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function clave(co: Coord): string {
  return `${co.r},${co.c}`;
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

interface Corrida { celdas: Coord[]; tipo: number; horizontal: boolean }
interface NuevaEspecial extends Coord { especial: EspecialTipo; tipo: number }
interface GrupoResultado { limpiar: Set<string>; nuevasEspeciales: NuevaEspecial[] }

/**
 * Detecta las corridas de 3+ (horizontales y verticales), las agrupa por
 * intersección (para reconocer formas de L/T) y decide qué caramelo especial
 * nace de cada grupo — igual que las reglas reales de "combinar 3":
 * línea de 4 → rayado, línea de 5+ → bomba, L/T → envuelto.
 * `pivot`, si se pasa, es la celda donde el jugador soltó la pieza — el
 * especial nuevo aparece ahí si es parte del grupo (como en el juego real).
 */
function detectarGrupos(tablero: Pieza[][], pivot?: Coord): GrupoResultado {
  const corridas: Corrida[] = [];

  for (let r = 0; r < FILAS; r++) {
    let c = 0;
    while (c < COLUMNAS) {
      let fin = c;
      while (fin + 1 < COLUMNAS && tablero[r][fin + 1].tipo === tablero[r][c].tipo) fin++;
      const largo = fin - c + 1;
      if (largo >= 3) {
        const celdas: Coord[] = [];
        for (let k = c; k <= fin; k++) celdas.push({ r, c: k });
        corridas.push({ celdas, tipo: tablero[r][c].tipo, horizontal: true });
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
        const celdas: Coord[] = [];
        for (let k = r; k <= fin; k++) celdas.push({ r: k, c });
        corridas.push({ celdas, tipo: tablero[r][c].tipo, horizontal: false });
      }
      r = fin + 1;
    }
  }

  if (corridas.length === 0) return { limpiar: new Set(), nuevasEspeciales: [] };

  const idxPorCelda = new Map<string, number[]>();
  corridas.forEach((corr, i) => {
    corr.celdas.forEach((co) => {
      const arr = idxPorCelda.get(clave(co)) ?? [];
      arr.push(i);
      idxPorCelda.set(clave(co), arr);
    });
  });

  const visitado = new Array(corridas.length).fill(false);
  const limpiar = new Set<string>();
  const nuevasEspeciales: NuevaEspecial[] = [];

  for (let i = 0; i < corridas.length; i++) {
    if (visitado[i]) continue;
    const grupoIdx: number[] = [];
    const pila = [i];
    visitado[i] = true;
    while (pila.length > 0) {
      const idx = pila.pop()!;
      grupoIdx.push(idx);
      for (const co of corridas[idx].celdas) {
        for (const vecino of idxPorCelda.get(clave(co)) ?? []) {
          if (!visitado[vecino]) { visitado[vecino] = true; pila.push(vecino); }
        }
      }
    }

    const celdasGrupo = new Set<string>();
    grupoIdx.forEach((idx) => corridas[idx].celdas.forEach((co) => celdasGrupo.add(clave(co))));
    celdasGrupo.forEach((cl) => limpiar.add(cl));

    const tipo = corridas[grupoIdx[0]].tipo;
    const grupoCorridas = grupoIdx.map((idx) => corridas[idx]);
    let celdaEspecial: Coord | null = pivot && celdasGrupo.has(clave(pivot)) ? pivot : null;

    if (grupoCorridas.length >= 2) {
      const larga = grupoCorridas.find((cr) => cr.celdas.length >= 4);
      if (larga) {
        if (!celdaEspecial) celdaEspecial = larga.celdas[Math.floor(larga.celdas.length / 2)];
        const especial: EspecialTipo = larga.celdas.length >= 5 ? 'bomba' : larga.horizontal ? 'rayada-h' : 'rayada-v';
        nuevasEspeciales.push({ ...celdaEspecial, especial, tipo });
      } else {
        const horiz = grupoCorridas.find((cr) => cr.horizontal);
        const vert = grupoCorridas.find((cr) => !cr.horizontal);
        let interseccion: Coord | null = null;
        if (horiz && vert) {
          for (const ch of horiz.celdas) for (const cv of vert.celdas) {
            if (ch.r === cv.r && ch.c === cv.c) interseccion = ch;
          }
        }
        if (!celdaEspecial) celdaEspecial = interseccion ?? grupoCorridas[0].celdas[0];
        nuevasEspeciales.push({ ...celdaEspecial, especial: 'envuelta', tipo });
      }
    } else {
      const corrida = grupoCorridas[0];
      const largo = corrida.celdas.length;
      if (largo >= 5) {
        if (!celdaEspecial) celdaEspecial = corrida.celdas[Math.floor(largo / 2)];
        nuevasEspeciales.push({ ...celdaEspecial, especial: 'bomba', tipo });
      } else if (largo === 4) {
        if (!celdaEspecial) celdaEspecial = corrida.celdas[Math.floor(largo / 2)];
        nuevasEspeciales.push({ ...celdaEspecial, especial: corrida.horizontal ? 'rayada-h' : 'rayada-v', tipo });
      }
    }
  }

  // La celda donde nace un especial no se limpia — sobrevive convertida en esa pieza.
  nuevasEspeciales.forEach((n) => limpiar.delete(clave(n)));

  return { limpiar, nuevasEspeciales };
}

/** Celdas que agrega el efecto de UN especial ya existente al activarse. */
function celdasEfectoEspecial(tablero: Pieza[][], celda: Coord, pieza: Pieza): Set<string> {
  const extra = new Set<string>();
  if (pieza.especial === 'rayada-h') {
    for (let c = 0; c < COLUMNAS; c++) extra.add(`${celda.r},${c}`);
  } else if (pieza.especial === 'rayada-v') {
    for (let r = 0; r < FILAS; r++) extra.add(`${r},${celda.c}`);
  } else if (pieza.especial === 'envuelta') {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = celda.r + dr, cc = celda.c + dc;
      if (rr >= 0 && rr < FILAS && cc >= 0 && cc < COLUMNAS) extra.add(`${rr},${cc}`);
    }
  } else if (pieza.especial === 'bomba') {
    for (let r = 0; r < FILAS; r++) for (let c = 0; c < COLUMNAS; c++) {
      if (tablero[r][c].tipo === pieza.tipo) extra.add(`${r},${c}`);
    }
  }
  return extra;
}

/** Encadena detonaciones: si el efecto de un especial alcanza a OTRO especial, también se activa. */
function expandirEfectosEspeciales(tablero: Pieza[][], inicial: Set<string>): Set<string> {
  const resultado = new Set(inicial);
  const procesadas = new Set<string>();
  const cola = [...inicial];
  while (cola.length > 0) {
    const cl = cola.shift()!;
    if (procesadas.has(cl)) continue;
    procesadas.add(cl);
    const [r, c] = cl.split(',').map(Number);
    const pieza = tablero[r]?.[c];
    if (!pieza?.especial) continue;
    celdasEfectoEspecial(tablero, { r, c }, pieza).forEach((extra) => {
      if (!resultado.has(extra)) { resultado.add(extra); cola.push(extra); }
    });
  }
  return resultado;
}

/** Combo de DOS especiales al intercambiarlos directamente (el caso de uno solo lo resuelve `celdasActivacionUnEspecial`). */
function celdasComboDirecto(destino: Coord, piezaEnDestino: Pieza, piezaEnOrigen: Pieza): Set<string> {
  const limpiar = new Set<string>();

  if (piezaEnDestino.especial === 'bomba' || piezaEnOrigen.especial === 'bomba') {
    for (let r = 0; r < FILAS; r++) for (let c = 0; c < COLUMNAS; c++) limpiar.add(`${r},${c}`);
  } else if (piezaEnDestino.especial === 'envuelta' || piezaEnOrigen.especial === 'envuelta') {
    for (let dr = -1; dr <= 1; dr++) {
      const rr = destino.r + dr;
      if (rr >= 0 && rr < FILAS) for (let c = 0; c < COLUMNAS; c++) limpiar.add(`${rr},${c}`);
    }
    for (let dc = -1; dc <= 1; dc++) {
      const cc = destino.c + dc;
      if (cc >= 0 && cc < COLUMNAS) for (let r = 0; r < FILAS; r++) limpiar.add(`${r},${cc}`);
    }
  } else {
    for (let c = 0; c < COLUMNAS; c++) limpiar.add(`${destino.r},${c}`);
    for (let r = 0; r < FILAS; r++) limpiar.add(`${r},${destino.c}`);
  }
  return limpiar;
}

/** Igual que `celdasComboDirecto`, pero resolviendo el caso 'bomba' de un solo especial con el tablero real. */
function celdasActivacionUnEspecial(tablero: Pieza[][], destino: Coord, piezaEspecial: Pieza, colorObjetivo: number): Set<string> {
  const piezaEfectiva: Pieza = piezaEspecial.especial === 'bomba' ? { ...piezaEspecial, tipo: colorObjetivo } : piezaEspecial;
  return celdasEfectoEspecial(tablero, destino, piezaEfectiva);
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
      if (c + 1 < COLUMNAS && detectarGrupos(intercambiar(tablero, { r, c }, { r, c: c + 1 })).limpiar.size > 0) return true;
      if (r + 1 < FILAS && detectarGrupos(intercambiar(tablero, { r, c }, { r: r + 1, c })).limpiar.size > 0) return true;
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

// ─── Formas y overlays de los especiales ──────────────────────────────────

function estiloForma(forma: Forma, tamano: number): ViewStyle {
  if (forma === 'cuadrado') return { borderRadius: tamano * 0.22 };
  if (forma === 'pildora') return { borderRadius: 999, marginHorizontal: tamano * 0.11 };
  return { borderRadius: 999 };
}

const PUNTOS_BOMBA = [
  { x: 0.26, y: 0.22, color: '#FF8A80' },
  { x: 0.62, y: 0.16, color: '#64B5F6' },
  { x: 0.8, y: 0.44, color: '#FFF59D' },
  { x: 0.66, y: 0.7, color: '#AED581' },
  { x: 0.3, y: 0.74, color: '#CE93D8' },
  { x: 0.16, y: 0.46, color: '#FFB74D' },
  { x: 0.48, y: 0.46, color: '#FF8A80' },
];

function VistaBomba({ tamano }: { tamano: number }) {
  return (
    <>
      <LinearGradient colors={['#6D4C41', '#1B0F09']} start={{ x: 0.2, y: 0.1 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      {PUNTOS_BOMBA.map((p, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: tamano * p.x,
            top: tamano * p.y,
            width: tamano * 0.1,
            height: tamano * 0.1,
            borderRadius: 999,
            backgroundColor: p.color,
          }}
        />
      ))}
    </>
  );
}

function VistaRayas({ horizontal }: { horizontal: boolean }) {
  const franjas = [0.26, 0.5, 0.74];
  return (
    <>
      {franjas.map((pos, i) => (
        <View
          key={i}
          style={
            horizontal
              ? { position: 'absolute', left: 0, right: 0, top: `${(pos - 0.06) * 100}%`, height: '12%', backgroundColor: 'rgba(255,255,255,0.6)' }
              : { position: 'absolute', top: 0, bottom: 0, left: `${(pos - 0.06) * 100}%`, width: '12%', backgroundColor: 'rgba(255,255,255,0.6)' }
          }
        />
      ))}
    </>
  );
}

function VistaEnvuelta() {
  return (
    <>
      <View style={[StyleSheet.absoluteFill, { borderWidth: 3, borderColor: 'rgba(255,213,110,0.9)', borderRadius: 999 }]} />
      <View style={styles.envueltaAlaIzq} />
      <View style={styles.envueltaAlaDer} />
    </>
  );
}

// ─── Caramelo animado: gradiente + brillo + sombra, posición absoluta con spring ──

interface CaramelloProps {
  pieza: Pieza;
  fila: number;
  columna: number;
  tamano: number;
  seleccionada: boolean;
  resaltada: boolean;
  invalida: boolean;
}

function Caramelo({ pieza, fila, columna, tamano, seleccionada, resaltada, invalida }: CaramelloProps) {
  const info = CARAMELOS[pieza.tipo];
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
  const nombreAccesible = `${info.nombre}${pieza.especial ? ', ' + NOMBRE_ESPECIAL[pieza.especial] : ''}${seleccionada ? ', seleccionada' : ''}`;

  return (
    <Animated.View style={estiloAnimado} accessibilityLabel={nombreAccesible}>
      <View style={{ flex: 1, padding: relleno }}>
        {pieza.especial === 'bomba' ? (
          <View style={[styles.gema, { borderRadius: 999 }, seleccionada && styles.gemaSeleccionada]}>
            <VistaBomba tamano={tamano} />
            <View style={styles.gemaBrilloGrande} />
          </View>
        ) : (
          <LinearGradient
            colors={[info.claro, info.oscuro]}
            start={{ x: 0.15, y: 0.1 }}
            end={{ x: 0.9, y: 1 }}
            style={[styles.gema, estiloForma(info.forma, tamano), seleccionada && styles.gemaSeleccionada]}
          >
            <View style={styles.gemaBrilloGrande} />
            <View style={styles.gemaBrilloChico} />
            {pieza.especial === 'rayada-h' && <VistaRayas horizontal />}
            {pieza.especial === 'rayada-v' && <VistaRayas horizontal={false} />}
            {pieza.especial === 'envuelta' && <VistaEnvuelta />}
          </LinearGradient>
        )}
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

  const resolverCadena = useCallback(async (tableroInicial: Pieza[][], pivotInicial?: Coord) => {
    let actual = tableroInicial;
    let multiplicador = 1;
    let ganados = 0;
    setResolviendo(true);

    let pivot = pivotInicial;
    let { limpiar, nuevasEspeciales } = detectarGrupos(actual, pivot);

    while (limpiar.size > 0 || nuevasEspeciales.length > 0) {
      const limpiarExpandido = expandirEfectosEspeciales(actual, limpiar);
      nuevasEspeciales.forEach((n) => limpiarExpandido.delete(clave(n)));

      const huboEspecial = nuevasEspeciales.length > 0 || limpiarExpandido.size > limpiar.size;
      setCeldasResaltadas(limpiarExpandido);
      reproducir(huboEspecial || limpiarExpandido.size >= 7 ? 'linea_completa' : 'combinacion');
      await esperar(ESPERA_RESALTADO_MS);

      ganados += limpiarExpandido.size * 10 * multiplicador;

      if (nuevasEspeciales.length > 0) {
        actual = actual.map((fila) => fila.slice());
        nuevasEspeciales.forEach((n) => {
          actual[n.r][n.c] = { ...actual[n.r][n.c], especial: n.especial };
        });
        setTablero(actual);
        await esperar(ESPERA_ESPECIAL_MS);
      }

      actual = aplicarGravedadYRellenar(actual, limpiarExpandido);
      setTablero(actual);
      setCeldasResaltadas(new Set());
      await esperar(ESPERA_GRAVEDAD_MS);

      multiplicador += 1;
      pivot = undefined;
      ({ limpiar, nuevasEspeciales } = detectarGrupos(actual, pivot));
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

  const intentarIntercambio = useCallback((origen: Coord, destino: Coord) => {
    if (resolviendo || fase !== 'jugando') return;
    if (Math.abs(origen.r - destino.r) + Math.abs(origen.c - destino.c) !== 1) return;
    if (destino.r < 0 || destino.r >= FILAS || destino.c < 0 || destino.c >= COLUMNAS) return;

    const piezaOrigen = tablero[origen.r][origen.c];
    const piezaDestino = tablero[destino.r][destino.c];
    const probado = intercambiar(tablero, origen, destino);
    setSeleccionado(null);

    // Si hay algún especial de por medio, el intercambio SIEMPRE se acepta
    // (como en el juego real: un especial se activa al moverlo, forme match
    // nuevo o no) y dispara su efecto en vez de buscar coincidencias normales.
    if (piezaOrigen.especial || piezaDestino.especial) {
      const limpiarCombo = piezaOrigen.especial && piezaDestino.especial
        ? celdasComboDirecto(destino, piezaDestino, piezaOrigen)
        : celdasActivacionUnEspecial(
            probado,
            piezaDestino.especial ? destino : origen,
            (piezaDestino.especial ? piezaDestino : piezaOrigen) as Pieza & { especial: EspecialTipo },
            piezaDestino.especial ? piezaOrigen.tipo : piezaDestino.tipo,
          );

      setTablero(probado);
      reproducir('linea_completa');
      const movimientosNuevos = movimientos - 1;
      setMovimientos(movimientosNuevos);

      void (async () => {
        const expandido = expandirEfectosEspeciales(probado, limpiarCombo);
        setCeldasResaltadas(expandido);
        await esperar(ESPERA_RESALTADO_MS);
        setPuntaje((prev) => prev + expandido.size * 10);
        let siguiente = aplicarGravedadYRellenar(probado, expandido);
        setTablero(siguiente);
        setCeldasResaltadas(new Set());
        await esperar(ESPERA_GRAVEDAD_MS);
        siguiente = await resolverCadena(siguiente);
        if (movimientosNuevos <= 0) finalizarPartida();
      })();
      return;
    }

    const { limpiar } = detectarGrupos(probado, destino);
    if (limpiar.size === 0) {
      setIntentoInvalido({ a: origen, b: destino });
      setTimeout(() => setIntentoInvalido(null), 260);
      return;
    }

    setTablero(probado);
    reproducir('colocar');
    const movimientosNuevos = movimientos - 1;
    setMovimientos(movimientosNuevos);

    void resolverCadena(probado, destino).then(() => {
      if (movimientosNuevos <= 0) finalizarPartida();
    });
  }, [tablero, resolviendo, fase, movimientos, resolverCadena, finalizarPartida, reproducir]);

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
    intentarIntercambio(seleccionado, { r, c });
  }, [seleccionado, resolviendo, fase, intentarIntercambio]);

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

            {/* Caramelos animados */}
            {tamanoCelda > 0 && tablero.map((fila, r) => fila.map((pieza, c) => {
              const cl = clave({ r, c });
              const seleccionada = seleccionado?.r === r && seleccionado?.c === c;
              const resaltada = celdasResaltadas.has(cl);
              const invalida = intentoInvalido != null &&
                ((intentoInvalido.a.r === r && intentoInvalido.a.c === c) || (intentoInvalido.b.r === r && intentoInvalido.b.c === c));
              return (
                <Caramelo
                  key={pieza.id}
                  pieza={pieza}
                  fila={r}
                  columna={c}
                  tamano={tamanoCelda}
                  seleccionada={seleccionada}
                  resaltada={resaltada}
                  invalida={invalida}
                />
              );
            }))}

            {/* Grilla de toque/arrastre, transparente, encima de todo */}
            {tamanoCelda > 0 && (
              <View style={StyleSheet.absoluteFill}>
                {Array.from({ length: FILAS }).map((_, r) => (
                  <View key={r} style={{ flexDirection: 'row' }}>
                    {Array.from({ length: COLUMNAS }).map((_, c) => (
                      <CeldaTactil key={c} r={r} c={c} tamano={tamanoCelda} onTap={onTapCelda} onArrastrar={intentarIntercambio} />
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
            <LinearGradient colors={['#FF8A80', '#C62828']} style={styles.modalIconWrap}>
              <Ionicons name="flower" size={40} color={Colors.white} />
            </LinearGradient>
            <Text style={styles.modalTitle}>¿Cómo se juega?</Text>
            <View style={styles.speakRowWrapper}>
              <SpeakButton
                texto="Arrastrá un caramelo hacia un costado para moverlo, o tocá uno y después tocá un vecino. Si formás una fila o columna de 3 o más caramelos iguales, desaparecen y sumás puntos. Combiná 4 en línea y creás un caramelo rayado que limpia toda una fila o columna. Combiná en forma de L o de T y creás un caramelo envuelto que explota un área. Combiná 5 en línea y creás una bomba que limpia todo un color. Si movés dos especiales juntos, el efecto es todavía más grande. Tenés 20 movimientos por partida."
                variante="escuchar"
              />
            </View>
            <Text style={styles.modalSub}>
              Arrastrá un caramelo hacia un costado para moverlo, o tocá uno y después tocá un vecino.{'\n\n'}
              3 en línea desaparecen. 4 en línea crean un caramelo rayado (limpia una fila o columna). Una L o T crean un caramelo envuelto (explota un área). 5 en línea crean una bomba (limpia todo un color).{'\n\n'}
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

// ─── Celda táctil: tocar (tap corto) o arrastrar (pan) hacia un vecino ────

interface CeldaTactilProps {
  r: number;
  c: number;
  tamano: number;
  onTap: (r: number, c: number) => void;
  onArrastrar: (origen: Coord, destino: Coord) => void;
}

function CeldaTactil({ r, c, tamano, onTap, onArrastrar }: CeldaTactilProps) {
  const gesto = Gesture.Pan()
    .minDistance(0)
    .runOnJS(true)
    .onEnd((e) => {
      const dx = e.translationX;
      const dy = e.translationY;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < UMBRAL_ARRASTRE) {
        onTap(r, c);
        return;
      }
      const destino = Math.abs(dx) > Math.abs(dy)
        ? { r, c: c + (dx > 0 ? 1 : -1) }
        : { r: r + (dy > 0 ? 1 : -1), c };
      onArrastrar({ r, c }, destino);
    });

  return (
    <GestureDetector gesture={gesto}>
      <View
        style={{ width: tamano, height: tamano }}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Casillero fila ${r + 1}, columna ${c + 1}`}
        onAccessibilityTap={() => onTap(r, c)}
      />
    </GestureDetector>
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

  envueltaAlaIzq: {
    position: 'absolute', left: '-8%', top: '38%', width: '22%', height: '24%',
    backgroundColor: 'rgba(255,213,110,0.9)', transform: [{ rotate: '45deg' }],
  },
  envueltaAlaDer: {
    position: 'absolute', right: '-8%', top: '38%', width: '22%', height: '24%',
    backgroundColor: 'rgba(255,213,110,0.9)', transform: [{ rotate: '45deg' }],
  },

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
