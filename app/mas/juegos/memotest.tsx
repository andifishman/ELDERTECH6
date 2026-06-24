import AppHeader from '@/components/ui/AppHeader';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ALL_EMOJIS = [
  '💻','📱','😁','🖥️','❤️','😎','📷','📸',
  '📺','🍕','🎧','🔋','🍔','💿','🍟','🌭',
  '🚗','✈️','☎️','🚀','🐬','🐯','🦆','🐧',
];

const DIFFICULTIES = [
  { label: 'Fácil',   pairs: 4,  cols: 4 },
  { label: 'Normal',  pairs: 6,  cols: 4 },
  { label: 'Difícil', pairs: 10, cols: 5 },
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
  const doubled = [...emojis, ...emojis];
  return shuffle(doubled).map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
}

const { width: SCREEN_W } = Dimensions.get('window');

function cardSize(cols: number): number {
  const gap = 8;
  return Math.floor((SCREEN_W - 32 - (cols - 1) * gap) / cols);
}

export default function MemotestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [diffIdx, setDiffIdx] = useState(0);
  const [cards, setCards] = useState<Card[]>(() => createCards(DIFFICULTIES[0].pairs));
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const isChecking = useRef(false);

  const diff = DIFFICULTIES[diffIdx];
  const CARD_SIZE = cardSize(diff.cols);

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

    const updatedCards = cards.map((c, i) =>
      i === cardId && !c.flipped && !c.matched ? { ...c, flipped: true } : c
    );

    const card = cards[cardId];
    if (!card || card.flipped || card.matched) return;

    setCards(updatedCards);

    const newFlipped = [...flippedIds, cardId];
    setFlippedIds(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      isChecking.current = true;
      const [idx1, idx2] = newFlipped;
      const match = updatedCards[idx1].emoji === updatedCards[idx2].emoji;

      setTimeout(() => {
        if (match) {
          setCards(prev => {
            const next = prev.map((c, i) =>
              i === idx1 || i === idx2 ? { ...c, matched: true } : c
            );
            if (next.every(c => c.matched)) setWon(true);
            return next;
          });
        } else {
          setCards(prev => prev.map((c, i) =>
            i === idx1 || i === idx2 ? { ...c, flipped: false } : c
          ));
        }
        setFlippedIds([]);
        isChecking.current = false;
      }, 1000);
    }
  };

  const matchedCount = cards.filter(c => c.matched).length / 2;

  return (
    <View style={styles.container}>
      <AppHeader title="Memotest" subtitle="Encontrá los pares de cartas iguales" showBack />

      {/* Dificultad + stats */}
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

        <View style={styles.statsRow}>
          <Text style={styles.statItem}>
            Jugadas: <Text style={styles.statBold}>{moves}</Text>
          </Text>
          <Text style={styles.statItem}>
            Pares: <Text style={styles.statBold}>{matchedCount}/{diff.pairs}</Text>
          </Text>
          <TouchableOpacity onPress={() => initGame(diffIdx)}>
            <Text style={styles.resetText}>🔄 Nuevo</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Grilla de cartas */}
        <View style={[styles.grid, { gap: 8 }]}>
          {cards.map((card, idx) => {
            const visible = card.flipped || card.matched;
            return (
              <TouchableOpacity
                key={card.id}
                style={[
                  styles.card,
                  { width: CARD_SIZE, height: CARD_SIZE },
                  visible ? styles.cardVisible : styles.cardHidden,
                  card.matched && styles.cardMatched,
                ]}
                onPress={() => handleFlip(idx)}
                disabled={visible || isChecking.current}
                activeOpacity={0.75}
                accessibilityLabel={visible ? card.emoji : 'Carta boca abajo'}
              >
                <Text style={[
                  styles.cardEmoji,
                  { fontSize: CARD_SIZE * 0.42 },
                  !visible && styles.cardEmojiHidden,
                ]}>
                  {visible ? card.emoji : '?'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Tutorial */}
      <Modal visible={showTutorial} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>🃏</Text>
            <Text style={styles.modalTitle}>¿Cómo se juega?</Text>
            <Text style={styles.modalSub}>
              Hay cartas boca abajo con emojis escondidos.{'\n\n'}
              Tocá dos cartas para darlas vuelta.{'\n\n'}
              Si son iguales, quedan descubiertas. Si no, se vuelven a tapar.{'\n\n'}
              Encontrá todos los pares con la menor cantidad de jugadas.
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
            <Text style={styles.modalTitle}>¡Ganaste!</Text>
            <Text style={styles.modalSub}>
              Encontraste todos los pares en {moves} jugadas.
            </Text>
            <TouchableOpacity style={styles.modalBtnPrimary} onPress={() => initGame(diffIdx)}>
              <Text style={styles.modalBtnPrimaryText}>Jugar de nuevo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => router.back()}>
              <Text style={styles.modalBtnSecondaryText}>Volver</Text>
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
  diffRow: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  diffBtn: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, backgroundColor: Colors.background,
  },
  diffBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  diffBtnText: { fontSize: FontSizes.sm, color: Colors.textSecondary, fontWeight: '600' },
  diffBtnTextActive: { color: Colors.white },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statItem: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  statBold: { fontWeight: 'bold', color: Colors.textPrimary },
  resetText: { fontSize: FontSizes.sm, color: Colors.primary, fontWeight: '600' },

  content: { padding: 16, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },

  card: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  cardHidden: { backgroundColor: Colors.primary },
  cardVisible: { backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.border },
  cardMatched: { backgroundColor: Colors.successLight, borderColor: Colors.success, borderWidth: 2 },
  cardEmoji: { textAlign: 'center' },
  cardEmojiHidden: { color: Colors.white, fontWeight: 'bold' },

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
    textAlign: 'center', marginBottom: Spacing.xl,
  },
  modalBtnPrimary: {
    backgroundColor: Colors.primary, borderRadius: Radius.sm,
    paddingVertical: Spacing.md, width: '100%', alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modalBtnPrimaryText: { color: Colors.white, fontSize: FontSizes.lg, fontWeight: 'bold' },
  modalBtnSecondary: {
    borderWidth: 2, borderColor: Colors.primary, borderRadius: Radius.sm,
    paddingVertical: Spacing.md, width: '100%', alignItems: 'center',
  },
  modalBtnSecondaryText: { color: Colors.primary, fontSize: FontSizes.lg, fontWeight: 'bold' },
});
