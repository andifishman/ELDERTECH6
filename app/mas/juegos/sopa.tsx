import AppHeader from '@/components/ui/AppHeader';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';
import { useTutorial } from '@/hooks/useTutorial';
import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GRID_SIZE = 9;
const { width: SCREEN_W } = Dimensions.get('window');
const CELL_SIZE = Math.max(34, Math.min(Math.floor((SCREEN_W - 32) / GRID_SIZE), 42));
const GRID_PX = CELL_SIZE * GRID_SIZE;

const WORD_SETS = [
  { theme: 'Frutas 🍎',    words: ['PERA', 'UVA', 'LIMON', 'MANGO', 'FRESA', 'BANANA'] },
  { theme: 'Animales 🐾',  words: ['PERRO', 'GATO', 'PATO', 'OSO', 'LOBO', 'TIGRE'] },
  { theme: 'Colores 🎨',   words: ['ROJO', 'AZUL', 'VERDE', 'ROSA', 'GRIS', 'NEGRO'] },
  { theme: 'Familia 👨‍👩‍👧', words: ['MAMA', 'PAPA', 'HIJO', 'NIETO', 'TIO', 'PRIMA'] },
  { theme: 'Naturaleza 🌿',words: ['SOL', 'LUNA', 'NUBE', 'RIO', 'MAR', 'ARBOL'] },
  { theme: 'Casa 🏠',       words: ['MESA', 'SILLA', 'CAMA', 'PUERTA', 'COCINA', 'SALON'] },
  { theme: 'Ropa 👗',       words: ['GORRO', 'BUFANDA', 'CAMISA', 'FALDA', 'ZAPATOS', 'CORBATA'] },
  { theme: 'Paises 🌍',     words: ['BRASIL', 'CHILE', 'PERU', 'CUBA', 'MEXICO', 'INDIA'] },
];

interface WordPlacement {
  word: string;
  cells: [number, number][];
}

type Grid = string[][];

function generateGrid(words: string[]): { grid: Grid; placements: WordPlacement[] } {
  const cells: string[][] = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill('')
  );
  const placements: WordPlacement[] = [];
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  for (const word of words) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 300) {
      const horizontal = Math.random() > 0.5;
      const r = Math.floor(Math.random() * GRID_SIZE);
      const c = Math.floor(Math.random() * GRID_SIZE);

      if (horizontal) {
        if (c + word.length > GRID_SIZE) { attempts++; continue; }
        const fits = word.split('').every((ch, i) =>
          cells[r][c + i] === '' || cells[r][c + i] === ch
        );
        if (fits) {
          const wCells: [number, number][] = [];
          word.split('').forEach((ch, i) => {
            cells[r][c + i] = ch;
            wCells.push([r, c + i]);
          });
          placements.push({ word, cells: wCells });
          placed = true;
        }
      } else {
        if (r + word.length > GRID_SIZE) { attempts++; continue; }
        const fits = word.split('').every((ch, i) =>
          cells[r + i][c] === '' || cells[r + i][c] === ch
        );
        if (fits) {
          const wCells: [number, number][] = [];
          word.split('').forEach((ch, i) => {
            cells[r + i][c] = ch;
            wCells.push([r + i, c]);
          });
          placements.push({ word, cells: wCells });
          placed = true;
        }
      }
      attempts++;
    }
  }

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (cells[r][c] === '') {
        cells[r][c] = LETTERS[Math.floor(Math.random() * LETTERS.length)];
      }
    }
  }

  return { grid: cells, placements };
}

export default function SopaScreen() {
  const insets = useSafeAreaInsets();
  const [grid, setGrid] = useState<Grid>([]);
  const [placements, setPlacements] = useState<WordPlacement[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [selCells, setSelCells] = useState<[number, number][]>([]);
  const [won, setWon] = useState(false);
  const [hintCell, setHintCell] = useState<[number, number] | null>(null);
  const [hintWord, setHintWord] = useState<string | null>(null);
  const { showTutorial, dismissTutorial, reopenTutorial } = useTutorial('sopa');
  const [currentTheme, setCurrentTheme] = useState('');

  // Refs for PanResponder (avoid stale closures)
  const gameRef = useRef<{ grid: Grid; placements: WordPlacement[]; foundWords: string[] }>(
    { grid: [], placements: [], foundWords: [] }
  );
  const selCellsRef = useRef<[number, number][]>([]);
  const wonRef = useRef(false);
  const hintWordRef = useRef<string | null>(null);

  // Grid position measurement for coordinate → cell conversion
  const gridViewRef = useRef<View>(null);
  const gridMeasure = useRef({ x: 0, y: 0 });
  const measureGrid = () => {
    setTimeout(() => {
      gridViewRef.current?.measureInWindow((x, y) => {
        gridMeasure.current = { x, y };
      });
    }, 100);
  };
  const getCellAt = (pageX: number, pageY: number): [number, number] | null => {
    const col = Math.floor((pageX - gridMeasure.current.x) / CELL_SIZE);
    const row = Math.floor((pageY - gridMeasure.current.y) / CELL_SIZE);
    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) return [row, col];
    return null;
  };

  // Drag tracking refs
  const dragStartCell = useRef<[number, number] | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastDragKey = useRef<string | null>(null);

  // Sync state to refs
  const updateSel = (cells: [number, number][]) => {
    selCellsRef.current = cells;
    setSelCells(cells);
  };
  const updateWon = (val: boolean) => {
    wonRef.current = val;
    setWon(val);
  };
  const updateHint = (word: string | null, cell: [number, number] | null) => {
    hintWordRef.current = word;
    setHintWord(word);
    setHintCell(cell);
  };

  // Try adding a cell to selection and auto-confirm if word matches
  const tryAddCell = (r: number, c: number, current: [number, number][]) => {
    if (current.some(([sr, sc]) => sr === r && sc === c)) return current;
    const next = [...current, [r, c]];

    const cellKey = (row: number, col: number) => `${row},${col}`;
    const keys = new Set(next.map(([row, col]) => cellKey(row, col)));
    const { placements: ps, foundWords: fw } = gameRef.current;

    const match = ps.find(p =>
      !fw.includes(p.word) &&
      p.cells.length === next.length &&
      p.cells.every(([row, col]) => keys.has(cellKey(row, col)))
    );

    if (match) {
      const newFound = [...fw, match.word];
      gameRef.current.foundWords = newFound;
      setFoundWords(newFound);
      updateSel([]);
      if (hintWordRef.current === match.word) updateHint(null, null);
      if (newFound.length === ps.length) updateWon(true);
      return [];
    }

    updateSel(next);
    return next;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (e) => {
        if (wonRef.current) return;
        dragStartCell.current = getCellAt(e.nativeEvent.pageX, e.nativeEvent.pageY);
        dragStartPos.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
        isDragging.current = false;
        lastDragKey.current = null;
      },

      onPanResponderMove: (e) => {
        if (wonRef.current) return;
        const dx = Math.abs(e.nativeEvent.pageX - dragStartPos.current.x);
        const dy = Math.abs(e.nativeEvent.pageY - dragStartPos.current.y);

        // Activate drag after minimal movement
        if (!isDragging.current && (dx > CELL_SIZE * 0.3 || dy > CELL_SIZE * 0.3)) {
          isDragging.current = true;
          // Start fresh drag selection from the start cell
          if (dragStartCell.current) {
            const [r, c] = dragStartCell.current;
            lastDragKey.current = `${r},${c}`;
            selCellsRef.current = tryAddCell(r, c, []);
          }
        }

        if (!isDragging.current) return;
        const cell = getCellAt(e.nativeEvent.pageX, e.nativeEvent.pageY);
        if (!cell) return;
        const [r, c] = cell;
        const key = `${r},${c}`;
        if (key !== lastDragKey.current) {
          lastDragKey.current = key;
          selCellsRef.current = tryAddCell(r, c, selCellsRef.current);
        }
      },

      onPanResponderRelease: (e) => {
        if (wonRef.current) return;
        if (!isDragging.current && dragStartCell.current) {
          // Tap: toggle the cell
          const [r, c] = dragStartCell.current;
          const current = selCellsRef.current;
          const idx = current.findIndex(([sr, sc]) => sr === r && sc === c);
          if (idx >= 0) {
            const next = current.filter((_, i) => i !== idx);
            updateSel(next);
          } else {
            tryAddCell(r, c, current);
          }
        }
        isDragging.current = false;
        dragStartCell.current = null;
      },
    })
  ).current;

  const handleHint = () => {
    const { placements: ps, foundWords: fw } = gameRef.current;
    const unfound = ps.filter(p => !fw.includes(p.word));
    if (unfound.length === 0) return;
    const target = unfound[Math.floor(Math.random() * unfound.length)];
    const cell = target.cells[Math.floor(Math.random() * target.cells.length)];
    updateHint(target.word, cell);
  };

  const initGame = useCallback(() => {
    const setIdx = Math.floor(Math.random() * WORD_SETS.length);
    const wordSet = WORD_SETS[setIdx];
    const { grid: g, placements: ps } = generateGrid(wordSet.words);
    gameRef.current = { grid: g, placements: ps, foundWords: [] };
    setGrid(g);
    setPlacements(ps);
    setFoundWords([]);
    updateWon(false);
    setCurrentTheme(wordSet.theme);
    updateSel([]);
    updateHint(null, null);
  }, []);

  React.useEffect(() => { initGame(); }, []);

  const isCellSelected = (r: number, c: number) =>
    selCells.some(([sr, sc]) => sr === r && sc === c);

  const getFoundColor = (r: number, c: number): string | null => {
    const FOUND_COLORS = [
      '#C8E6C9', '#BBDEFB', '#F8BBD0', '#FFF9C4',
      '#E1BEE7', '#FFE0B2', '#B2EBF2',
    ];
    for (let i = 0; i < placements.length; i++) {
      const p = placements[i];
      if (foundWords.includes(p.word) && p.cells.some(([wr, wc]) => wr === r && wc === c)) {
        return FOUND_COLORS[i % FOUND_COLORS.length];
      }
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Sopa de Letras" showBack />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Progreso */}
        <View style={[styles.progressRow, { width: GRID_PX }]}>
          <Text style={styles.progressText}>
            Palabras: <Text style={styles.progressBold}>{foundWords.length}/{placements.length}</Text>
          </Text>
          <View style={styles.progressActions}>
            <TouchableOpacity style={styles.helpBtn} onPress={reopenTutorial}>
              <Text style={styles.helpBtnText}>¿Cómo se juega?</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.newBtn} onPress={initGame}>
              <Text style={styles.newBtnText}>🔄 Nueva</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.hintBtn} onPress={handleHint}>
            <Text style={styles.hintBtnText}>💡 Pedir pista</Text>
          </TouchableOpacity>
        </View>

        {/* Grilla */}
        <View
          ref={gridViewRef}
          onLayout={measureGrid}
          style={[styles.grid, { width: GRID_PX }]}
          {...panResponder.panHandlers}
        >
          {grid.map((row, r) => (
            <View key={r} style={styles.gridRow}>
              {row.map((letter, c) => {
                const foundColor = getFoundColor(r, c);
                const selected = isCellSelected(r, c);
                const isHint = !foundColor && !selected &&
                  hintCell && hintCell[0] === r && hintCell[1] === c;
                return (
                  <View
                    key={c}
                    style={[
                      styles.cell,
                      { width: CELL_SIZE, height: CELL_SIZE },
                      foundColor ? { backgroundColor: foundColor } : undefined,
                      isHint && styles.cellHint,
                      selected && styles.cellSelected,
                    ]}
                  >
                    <Text style={[
                      styles.cellText,
                      { fontSize: CELL_SIZE * 0.45 },
                      (selected || isHint) && styles.cellTextSelected,
                    ]}>
                      {letter}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Lista de palabras */}
        <View style={styles.wordList}>
          {placements.map((p) => {
            const isFound = foundWords.includes(p.word);
            const isHinted = !isFound && p.word === hintWord;
            return (
              <View
                key={p.word}
                style={[
                  styles.wordBadge,
                  isFound && styles.wordBadgeFound,
                  isHinted && styles.wordBadgeHint,
                ]}
              >
                <Text style={[
                  styles.wordBadgeText,
                  isFound && styles.wordBadgeTextFound,
                  isHinted && styles.wordBadgeTextHint,
                ]}>
                  {isFound ? '✓ ' : isHinted ? '💡 ' : ''}{p.word}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Tutorial */}
      <Modal visible={showTutorial} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>🔤</Text>
            <Text style={styles.modalTitle}>¿Cómo se juega?</Text>
            <Text style={styles.modalSub}>
              Hay palabras escondidas en la grilla de letras.{'\n\n'}
              Arrastrá el dedo sobre las letras, o tocá cada letra por separado (en cualquier orden).{'\n\n'}
              Cuando seleccionás todas las letras correctas, se marca sola automáticamente.{'\n\n'}
              Las palabras que tenés que encontrar aparecen abajo de la grilla.
            </Text>
            <TouchableOpacity style={styles.modalBtnPrimary} onPress={dismissTutorial}>
              <Text style={styles.modalBtnPrimaryText}>¡Entendido, a jugar!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal victoria */}
      <Modal visible={won} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>🎉</Text>
            <Text style={styles.modalTitle}>¡Encontraste todo!</Text>
            <Text style={styles.modalSub}>
              Excelente trabajo. Encontraste todas las palabras de <Text style={{ fontWeight: 'bold' }}>{currentTheme}</Text>.
            </Text>
            <TouchableOpacity style={styles.modalBtnPrimary} onPress={initGame}>
              <Text style={styles.modalBtnPrimaryText}>Nueva sopa</Text>
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

  progressRow: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  progressText: { fontSize: FontSizes.xl, color: Colors.textSecondary, textAlign: 'center' },
  progressBold: { fontWeight: 'bold', color: Colors.textPrimary, fontSize: FontSizes.xxl },
  progressActions: { flexDirection: 'row', gap: Spacing.sm, width: '100%' },
  helpBtn: {
    flex: 1,
    borderWidth: 2, borderColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: Spacing.md, alignItems: 'center',
    backgroundColor: Colors.white,
  },
  helpBtnText: { color: Colors.primary, fontSize: FontSizes.lg, fontWeight: 'bold' },
  newBtn: {
    flex: 1,
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: Spacing.md, alignItems: 'center',
  },
  newBtnText: { color: Colors.white, fontSize: FontSizes.lg, fontWeight: 'bold' },
  hintBtn: {
    width: '100%',
    borderWidth: 2, borderColor: '#FF9800', borderRadius: Radius.md,
    paddingVertical: Spacing.md, alignItems: 'center',
    backgroundColor: '#FFF3E0',
  },
  hintBtnText: { color: '#E65100', fontSize: FontSizes.lg, fontWeight: 'bold' },

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
    backgroundColor: Colors.white,
  },
  cellSelected: { backgroundColor: Colors.primary },
  cellHint: { backgroundColor: '#FF9800' },
  cellText: { fontWeight: '700', color: Colors.textPrimary },
  cellTextSelected: { color: Colors.white },

  wordList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
  },
  wordBadge: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  wordBadgeFound: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success,
  },
  wordBadgeHint: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  wordBadgeText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.primary,
  },
  wordBadgeTextFound: { color: Colors.success },
  wordBadgeTextHint: { color: '#E65100' },

  modalOverlay: {
    flex: 1, backgroundColor: '#00000066',
    alignItems: 'center', justifyContent: 'center',
  },
  modalBox: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.xxl, width: '82%', alignItems: 'center',
  },
  modalIcon: { fontSize: 64, marginBottom: Spacing.md },
  modalTitle: {
    fontSize: FontSizes.xxl, fontWeight: 'bold',
    color: Colors.textPrimary, marginBottom: Spacing.sm,
  },
  modalSub: {
    fontSize: FontSizes.lg, color: Colors.textSecondary,
    textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 26,
  },
  modalBtnPrimary: {
    backgroundColor: Colors.primary, borderRadius: Radius.sm,
    paddingVertical: Spacing.md, width: '100%', alignItems: 'center',
  },
  modalBtnPrimaryText: { color: Colors.white, fontSize: FontSizes.lg, fontWeight: 'bold' },
});
