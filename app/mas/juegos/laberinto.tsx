import AppHeader from '@/components/ui/AppHeader';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';
import { useTutorial } from '@/hooks/useTutorial';
import React, { useCallback, useRef, useState } from 'react';
import {
  Modal, PanResponder,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Generador de laberinto (DFS recursivo) ───────────────────────────────────
type Direction = 'n' | 's' | 'e' | 'w';

interface Cell {
  n: boolean;
  s: boolean;
  e: boolean;
  w: boolean;
  visited: boolean;
}

function generateMaze(rows: number, cols: number): Cell[][] {
  const maze: Cell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ n: true, s: true, e: true, w: true, visited: false }))
  );
  const stack: [number, number][] = [[0, 0]];
  maze[0][0].visited = true;

  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1];
    const neighbors: [number, number, Direction, Direction][] = [];
    if (r > 0 && !maze[r - 1][c].visited) neighbors.push([r - 1, c, 'n', 's']);
    if (r < rows - 1 && !maze[r + 1][c].visited) neighbors.push([r + 1, c, 's', 'n']);
    if (c > 0 && !maze[r][c - 1].visited) neighbors.push([r, c - 1, 'w', 'e']);
    if (c < cols - 1 && !maze[r][c + 1].visited) neighbors.push([r, c + 1, 'e', 'w']);

    if (neighbors.length === 0) { stack.pop(); continue; }

    const [nr, nc, d1, d2] = neighbors[Math.floor(Math.random() * neighbors.length)];
    maze[r][c][d1] = false;
    maze[nr][nc][d2] = false;
    maze[nr][nc].visited = true;
    stack.push([nr, nc]);
  }
  return maze;
}

const DIFFICULTIES = [
  { label: 'Fácil',   rows: 7,  cols: 7  },
  { label: 'Normal',  rows: 10, cols: 10 },
  { label: 'Difícil', rows: 13, cols: 13 },
];

export default function LaberintoScreen() {
  const insets = useSafeAreaInsets();
  const [diffIdx, setDiffIdx] = useState(0);
  const [maze, setMaze] = useState<Cell[][]>(() => generateMaze(7, 7));
  const [pos, setPos] = useState<[number, number]>([0, 0]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const { showTutorial, dismissTutorial, reopenTutorial } = useTutorial('laberinto');

  const diff = DIFFICULTIES[diffIdx];
  const CELL_SIZE = Math.min(36, Math.floor(300 / diff.cols));

  // Refs para acceder al estado actual desde el PanResponder sin closures stale
  const posRef      = useRef(pos);
  const mazeRef     = useRef(maze);
  const wonRef      = useRef(won);
  const diffRef     = useRef(diff);
  const cellSizeRef = useRef(CELL_SIZE);
  posRef.current      = pos;
  mazeRef.current     = maze;
  wonRef.current      = won;
  diffRef.current     = diff;
  cellSizeRef.current = CELL_SIZE;

  const initGame = useCallback((idx: number) => {
    const d = DIFFICULTIES[idx];
    setMaze(generateMaze(d.rows, d.cols));
    setPos([0, 0]);
    setMoves(0);
    setWon(false);
    setDiffIdx(idx);
  }, []);

  const handleMove = (dr: number, dc: number) => {
    if (wonRef.current) return;
    const [r, c] = posRef.current;
    const cell = mazeRef.current[r][c];
    if (dr === -1 && cell.n) return;
    if (dr === 1  && cell.s) return;
    if (dc === -1 && cell.w) return;
    if (dc === 1  && cell.e) return;
    const nr = r + dr;
    const nc = c + dc;
    const next: [number, number] = [nr, nc];
    posRef.current = next;
    setPos(next);
    setMoves(m => m + 1);
    if (nr === diffRef.current.rows - 1 && nc === diffRef.current.cols - 1) setWon(true);
  };

  // Arrastre continuo: el personaje sigue el dedo celda a celda
  const dragAccum   = useRef({ x: 0, y: 0 });
  const prevGesture = useRef({ x: 0, y: 0 });
  const dragAxis    = useRef<'h' | 'v' | null>(null); // eje bloqueado para este gesto

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => {
        dragAccum.current   = { x: 0, y: 0 };
        prevGesture.current = { x: 0, y: 0 };
        dragAxis.current    = null;
      },
      onPanResponderMove: (_, gs) => {
        // Delta incremental desde el último evento
        const dx = gs.dx - prevGesture.current.x;
        const dy = gs.dy - prevGesture.current.y;
        prevGesture.current = { x: gs.dx, y: gs.dy };

        dragAccum.current.x += dx;
        dragAccum.current.y += dy;

        const ax = Math.abs(dragAccum.current.x);
        const ay = Math.abs(dragAccum.current.y);

        // Detectar eje dominante al inicio del arrastre
        if (!dragAxis.current) {
          if (ax > 10 || ay > 10) {
            dragAxis.current = ax >= ay ? 'h' : 'v';
          }
          return;
        }

        const step = cellSizeRef.current;

        if (dragAxis.current === 'h' && ax >= step) {
          const steps = Math.floor(ax / step);
          const dir   = dragAccum.current.x > 0 ? 1 : -1;
          for (let i = 0; i < steps; i++) handleMove(0, dir);
          // Conservar el resto para que el siguiente paso fluya sin parar
          dragAccum.current.x = (ax - steps * step) * dir;
        } else if (dragAxis.current === 'v' && ay >= step) {
          const steps = Math.floor(ay / step);
          const dir   = dragAccum.current.y > 0 ? 1 : -1;
          for (let i = 0; i < steps; i++) handleMove(dir, 0);
          dragAccum.current.y = (ay - steps * step) * dir;
        }
      },
      onPanResponderRelease: () => {
        dragAxis.current = null;
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      <AppHeader title="Laberinto" showBack />

      <View style={styles.topBar}>
        <View style={styles.diffRow}>
          {DIFFICULTIES.map((d, i) => (
            <TouchableOpacity
              key={d.label}
              style={[styles.diffBtn, diffIdx === i && styles.diffBtnActive]}
              onPress={() => initGame(i)}
            >
              <Text style={[styles.diffBtnText, diffIdx === i && styles.diffBtnTextActive]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Info: movimientos + leyenda */}
        <View style={styles.infoRow}>
          <Text style={styles.statText}>
            Movimientos: <Text style={{ fontWeight: 'bold', color: Colors.primary }}>{moves}</Text>
          </Text>
          <View style={styles.legend}>
            <Text style={styles.legendItem}>⭐ Inicio</Text>
            <Text style={styles.legendItem}>🚪 Salida</Text>
            <Text style={styles.legendItem}>🧑 Vos</Text>
          </View>
        </View>

        {/* Botones */}
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.newBtn} onPress={() => initGame(diffIdx)}>
            <Text style={styles.newBtnText}>🔄 Nuevo juego</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.helpBtn} onPress={reopenTutorial}>
            <Text style={styles.helpBtnText}>¿Cómo se juega?</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Laberinto con PanResponder para deslizar */}
      <View style={styles.mazeArea} {...panResponder.panHandlers}>
        <View style={[styles.maze, { width: CELL_SIZE * diff.cols + 2 }]}>
          {maze.map((row, r) => (
            <View key={r} style={styles.mazeRow}>
              {row.map((cell, c) => {
                const isPlayer = pos[0] === r && pos[1] === c;
                const isStart  = r === 0 && c === 0;
                const isEnd    = r === diff.rows - 1 && c === diff.cols - 1;
                return (
                  <View
                    key={c}
                    style={[
                      styles.mazeCell,
                      { width: CELL_SIZE, height: CELL_SIZE },
                      cell.n && styles.wallN,
                      cell.s && styles.wallS,
                      cell.e && styles.wallE,
                      cell.w && styles.wallW,
                      isEnd && styles.endCell,
                    ]}
                  >
                    {isPlayer
                      ? <Text style={{ fontSize: CELL_SIZE * 0.6 }}>🧑</Text>
                      : isEnd
                        ? <Text style={{ fontSize: CELL_SIZE * 0.6 }}>🚪</Text>
                        : isStart
                          ? <Text style={{ fontSize: CELL_SIZE * 0.5 }}>⭐</Text>
                          : null}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
        <Text style={styles.swipeHint}>👆 Arrastrá el dedo sobre el laberinto{'\n'}o usá las flechas de abajo para moverte</Text>
      </View>

      {/* Controles fijos abajo */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={styles.arrowBtn} onPress={() => handleMove(-1, 0)} accessibilityLabel="Arriba">
          <Text style={styles.arrowText}>▲</Text>
        </TouchableOpacity>
        <View style={styles.arrowMiddle}>
          <TouchableOpacity style={styles.arrowBtn} onPress={() => handleMove(0, -1)} accessibilityLabel="Izquierda">
            <Text style={styles.arrowText}>◀</Text>
          </TouchableOpacity>
          <View style={styles.arrowCenter} />
          <TouchableOpacity style={styles.arrowBtn} onPress={() => handleMove(0, 1)} accessibilityLabel="Derecha">
            <Text style={styles.arrowText}>▶</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.arrowBtn} onPress={() => handleMove(1, 0)} accessibilityLabel="Abajo">
          <Text style={styles.arrowText}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* Tutorial */}
      <Modal visible={showTutorial} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>🌀</Text>
            <Text style={styles.modalTitle}>¿Cómo se juega?</Text>
            <View style={styles.tutorialList}>
              <Text style={styles.tutorialItem}>⭐ Empezás en la esquina superior izquierda</Text>
              <Text style={styles.tutorialItem}>🚪 Tenés que llegar a la puerta en la esquina inferior derecha</Text>
              <Text style={styles.tutorialItem}>👆 Arrastrá el dedo sobre el laberinto y el personaje te sigue</Text>
              <Text style={styles.tutorialItem}>▲▼◀▶ O usá las flechas de abajo para moverte de a un paso</Text>
              <Text style={styles.tutorialItem}>🔄 Podés cambiar la dificultad cuando quieras</Text>
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
            <Text style={styles.modalTitle}>¡Saliste!</Text>
            <Text style={styles.modalSub}>Llegaste a la salida en {moves} movimientos.</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => initGame(diffIdx)}>
              <Text style={styles.modalBtnText}>Jugar de nuevo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const WALL = 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: { padding: Spacing.md, gap: Spacing.sm },
  diffRow: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  diffBtn: {
    borderWidth: 2, borderColor: Colors.border, borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, backgroundColor: Colors.white,
  },
  diffBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  diffBtnText: { fontSize: FontSizes.md, color: Colors.textSecondary, fontWeight: '700' },
  diffBtnTextActive: { color: Colors.white },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statText: { fontSize: FontSizes.md, color: Colors.textSecondary },
  legend: { flexDirection: 'row', gap: Spacing.sm },
  legendItem: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  btnRow: { flexDirection: 'row', gap: Spacing.sm },
  newBtn: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: Spacing.md, alignItems: 'center',
  },
  newBtnText: { color: Colors.white, fontSize: FontSizes.md, fontWeight: 'bold' },
  helpBtn: {
    flex: 1, borderWidth: 2, borderColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: Spacing.md, alignItems: 'center', backgroundColor: Colors.white,
  },
  helpBtnText: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: 'bold' },
  mazeArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  maze: { borderWidth: 1, borderColor: Colors.textPrimary },
  mazeRow: { flexDirection: 'row' },
  mazeCell: { backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  wallN: { borderTopWidth: WALL, borderTopColor: Colors.textPrimary },
  wallS: { borderBottomWidth: WALL, borderBottomColor: Colors.textPrimary },
  wallE: { borderRightWidth: WALL, borderRightColor: Colors.textPrimary },
  wallW: { borderLeftWidth: WALL, borderLeftColor: Colors.textPrimary },
  endCell: { backgroundColor: '#E8F5E9' },
  controls: { alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.sm },
  arrowMiddle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  arrowCenter: { width: 60, height: 60 },
  arrowBtn: {
    width: 70, height: 70, borderRadius: Radius.md,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 3, elevation: 3,
  },
  arrowText: { color: Colors.white, fontSize: 28, fontWeight: 'bold' },
  swipeHint: { fontSize: FontSizes.lg, color: Colors.textSecondary, textAlign: 'center', lineHeight: 28 },
  modalOverlay: { flex: 1, backgroundColor: '#00000066', alignItems: 'center', justifyContent: 'center' },
  modalBox: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.xxl, width: '85%', alignItems: 'center' },
  modalIcon: { fontSize: 64, marginBottom: Spacing.md },
  modalTitle: { fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: Spacing.md },
  modalSub: { fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl },
  tutorialList: { width: '100%', gap: Spacing.sm, marginBottom: Spacing.xl },
  tutorialItem: { fontSize: FontSizes.lg, color: Colors.textPrimary, lineHeight: 28 },
  modalBtn: { backgroundColor: Colors.primary, borderRadius: Radius.sm, paddingVertical: Spacing.md, width: '100%', alignItems: 'center' },
  modalBtnText: { color: Colors.white, fontSize: FontSizes.xl, fontWeight: 'bold' },
});
