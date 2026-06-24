import AppHeader from '@/components/ui/AppHeader';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';
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
const CELL_SIZE = Math.floor((SCREEN_W - 32) / GRID_SIZE);

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

  // Fill empty cells
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (cells[r][c] === '') {
        cells[r][c] = LETTERS[Math.floor(Math.random() * LETTERS.length)];
      }
    }
  }

  return { grid: cells, placements };
}

function getLineCells(
  start: [number, number],
  end: [number, number]
): [number, number][] {
  const [r1, c1] = start;
  const [r2, c2] = end;
  const result: [number, number][] = [];

  if (r1 === r2) {
    for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
      result.push([r1, c]);
    }
  } else if (c1 === c2) {
    for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
      result.push([r, c1]);
    }
  }

  return result;
}

export default function SopaScreen() {
  const insets = useSafeAreaInsets();
  const [grid, setGrid] = useState<Grid>([]);
  const [placements, setPlacements] = useState<WordPlacement[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [selCells, setSelCells] = useState<[number, number][]>([]);
  const [won, setWon] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [currentTheme, setCurrentTheme] = useState('');

  // Refs used inside PanResponder to avoid stale closures
  const gridRef = useRef<View>(null);
  const gridMeasure = useRef({ x: 0, y: 0 });
  const touchStartRef = useRef<[number, number] | null>(null);
  const touchEndRef = useRef<[number, number] | null>(null);
  const gameRef = useRef<{
    grid: Grid;
    placements: WordPlacement[];
    foundWords: string[];
  }>({ grid: [], placements: [], foundWords: [] });

  const measureGrid = () => {
    setTimeout(() => {
      gridRef.current?.measureInWindow((x, y) => {
        gridMeasure.current = { x, y };
      });
    }, 100);
  };

  const getCellAt = (pageX: number, pageY: number): [number, number] | null => {
    const col = Math.floor((pageX - gridMeasure.current.x) / CELL_SIZE);
    const row = Math.floor((pageY - gridMeasure.current.y) / CELL_SIZE);
    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      return [row, col];
    }
    return null;
  };

  const checkSelection = (start: [number, number], end: [number, number]) => {
    const cells = getLineCells(start, end);
    if (cells.length < 2) return;

    const { placements: ps, foundWords: fw, grid: g } = gameRef.current;
    const word = cells.map(([r, c]) => g[r][c]).join('');
    const wordRev = [...word].reverse().join('');

    const match = ps.find(p =>
      !fw.includes(p.word) && (p.word === word || p.word === wordRev)
    );

    if (match) {
      const newFound = [...fw, match.word];
      gameRef.current.foundWords = newFound;
      setFoundWords(newFound);
      if (newFound.length === ps.length) setWon(true);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const cell = getCellAt(e.nativeEvent.pageX, e.nativeEvent.pageY);
        if (cell) {
          touchStartRef.current = cell;
          setSelCells([cell]);
        }
      },
      onPanResponderMove: (e) => {
        if (!touchStartRef.current) return;
        const cell = getCellAt(e.nativeEvent.pageX, e.nativeEvent.pageY);
        if (cell) {
          touchEndRef.current = cell;
          setSelCells(getLineCells(touchStartRef.current, cell));
        }
      },
      onPanResponderRelease: () => {
        if (touchStartRef.current && touchEndRef.current) {
          checkSelection(touchStartRef.current, touchEndRef.current);
        }
        touchStartRef.current = null;
        touchEndRef.current = null;
        setTimeout(() => setSelCells([]), 350);
      },
    })
  ).current;

  const initGame = useCallback(() => {
    const setIdx = Math.floor(Math.random() * WORD_SETS.length);
    const wordSet = WORD_SETS[setIdx];
    const { grid: g, placements: ps } = generateGrid(wordSet.words);
    gameRef.current = { grid: g, placements: ps, foundWords: [] };
    setGrid(g);
    setPlacements(ps);
    setFoundWords([]);
    setWon(false);
    setCurrentTheme(wordSet.theme);
    setSelCells([]);
  }, []);

  // Inicializar al montar
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
      <AppHeader title="Sopa de Letras" subtitle={currentTheme} showBack />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Progreso */}
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            Palabras encontradas:{' '}
            <Text style={styles.progressBold}>{foundWords.length}/{placements.length}</Text>
          </Text>
          <TouchableOpacity onPress={initGame}>
            <Text style={styles.resetText}>🔄 Nueva sopa</Text>
          </TouchableOpacity>
        </View>

        {/* Grilla */}
        <View
          ref={gridRef}
          onLayout={measureGrid}
          style={styles.grid}
          {...panResponder.panHandlers}
        >
          {grid.map((row, r) => (
            <View key={r} style={styles.gridRow}>
              {row.map((letter, c) => {
                const foundColor = getFoundColor(r, c);
                const selected = isCellSelected(r, c);
                return (
                  <View
                    key={c}
                    style={[
                      styles.cell,
                      { width: CELL_SIZE, height: CELL_SIZE },
                      foundColor ? { backgroundColor: foundColor } : undefined,
                      selected && styles.cellSelected,
                    ]}
                  >
                    <Text style={[
                      styles.cellText,
                      selected && styles.cellTextSelected,
                      { fontSize: CELL_SIZE * 0.45 },
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
          {placements.map((p) => (
            <View
              key={p.word}
              style={[styles.wordBadge, foundWords.includes(p.word) && styles.wordBadgeFound]}
            >
              <Text style={[styles.wordBadgeText, foundWords.includes(p.word) && styles.wordBadgeTextFound]}>
                {foundWords.includes(p.word) ? '✓ ' : ''}{p.word}
              </Text>
            </View>
          ))}
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
              Las palabras están en horizontal o vertical.{'\n\n'}
              Deslizá el dedo sobre las letras para marcar una palabra.{'\n\n'}
              Las palabras que tenés que encontrar aparecen abajo de la grilla.
            </Text>
            <TouchableOpacity style={styles.modalBtnPrimary} onPress={() => setShowTutorial(false)}>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  progressText: { fontSize: FontSizes.md, color: Colors.textSecondary },
  progressBold: { fontWeight: 'bold', color: Colors.textPrimary },
  resetText: { fontSize: FontSizes.sm, color: Colors.primary, fontWeight: '600' },

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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.white,
  },
  wordBadgeFound: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success,
  },
  wordBadgeText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.primary,
  },
  wordBadgeTextFound: { color: Colors.success },

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
    fontSize: FontSizes.md, color: Colors.textSecondary,
    textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 22,
  },
  modalBtnPrimary: {
    backgroundColor: Colors.primary, borderRadius: Radius.sm,
    paddingVertical: Spacing.md, width: '100%', alignItems: 'center',
  },
  modalBtnPrimaryText: { color: Colors.white, fontSize: FontSizes.lg, fontWeight: 'bold' },
});
