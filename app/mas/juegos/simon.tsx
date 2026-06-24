import AppHeader from '@/components/ui/AppHeader';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type GameState = 'idle' | 'showing' | 'input' | 'over';

const BUTTONS = [
  { id: 0, color: '#E53935', darkColor: '#B71C1C', label: 'Rojo' },
  { id: 1, color: '#1E88E5', darkColor: '#0D47A1', label: 'Azul' },
  { id: 2, color: '#43A047', darkColor: '#1B5E20', label: 'Verde' },
  { id: 3, color: '#FDD835', darkColor: '#F9A825', label: 'Amarillo' },
];

export default function SimonScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [gameState, setGameState] = useState<GameState>('idle');
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerPos, setPlayerPos] = useState(0);
  const [activeBtn, setActiveBtn] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const [bestRound, setBestRound] = useState(0);
  const [showTutorial, setShowTutorial] = useState(true);

  const timerIds = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Refs to avoid stale closures inside setTimeout callbacks
  const sequenceRef  = useRef<number[]>([]);
  const playerPosRef = useRef(0);
  const roundRef     = useRef(0);
  const gameStateRef = useRef<GameState>('idle');

  sequenceRef.current  = sequence;
  playerPosRef.current = playerPos;
  roundRef.current     = round;
  gameStateRef.current = gameState;

  const clearTimers = () => {
    timerIds.current.forEach(clearTimeout);
    timerIds.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  const playSequence = (seq: number[]) => {
    clearTimers();
    setGameState('showing');
    setPlayerPos(0);
    playerPosRef.current = 0;

    seq.forEach((btn, i) => {
      const t1 = setTimeout(() => setActiveBtn(btn), i * 900);
      const t2 = setTimeout(() => setActiveBtn(null), i * 900 + 650);
      timerIds.current.push(t1, t2);
    });

    const t3 = setTimeout(() => {
      setGameState('input');
      gameStateRef.current = 'input';
    }, seq.length * 900 + 750);
    timerIds.current.push(t3);
  };

  const startGame = () => {
    clearTimers();
    const firstBtn = Math.floor(Math.random() * 4);
    const seq = [firstBtn];
    setSequence(seq);
    sequenceRef.current = seq;
    setRound(1);
    roundRef.current = 1;
    setBestRound(prev => Math.max(prev, 0));
    playSequence(seq);
  };

  const handlePress = (btnId: number) => {
    if (gameStateRef.current !== 'input') return;

    // Brief flash on player press
    setActiveBtn(btnId);
    const t = setTimeout(() => setActiveBtn(null), 250);
    timerIds.current.push(t);

    const currentSeq = sequenceRef.current;
    const pos = playerPosRef.current;

    if (btnId !== currentSeq[pos]) {
      clearTimers();
      setBestRound(prev => Math.max(prev, roundRef.current));
      setGameState('over');
      gameStateRef.current = 'over';
      return;
    }

    const nextPos = pos + 1;
    setPlayerPos(nextPos);
    playerPosRef.current = nextPos;

    if (nextPos === currentSeq.length) {
      // Round complete — extend sequence
      const newSeq = [...currentSeq, Math.floor(Math.random() * 4)];
      const newRound = roundRef.current + 1;
      setSequence(newSeq);
      sequenceRef.current = newSeq;
      setRound(newRound);
      roundRef.current = newRound;
      setGameState('showing');
      gameStateRef.current = 'showing';

      const t2 = setTimeout(() => playSequence(newSeq), 1200);
      timerIds.current.push(t2);
    }
  };

  const resetGame = () => {
    clearTimers();
    setGameState('idle');
    setSequence([]);
    setPlayerPos(0);
    setActiveBtn(null);
    setRound(0);
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Simón" subtitle="Repetí la secuencia de colores" showBack />

      <View style={[styles.content, { paddingBottom: insets.bottom + 16 }]}>
        {/* Rondas */}
        <View style={styles.scoreboard}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Ronda</Text>
            <Text style={styles.scoreValue}>{gameState === 'idle' ? '—' : round}</Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Mejor</Text>
            <Text style={[styles.scoreValue, { color: Colors.success }]}>{bestRound || '—'}</Text>
          </View>
        </View>

        {/* Mensaje de estado */}
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {gameState === 'idle' && 'Presioná Empezar para jugar'}
            {gameState === 'showing' && '👀 ¡Mirá la secuencia!'}
            {gameState === 'input' && '👆 ¡Ahora vos!'}
            {gameState === 'over' && '😢 ¡Fin del juego!'}
          </Text>
        </View>

        {/* Grilla 2×2 de botones */}
        <View style={styles.buttonGrid}>
          {BUTTONS.map((btn) => {
            const isActive = activeBtn === btn.id;
            return (
              <TouchableOpacity
                key={btn.id}
                style={[
                  styles.simonBtn,
                  { backgroundColor: isActive ? btn.color : btn.darkColor },
                  isActive && styles.simonBtnLit,
                ]}
                onPress={() => handlePress(btn.id)}
                disabled={gameState !== 'input'}
                activeOpacity={0.85}
                accessibilityLabel={`Botón ${btn.label}`}
              >
                <Text style={styles.btnLabel}>{btn.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Botón empezar / reiniciar */}
        {(gameState === 'idle') && (
          <TouchableOpacity style={styles.startBtn} onPress={startGame} activeOpacity={0.85}>
            <Text style={styles.startBtnText}>🎮 Empezar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tutorial */}
      <Modal visible={showTutorial} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>🎮</Text>
            <Text style={styles.modalTitle}>¿Cómo se juega?</Text>
            <Text style={styles.modalSub}>
              La computadora muestra una secuencia de colores que se iluminan uno por uno.{'\n\n'}
              Cuando es tu turno, repetí la secuencia tocando los botones en el mismo orden.{'\n\n'}
              Cada ronda se agrega un color más. ¡Hasta dónde llegás?
            </Text>
            <TouchableOpacity style={styles.modalBtnPrimary} onPress={() => setShowTutorial(false)}>
              <Text style={styles.modalBtnPrimaryText}>¡Entendido, a jugar!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal game over */}
      <Modal visible={gameState === 'over'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>😢</Text>
            <Text style={styles.modalTitle}>¡Error!</Text>
            <Text style={styles.modalSub}>
              Llegaste hasta la ronda{' '}
              <Text style={{ fontWeight: 'bold', color: Colors.primary }}>{round}</Text>.{'\n'}
              Mejor récord: <Text style={{ fontWeight: 'bold', color: Colors.success }}>{bestRound}</Text>
            </Text>
            <TouchableOpacity style={styles.modalBtnPrimary} onPress={() => { resetGame(); startGame(); }}>
              <Text style={styles.modalBtnPrimaryText}>Jugar de nuevo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => { resetGame(); router.back(); }}>
              <Text style={styles.modalBtnSecondaryText}>Volver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const BTN_SIZE = 148;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },

  scoreboard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.xxl,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  scoreItem: { alignItems: 'center', minWidth: 70 },
  scoreLabel: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  scoreValue: {
    fontSize: 40, fontWeight: 'bold',
    color: Colors.textPrimary, lineHeight: 48,
  },
  scoreDivider: { width: 1, backgroundColor: Colors.border },

  statusBadge: {
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  statusText: {
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },

  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    width: BTN_SIZE * 2 + 14,
    justifyContent: 'center',
  },
  simonBtn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  simonBtnLit: {
    transform: [{ scale: 1.06 }],
    elevation: 10,
  },
  btnLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: 'bold',
    fontSize: FontSizes.lg,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  startBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
    minWidth: 200,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  startBtnText: { color: Colors.white, fontSize: FontSizes.xl, fontWeight: 'bold' },

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
    marginBottom: Spacing.sm,
  },
  modalBtnPrimaryText: { color: Colors.white, fontSize: FontSizes.lg, fontWeight: 'bold' },
  modalBtnSecondary: {
    borderWidth: 2, borderColor: Colors.primary, borderRadius: Radius.sm,
    paddingVertical: Spacing.md, width: '100%', alignItems: 'center',
  },
  modalBtnSecondaryText: { color: Colors.primary, fontSize: FontSizes.lg, fontWeight: 'bold' },
});
