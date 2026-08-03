import AppHeader from '@/components/ui/AppHeader';
import { SpeakRow } from '@/components/common/SpeakButton';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';
import { useTutorial } from '@/hooks/useTutorial';
import { registrarPartida } from '@/services/juegosService';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Tipos ──────────────────────────────────────────────────────────────────
type Cell = [number, number];
type Direction = 'n' | 's' | 'e' | 'w';

interface Puzzle {
  size: number;
  colors: string[];
  dots: Record<string, [Cell, Cell]>;
}

// ─── Generador de tablero ───────────────────────────────────────────────────
// Estrategia: generar UN camino que recorra la grilla entera celda por celda
// (un "camino Hamiltoniano"), y después cortarlo en tramos — uno por color.
// Como los tramos salen de partir el mismo camino, entre todos cubren la
// grilla completa sin superponerse: siempre hay al menos una solución posible.
const DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}

function inBounds(r: number, c: number, size: number): boolean {
  return r >= 0 && r < size && c >= 0 && c < size;
}

function unvisitedNeighbors(r: number, c: number, size: number, visited: Set<string>): Cell[] {
  const out: Cell[] = [];
  for (const [dr, dc] of DIRS) {
    const nr = r + dr;
    const nc = c + dc;
    if (inBounds(nr, nc, size) && !visited.has(cellKey(nr, nc))) out.push([nr, nc]);
  }
  return out;
}

// Búsqueda aleatoria con la regla de Warnsdorff (probar primero la celda con
// menos salidas futuras) — encuentra un camino que pasa por cada celda de la
// grilla una sola vez. Con un tope de pasos para nunca colgar la pantalla.
function tryHamiltonianPath(size: number, maxSteps: number): Cell[] | null {
  const total = size * size;
  const visited = new Set<string>();
  const path: Cell[] = [];
  let steps = 0;

  function dfs(r: number, c: number): boolean {
    steps++;
    if (steps > maxSteps) return false;
    visited.add(cellKey(r, c));
    path.push([r, c]);
    if (path.length === total) return true;

    const candidatos = unvisitedNeighbors(r, c, size, visited)
      .map(([nr, nc]) => ({
        nr,
        nc,
        grado: unvisitedNeighbors(nr, nc, size, visited).length,
        azar: Math.random(),
      }))
      .sort((a, b) => a.grado - b.grado || a.azar - b.azar);

    for (const cand of candidatos) {
      if (dfs(cand.nr, cand.nc)) return true;
    }

    visited.delete(cellKey(r, c));
    path.pop();
    return false;
  }

  const startR = Math.floor(Math.random() * size);
  const startC = Math.floor(Math.random() * size);
  return dfs(startR, startC) ? path : null;
}

// Camino en serpentina (recorre fila por fila, alternando dirección) — cubre
// cualquier grilla cuadrada garantizado. Se usa como respaldo si la búsqueda
// aleatoria no encuentra nada dentro del límite de pasos, para que generar
// un tablero nunca pueda fallar.
function boustrophedonPath(size: number): Cell[] {
  const path: Cell[] = [];
  const porFilas = Math.random() > 0.5;
  const invertido = Math.random() > 0.5;
  for (let i = 0; i < size; i++) {
    const externo = invertido ? size - 1 - i : i;
    const haciaAdelante = i % 2 === 0;
    for (let j = 0; j < size; j++) {
      const interno = haciaAdelante ? j : size - 1 - j;
      path.push(porFilas ? [externo, interno] : [interno, externo]);
    }
  }
  return path;
}

function generateHamiltonianPath(size: number): Cell[] {
  const maxSteps = size <= 6 ? 8000 : 15000;
  for (let intento = 0; intento < 5; intento++) {
    const path = tryHamiltonianPath(size, maxSteps);
    if (path) return path;
  }
  return boustrophedonPath(size);
}

// Corta el camino completo en `count` tramos contiguos (uno por color), cada
// uno de al menos 2 celdas, repartiendo el resto de celdas al azar entre ellos.
function splitIntoSegments(path: Cell[], count: number): Cell[][] {
  const MIN_LEN = 2;
  const lengths = Array<number>(count).fill(MIN_LEN);
  let restante = path.length - count * MIN_LEN;
  while (restante > 0) {
    lengths[Math.floor(Math.random() * count)]++;
    restante--;
  }
  const segments: Cell[][] = [];
  let offset = 0;
  for (const len of lengths) {
    segments.push(path.slice(offset, offset + len));
    offset += len;
  }
  return segments;
}

const PALETTE = ['#E53935', '#1E88E5', '#FDD835', '#FB8C00', '#43A047', '#8E24AA', '#00ACC1'];

function generatePuzzle(diff: { size: number; pares: number }): Puzzle {
  const path = generateHamiltonianPath(diff.size);
  const segments = splitIntoSegments(path, diff.pares);

  // Mezclar el orden de los tramos para que el color no dependa de la
  // posición espacial en la que se generó.
  for (let i = segments.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [segments[i], segments[j]] = [segments[j], segments[i]];
  }

  const colors = PALETTE.slice(0, diff.pares);
  const dots: Record<string, [Cell, Cell]> = {};
  segments.forEach((seg, i) => {
    const color = colors[i];
    const a = seg[0];
    const b = seg[seg.length - 1];
    dots[color] = Math.random() > 0.5 ? [a, b] : [b, a];
  });

  return { size: diff.size, colors, dots };
}

function otherDot(puzzle: Puzzle, color: string, start: Cell): Cell {
  const [a, b] = puzzle.dots[color];
  return start[0] === a[0] && start[1] === a[1] ? b : a;
}

function isColorConnected(puzzle: Puzzle, color: string, path: Cell[]): boolean {
  if (path.length < 2) return false;
  const target = otherDot(puzzle, color, path[0]);
  const last = path[path.length - 1];
  return last[0] === target[0] && last[1] === target[1];
}

function dirBetween(from: Cell, to: Cell): Direction {
  if (to[0] === from[0] - 1) return 'n';
  if (to[0] === from[0] + 1) return 's';
  if (to[1] === from[1] - 1) return 'w';
  return 'e';
}

// ─── Configuración de dificultad ────────────────────────────────────────────
const DIFFICULTIES = [
  { label: 'Fácil', size: 5, pares: 4 },
  { label: 'Medio', size: 6, pares: 5 },
  { label: 'Difícil', size: 7, pares: 6 },
];

const { width: SCREEN_W } = Dimensions.get('window');
const MIN_CELL = 40;
const MAX_CELL = 72;
const STROKE_RATIO = 0.34;
const BLOB_RATIO = 0.62;

function stubStyle(dir: Direction, size: number, color: string) {
  const stroke = size * STROKE_RATIO;
  const half = size / 2;
  const base = { position: 'absolute' as const, backgroundColor: color };
  switch (dir) {
    case 'n':
      return { ...base, top: 0, left: half - stroke / 2, width: stroke, height: half };
    case 's':
      return { ...base, bottom: 0, left: half - stroke / 2, width: stroke, height: half };
    case 'w':
      return { ...base, left: 0, top: half - stroke / 2, height: stroke, width: half };
    case 'e':
      return { ...base, right: 0, top: half - stroke / 2, height: stroke, width: half };
  }
}

export default function PuntosScreen() {
  const insets = useSafeAreaInsets();
  const [diffIdx, setDiffIdx] = useState(0);
  const [puzzle, setPuzzle] = useState<Puzzle>(() => generatePuzzle(DIFFICULTIES[0]));
  const [paths, setPaths] = useState<Record<string, Cell[]>>({});
  const [won, setWon] = useState(false);
  const { showTutorial, dismissTutorial, reopenTutorial } = useTutorial('puntos');

  const diff = DIFFICULTIES[diffIdx];
  const CELL_SIZE = Math.max(MIN_CELL, Math.min(MAX_CELL, Math.floor((SCREEN_W - 32) / puzzle.size)));
  const GRID_PX = CELL_SIZE * puzzle.size;

  // Refs para leer el estado actual desde el PanResponder sin closures viejas
  // (el gesto se crea una sola vez con useRef, así que nunca puede leer las
  // variables de estado directamente sin arriesgarse a quedarse con datos
  // desactualizados de un tablero anterior).
  const puzzleRef = useRef<Puzzle>(puzzle);
  const pathsRef = useRef<Record<string, Cell[]>>({});
  const wonRef = useRef(false);
  const activeColorRef = useRef<string | null>(null);

  const dotColorAt = useMemo(() => {
    const map: Record<string, string> = {};
    for (const color of puzzle.colors) {
      const [a, b] = puzzle.dots[color];
      map[cellKey(a[0], a[1])] = color;
      map[cellKey(b[0], b[1])] = color;
    }
    return map;
  }, [puzzle]);
  const dotColorAtRef = useRef(dotColorAt);
  dotColorAtRef.current = dotColorAt;

  // CELL_SIZE cambia con la dificultad — el PanResponder de abajo se crea una
  // sola vez (useRef), así que si getCellAt leyera CELL_SIZE directamente
  // quedaría con el valor de la primera dificultad para siempre. Mismo fix
  // que ya se usa en laberinto.tsx para el mismo problema.
  const cellSizeRef = useRef(CELL_SIZE);
  cellSizeRef.current = CELL_SIZE;

  const cellMeta = useMemo(() => {
    const map: Record<string, { color: string; dirs: Direction[] }> = {};
    for (const color of puzzle.colors) {
      const path = paths[color] ?? [];
      path.forEach(([r, c], i) => {
        const dirs: Direction[] = [];
        if (i > 0) dirs.push(dirBetween(path[i], path[i - 1]));
        if (i < path.length - 1) dirs.push(dirBetween(path[i], path[i + 1]));
        map[cellKey(r, c)] = { color, dirs };
      });
    }
    return map;
  }, [paths, puzzle]);

  const grid = useMemo(
    () => Array.from({ length: puzzle.size }, (_, r) => Array.from({ length: puzzle.size }, (_, c) => cellKey(r, c))),
    [puzzle],
  );

  const totalCells = puzzle.size * puzzle.size;
  const filledCount = useMemo(() => Object.values(paths).reduce((sum, p) => sum + p.length, 0), [paths]);
  const connectedCount = useMemo(
    () => puzzle.colors.filter((c) => isColorConnected(puzzle, c, paths[c] ?? [])).length,
    [paths, puzzle],
  );

  // Posición de la grilla en pantalla, medida en el momento del toque (no al
  // montar la pantalla) — así el cálculo de celda sigue siendo correcto aunque
  // el usuario haya scrolleado antes de tocar. Mismo enfoque que sopa.tsx.
  const gridViewRef = useRef<View>(null);
  const gridMeasure = useRef({ x: 0, y: 0 });
  // El dedo tapa el punto que se está tocando, así que el contacto real queda
  // un poco más abajo de donde el usuario apunta visualmente — sin este
  // ajuste, se selecciona la fila de abajo (mismo fix que sopa.tsx).
  const TOUCH_Y_OFFSET = 16;
  const getCellAt = (pageX: number, pageY: number): Cell | null => {
    const size = cellSizeRef.current;
    const col = Math.floor((pageX - gridMeasure.current.x) / size);
    const row = Math.floor((pageY - TOUCH_Y_OFFSET - gridMeasure.current.y) / size);
    if (row >= 0 && row < puzzleRef.current.size && col >= 0 && col < puzzleRef.current.size) return [row, col];
    return null;
  };

  const updatePaths = useCallback((next: Record<string, Cell[]>) => {
    pathsRef.current = next;
    setPaths(next);

    const p = puzzleRef.current;
    const total = p.size * p.size;
    const filled = Object.values(next).reduce((sum, arr) => sum + arr.length, 0);
    const todoConectado = p.colors.every((color) => isColorConnected(p, color, next[color] ?? []));

    if (filled === total && todoConectado) {
      wonRef.current = true;
      setWon(true);
      void registrarPartida('puntos', 'ganado');
    }
  }, []);

  const initGame = useCallback((idx: number) => {
    const d = DIFFICULTIES[idx];
    const nuevo = generatePuzzle(d);
    puzzleRef.current = nuevo;
    pathsRef.current = {};
    activeColorRef.current = null;
    wonRef.current = false;
    setPuzzle(nuevo);
    setPaths({});
    setWon(false);
    setDiffIdx(idx);
  }, []);

  const reiniciar = useCallback(() => {
    pathsRef.current = {};
    activeColorRef.current = null;
    wonRef.current = false;
    setPaths({});
    setWon(false);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (e) => {
        if (wonRef.current) return;
        const { pageX, pageY } = e.nativeEvent;
        // Medir la posición de la grilla recién ahora (no la del onLayout inicial, que
        // queda desactualizada si el usuario scrolleó antes de tocar) — así el cálculo
        // de celda siempre usa la posición real en pantalla en el momento del toque.
        gridViewRef.current?.measureInWindow((x, y) => {
          gridMeasure.current = { x, y };

          const cell = getCellAt(pageX, pageY);
          if (!cell) {
            activeColorRef.current = null;
            return;
          }
          const [r, c] = cell;
          const dotColor = dotColorAtRef.current[cellKey(r, c)];

          if (dotColor) {
            // Tocar un punto de color siempre reinicia ese camino desde ahí,
            // para poder redibujarlo si se equivocó.
            activeColorRef.current = dotColor;
            updatePaths({ ...pathsRef.current, [dotColor]: [[r, c]] });
            return;
          }

          // Si tocó una celda que ya es parte de un camino, lo recorta ahí
          // para poder redibujar solo la cola sin perder todo el camino.
          for (const color of puzzleRef.current.colors) {
            const path = pathsRef.current[color] ?? [];
            const idx = path.findIndex(([pr, pc]) => pr === r && pc === c);
            if (idx >= 0) {
              activeColorRef.current = color;
              updatePaths({ ...pathsRef.current, [color]: path.slice(0, idx + 1) });
              return;
            }
          }

          activeColorRef.current = null;
        });
      },

      onPanResponderMove: (e) => {
        if (wonRef.current) return;
        const color = activeColorRef.current;
        if (!color) return;

        const cell = getCellAt(e.nativeEvent.pageX, e.nativeEvent.pageY);
        if (!cell) return;
        const [r, c] = cell;

        const path = pathsRef.current[color] ?? [];
        if (path.length === 0) return;
        const last = path[path.length - 1];
        if (last[0] === r && last[1] === c) return;

        // Volver atrás: si el dedo vuelve a pisar la celda anterior, deshace
        // el último paso — permite corregir sin soltar el dedo.
        if (path.length >= 2) {
          const prev = path[path.length - 2];
          if (prev[0] === r && prev[1] === c) {
            updatePaths({ ...pathsRef.current, [color]: path.slice(0, -1) });
            return;
          }
        }

        if (isColorConnected(puzzleRef.current, color, path)) return; // ya conectado, no sigue

        const dr = Math.abs(r - last[0]);
        const dc = Math.abs(c - last[1]);
        const esAdyacente = (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
        if (!esAdyacente) return;

        if (path.some(([pr, pc]) => pr === r && pc === c)) return; // no repetir celda propia

        const dotColorAqui = dotColorAtRef.current[cellKey(r, c)];
        if (dotColorAqui && dotColorAqui !== color) return; // no se puede pisar el punto de otro color

        if (!dotColorAqui) {
          const ocupadaPor = Object.keys(pathsRef.current).find(
            (otro) => otro !== color && (pathsRef.current[otro] ?? []).some(([pr, pc]) => pr === r && pc === c),
          );
          if (ocupadaPor) return; // no se puede pasar por encima de otro color
        }

        updatePaths({ ...pathsRef.current, [color]: [...path, [r, c]] });
      },

      onPanResponderRelease: () => {
        activeColorRef.current = null;
      },
    }),
  ).current;

  const faltanCasilleros = connectedCount === puzzle.colors.length && filledCount < totalCells;

  return (
    <View style={styles.container}>
      <AppHeader title="Une los Puntos" showBack />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Dificultad + progreso */}
        <View style={[styles.topBar, { width: GRID_PX }]}>
          <View style={styles.diffRow}>
            {DIFFICULTIES.map((d, i) => (
              <TouchableOpacity
                key={d.label}
                style={[styles.diffBtn, diffIdx === i && styles.diffBtnActive]}
                onPress={() => initGame(i)}
                accessibilityRole="button"
                accessibilityLabel={d.label}
                accessibilityState={{ selected: diffIdx === i }}
              >
                <Text style={[styles.diffBtnText, diffIdx === i && styles.diffBtnTextActive]} maxFontSizeMultiplier={1.3}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.progressText} maxFontSizeMultiplier={1.3}>
            Conectados: <Text style={styles.progressBold} maxFontSizeMultiplier={1.3}>{connectedCount}/{puzzle.colors.length}</Text>
          </Text>
        </View>

        {/* Grilla */}
        <View
          ref={gridViewRef}
          style={[styles.grid, { width: GRID_PX, height: GRID_PX }]}
          {...panResponder.panHandlers}
        >
          {grid.map((row, r) => (
            <View key={r} style={styles.gridRow}>
              {row.map((_, c) => {
                const info = cellMeta[cellKey(r, c)];
                const dotColor = dotColorAt[cellKey(r, c)];
                const color = info?.color ?? dotColor;
                return (
                  <View key={c} style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}>
                    {info?.dirs.map((dir) => (
                      <View key={dir} style={stubStyle(dir, CELL_SIZE, info.color)} />
                    ))}
                    {color && (
                      <View
                        style={[
                          styles.blob,
                          {
                            width: CELL_SIZE * BLOB_RATIO,
                            height: CELL_SIZE * BLOB_RATIO,
                            borderRadius: (CELL_SIZE * BLOB_RATIO) / 2,
                            backgroundColor: color,
                          },
                        ]}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {faltanCasilleros && (
          <Text style={styles.hintText} maxFontSizeMultiplier={1.3}>
            👆 Ya conectaste todos los colores, pero quedan casilleros vacíos. Extendé algún camino para cubrirlos todos.
          </Text>
        )}

        {/* Chips de color */}
        <View style={styles.chipsRow}>
          {puzzle.colors.map((color) => {
            const conectado = isColorConnected(puzzle, color, paths[color] ?? []);
            return (
              <View key={color} style={[styles.chip, { backgroundColor: color }]}>
                {conectado && <Text style={styles.chipCheck}>✓</Text>}
              </View>
            );
          })}
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.newBtn} onPress={() => initGame(diffIdx)} accessibilityRole="button" accessibilityLabel="Nuevo tablero">
            <Text style={styles.newBtnText}>🔄 Nuevo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetBtn} onPress={reiniciar} accessibilityRole="button" accessibilityLabel="Reiniciar tablero actual">
            <Text style={styles.resetBtnText}>↩️ Reiniciar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.helpBtn} onPress={reopenTutorial} accessibilityRole="button" accessibilityLabel="¿Cómo se juega?">
            <Text style={styles.helpBtnText}>¿Cómo se juega?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Tutorial */}
      <Modal visible={showTutorial} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>🔵</Text>
            <Text style={styles.modalTitle}>¿Cómo se juega?</Text>
            <View style={styles.speakRowWrapper}>
              <SpeakRow texto="Tocá un punto de color y arrastrá el dedo hasta el otro punto del mismo color para dibujar el camino entre ellos. Los caminos de distinto color no se pueden cruzar. Para ganar tenés que cubrir todos los casilleros de la grilla, no alcanza con solo unir los puntos. Si te equivocás, tocá el punto de nuevo para redibujar ese camino." />
            </View>
            <View style={styles.tutorialList}>
              <Text style={styles.tutorialItem} maxFontSizeMultiplier={1.3}>👆 Arrastrá el dedo entre dos puntos del mismo color</Text>
              <Text style={styles.tutorialItem} maxFontSizeMultiplier={1.3}>🚫 Los caminos de distinto color no se pueden cruzar</Text>
              <Text style={styles.tutorialItem} maxFontSizeMultiplier={1.3}>🟩 Hay que cubrir TODOS los casilleros, no solo unir los puntos</Text>
              <Text style={styles.tutorialItem} maxFontSizeMultiplier={1.3}>↩️ Si te equivocás, tocá el punto de nuevo para redibujar</Text>
            </View>
            <TouchableOpacity style={styles.modalBtn} onPress={dismissTutorial}>
              <Text style={styles.modalBtnText}>¡Entendido, a jugar!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal victoria */}
      <Modal visible={won} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>🎉</Text>
            <Text style={styles.modalTitle}>¡Completaste el tablero!</Text>
            <Text style={styles.modalSub}>
              Uniste los {puzzle.colors.length} colores en dificultad <Text style={{ fontWeight: 'bold' }}>{diff.label}</Text>.
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => initGame(diffIdx)}>
              <Text style={styles.modalBtnText}>Jugar de nuevo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },

  topBar: { gap: Spacing.sm },
  diffRow: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  diffBtn: {
    flex: 1,
    borderWidth: 2, borderColor: Colors.border, borderRadius: Radius.full,
    paddingVertical: Spacing.sm, alignItems: 'center', backgroundColor: Colors.white,
  },
  diffBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  diffBtnText: { fontSize: FontSizes.md, color: Colors.textSecondary, fontWeight: '700' },
  diffBtnTextActive: { color: Colors.white },
  progressText: { fontSize: FontSizes.lg, color: Colors.textSecondary, textAlign: 'center' },
  progressBold: { fontWeight: 'bold', color: Colors.textPrimary, fontSize: FontSizes.xl },

  grid: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  gridRow: { flexDirection: 'row' },
  cell: {
    borderWidth: 0.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  blob: { position: 'absolute' },

  hintText: {
    fontSize: FontSizes.sm, color: Colors.textSecondary, textAlign: 'center',
    lineHeight: 20, paddingHorizontal: Spacing.md,
  },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' },
  chip: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#00000022',
  },
  chipCheck: { color: Colors.white, fontWeight: 'bold', fontSize: FontSizes.md },

  btnRow: { flexDirection: 'row', gap: Spacing.sm, width: '100%', flexWrap: 'wrap' },
  newBtn: {
    flex: 1, minWidth: 100, backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: Spacing.md, alignItems: 'center',
  },
  newBtnText: { color: Colors.white, fontSize: FontSizes.md, fontWeight: 'bold' },
  resetBtn: {
    flex: 1, minWidth: 100, borderWidth: 2, borderColor: Colors.border, borderRadius: Radius.md,
    paddingVertical: Spacing.md, alignItems: 'center', backgroundColor: Colors.white,
  },
  resetBtnText: { color: Colors.textPrimary, fontSize: FontSizes.md, fontWeight: 'bold' },
  helpBtn: {
    flex: 1, minWidth: 140, borderWidth: 2, borderColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: Spacing.md, alignItems: 'center', backgroundColor: Colors.white,
  },
  helpBtnText: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: '#00000066', alignItems: 'center', justifyContent: 'center' },
  modalBox: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.xxl, width: '85%', alignItems: 'center' },
  modalIcon: { fontSize: 64, marginBottom: Spacing.md },
  modalTitle: { fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: Spacing.sm, textAlign: 'center' },
  speakRowWrapper: { flexDirection: 'row', justifyContent: 'center', width: '100%', marginBottom: Spacing.md },
  modalSub: { fontSize: FontSizes.lg, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 26 },
  tutorialList: { width: '100%', gap: Spacing.sm, marginBottom: Spacing.xl },
  tutorialItem: { fontSize: FontSizes.lg, color: Colors.textPrimary, lineHeight: 28 },
  modalBtn: { backgroundColor: Colors.primary, borderRadius: Radius.sm, paddingVertical: Spacing.md, width: '100%', alignItems: 'center' },
  modalBtnText: { color: Colors.white, fontSize: FontSizes.xl, fontWeight: 'bold' },
});
