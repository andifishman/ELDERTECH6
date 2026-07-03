import AppHeader from '@/components/ui/AppHeader';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';
import { useTutorial } from '@/hooks/useTutorial';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ALL_EMOJIS = [
  '🌸','🌈','⚽','🎵','🏠','🌞','🍎','🎂',
  '🐬','🐯','🦆','🐧','🚗','✈️','☎️','🚀',
  '💻','📱','❤️','😎','📷','📺','🍕','🎧',
  '🌺','🦋','🎨','🏆','🎁','🌙','⭐','🍦',
];

const DIFFICULTIES = [
  { label: 'Muy fácil', pairs: 3,  cols: 2 },
  { label: 'Fácil',     pairs: 6,  cols: 3 },
  { label: 'Normal',    pairs: 8,  cols: 4 },
  { label: 'Difícil',   pairs: 12, cols: 4 },
  { label: 'Muy difícil', pairs: 16, cols: 4 },
];

interface Card {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function createCards(pairs: number): Card[] {
  const emojis = shuffle(ALL_EMOJIS).slice(0, pairs);
  return shuffle([...emojis, ...emojis]).map((emoji, i) => ({
    id: i, emoji, flipped: false, matched: false,
  }));
}

const { width: SW, height: SH } = Dimensions.get('window');
const CARD_GAP = 10;
// Altura estimada de AppHeader + topBar + insets — ajustado para que quepa sin scroll
const FIXED_UI_H = 310;

const CARD_MAX = 130; // tope para que las cartas no sean demasiado grandes

function calcCardSize(cols: number, pairs: number): number {
  const rows = Math.ceil((pairs * 2) / cols);
  const byW = Math.floor((SW - 32 - (cols - 1) * CARD_GAP) / cols);
  const availH = SH - FIXED_UI_H;
  const byH = Math.floor((availH - (rows - 1) * CARD_GAP - 24) / rows);
  return Math.max(56, Math.min(byW, byH, CARD_MAX));
}

export default function MemotestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [diffIdx, setDiffIdx] = useState(0);
  const [cards, setCards] = useState<Card[]>(() => createCards(DIFFICULTIES[0].pairs));
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const { showTutorial, dismissTutorial, reopenTutorial } = useTutorial('memotest');
  const isChecking = useRef(false);

  const diff = DIFFICULTIES[diffIdx];
  const CARD_SIZE = calcCardSize(diff.cols, diff.pairs);
  // Ancho exacto de la grilla para que flexWrap funcione con alignItems:center del padre
  const GRID_W = diff.cols * CARD_SIZE + (diff.cols - 1) * CARD_GAP;

  const initGame = useCallback((idx: number) => {
    isChecking.current = false;
    setDiffIdx(idx);
    setCards(createCards(DIFFICULTIES[idx].pairs));
    setFlippedIds([]);
    setMoves(0);
    setWon(false);
  }, []);

  const handleFlip = (cardId: number) => {
    if (isChecking.current || won) return;
    if (flippedIds.length >= 2) return;
    const card = cards[cardId];
    if (!card || card.flipped || card.matched) return;

    const updatedCards = cards.map((c, i) => i === cardId ? { ...c, flipped: true } : c);
    setCards(updatedCards);
    const newFlipped = [...flippedIds, cardId];
    setFlippedIds(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      isChecking.current = true;
      const [i1, i2] = newFlipped;
      const match = updatedCards[i1].emoji === updatedCards[i2].emoji;
      setTimeout(() => {
        if (match) {
          setCards(prev => {
            const next = prev.map((c, i) => i === i1 || i === i2 ? { ...c, matched: true } : c);
            if (next.every(c => c.matched)) setWon(true);
            return next;
          });
        } else {
          setCards(prev => prev.map((c, i) => i === i1 || i === i2 ? { ...c, flipped: false } : c));
        }
        setFlippedIds([]);
        isChecking.current = false;
      }, 900);
    }
  };

  const matchedCount = cards.filter(c => c.matched).length / 2;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <AppHeader title="Memotest" showBack />

      {/* Barra superior */}
      <View style={styles.topBar}>
        {/* Carrusel de dificultad */}
        <View style={styles.carousel}>
          {/* Flecha izquierda */}
          <TouchableOpacity
            style={[styles.arrowBtn, diffIdx === 0 && styles.arrowBtnOff]}
            onPress={() => diffIdx > 0 && initGame(diffIdx - 1)}
            disabled={diffIdx === 0}
          >
            <Text style={[styles.arrowTxt, diffIdx === 0 && styles.arrowTxtOff]}>‹</Text>
          </TouchableOpacity>

          {/* Centro: nivel + nombre + dots */}
          <View style={styles.diffCenter}>
            <Text style={styles.diffLevel}>Nivel {diffIdx + 1} de {DIFFICULTIES.length}</Text>
            <Text style={styles.diffName}>{diff.label}</Text>
            <View style={styles.dotsRow}>
              {DIFFICULTIES.map((_, i) => (
                <View key={i} style={[styles.dot, i === diffIdx && styles.dotActive]} />
              ))}
            </View>
          </View>

          {/* Flecha derecha */}
          <TouchableOpacity
            style={[styles.arrowBtn, diffIdx === DIFFICULTIES.length - 1 && styles.arrowBtnOff]}
            onPress={() => diffIdx < DIFFICULTIES.length - 1 && initGame(diffIdx + 1)}
            disabled={diffIdx === DIFFICULTIES.length - 1}
          >
            <Text style={[styles.arrowTxt, diffIdx === DIFFICULTIES.length - 1 && styles.arrowTxtOff]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Text style={styles.stat}>Jugadas: <Text style={styles.statBold}>{moves}</Text></Text>
          <Text style={styles.stat}>Pares: <Text style={styles.statBold}>{matchedCount}/{diff.pairs}</Text></Text>
        </View>

        {/* Acciones */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.newBtn} onPress={() => initGame(diffIdx)}>
            <Text style={styles.newBtnTxt}>🔄 Nuevo juego</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.helpBtn} onPress={reopenTutorial}>
            <Text style={styles.helpBtnTxt}>❓ ¿Cómo se juega?</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* Grilla — ocupa el espacio restante sin scroll */}
      <View style={styles.gridArea}>
        <View style={[styles.grid, { width: GRID_W, gap: CARD_GAP }]}>
          {cards.map((card, idx) => {
            const visible = card.flipped || card.matched;
            return (
              <TouchableOpacity
                key={card.id}
                style={[
                  styles.card,
                  { width: CARD_SIZE, height: CARD_SIZE },
                  visible ? styles.cardFront : styles.cardBack,
                  card.matched && styles.cardMatched,
                ]}
                onPress={() => handleFlip(idx)}
                disabled={visible || isChecking.current}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: CARD_SIZE * 0.45, color: visible ? undefined : Colors.white }}>
                  {visible ? card.emoji : '?'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Tutorial */}
      <Modal visible={showTutorial} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.mIcon}>🃏</Text>
            <Text style={styles.mTitle}>¿Cómo se juega?</Text>
            <Text style={styles.mSub}>
              Hay cartas boca abajo con emojis escondidos.{'\n\n'}
              Tocá dos cartas para darlas vuelta.{'\n\n'}
              Si son iguales, quedan descubiertas. Si no, se vuelven a tapar.{'\n\n'}
              Encontrá todos los pares con la menor cantidad de jugadas.
            </Text>
            <TouchableOpacity style={styles.mBtnPrimary} onPress={dismissTutorial}>
              <Text style={styles.mBtnPrimaryTxt}>¡Entendido, a jugar!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Victoria */}
      <Modal visible={won} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.mIcon}>🎉</Text>
            <Text style={styles.mTitle}>¡Ganaste!</Text>
            <Text style={styles.mSub}>Encontraste todos los pares en {moves} jugadas.</Text>
            <TouchableOpacity style={styles.mBtnPrimary} onPress={() => initGame(diffIdx)}>
              <Text style={styles.mBtnPrimaryTxt}>Jugar de nuevo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mBtnSecondary} onPress={() => router.back()}>
              <Text style={styles.mBtnSecondaryTxt}>Volver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  topBar: {
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  carousel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  arrowBtn: {
    width: 72, height: 72, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.md,
  },
  arrowBtnOff: { backgroundColor: Colors.border },
  arrowTxt: { color: Colors.white, fontSize: 44, fontWeight: '300', lineHeight: 50 },
  arrowTxtOff: { color: Colors.textSecondary },
  diffCenter: { flex: 1, alignItems: 'center', gap: 4 },
  diffLevel: { fontSize: FontSizes.sm, color: Colors.textSecondary, fontWeight: '600', letterSpacing: 0.5 },
  diffName: { fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.primary },
  dotsRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { width: 24, height: 8, borderRadius: 4, backgroundColor: Colors.primary },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { fontSize: FontSizes.lg, color: Colors.textSecondary },
  statBold: { fontWeight: 'bold', color: Colors.textPrimary, fontSize: FontSizes.xl },

  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  newBtn: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: Spacing.md, alignItems: 'center',
  },
  newBtnTxt: { color: Colors.white, fontSize: FontSizes.lg, fontWeight: 'bold' },
  helpBtn: {
    borderWidth: 2, borderColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm,
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white,
  },
  helpBtnTxt: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: 'bold' },

  gridArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  card: {
    borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 3, elevation: 3,
  },
  cardBack: { backgroundColor: Colors.primary },
  cardFront: { backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.border },
  cardMatched: { backgroundColor: Colors.successLight, borderColor: Colors.success, borderWidth: 2 },

  overlay: { flex: 1, backgroundColor: '#00000066', alignItems: 'center', justifyContent: 'center' },
  modal: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.xxl, width: '85%', alignItems: 'center',
  },
  mIcon: { fontSize: 64, marginBottom: Spacing.md },
  mTitle: { fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: Spacing.sm },
  mSub: { fontSize: FontSizes.lg, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 26 },
  mBtnPrimary: {
    backgroundColor: Colors.primary, borderRadius: Radius.sm,
    paddingVertical: Spacing.md, width: '100%', alignItems: 'center', marginBottom: Spacing.sm,
  },
  mBtnPrimaryTxt: { color: Colors.white, fontSize: FontSizes.xl, fontWeight: 'bold' },
  mBtnSecondary: {
    borderWidth: 2, borderColor: Colors.primary, borderRadius: Radius.sm,
    paddingVertical: Spacing.md, width: '100%', alignItems: 'center',
  },
  mBtnSecondaryTxt: { color: Colors.primary, fontSize: FontSizes.xl, fontWeight: 'bold' },
});
