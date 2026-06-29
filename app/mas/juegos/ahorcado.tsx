import AppHeader from '@/components/ui/AppHeader';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';
import { useTutorial } from '@/hooks/useTutorial';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Palabras de 5 a 12 letras, sin espacios
const PALABRAS = [
  'CAMINO','PUENTE','CIUDAD','FLORES','TIEMPO','JARDIN','VERANO','INVIERNO',
  'MONTANA','ESTRELLA','MARIPOSA','GIRASOL','NARANJA','MANZANA','SANDALIA',
  'SOMBRERO','PARAGUAS','PALOMAS','TORTUGA','ELEFANTE',
  'VENTANA','CARPETA','COCINA','HELADERA','SILLON','ESCALERA',
  'LAMPARA','ESPEJO','ALMOHADA','CORTINA','CAFETERA','LAVADORA','NEVERA',
  'CUADERNO','LAPICERA','MOCHILA','TIJERAS','TELEFONO',
  'EMPANADA','MILANESA','CHOCOLATE','ENSALADA',
  'ZANAHORIA','ESPINACA','BROCOLI','MANDARINA','FRUTILLA','DURAZNO',
  'BANANA','CIRUELA','LIMONADA','GASEOSA','HELADO','TORTA',
  'CABALLO','CONEJO','DELFIN','PINGUINO','JIRAFA','COCODRILO',
  'GOLONDRINA','PALOMA','CANARIO','HAMSTER',
  'ABUELITA','FAMILIA','AMISTAD','VECINOS','MAESTRO','MEDICO','ENFERMERO',
  'BOMBERO','POLICIA','COCINERO','CARPINTERO','PLOMERO','JARDINERO',
  'HOSPITAL','FARMACIA','TEMPLO','MERCADO','ESCUELA','BIBLIOTECA',
  'PANADERIA','CARNICERIA','PELUQUERIA','SUPERMERCADO',
  'GIMNASIA','NATACION','CICLISMO','JARDINERIA','COSTURA','TEJIDO',
  'PINTURA','MUSICA','LECTURA','COCINAR','BAILAR','CANTAR','CAMINAR',
  'CAMPERA','PANTALON','VESTIDO','BUFANDA','GUANTES','ZAPATILLAS',
  'SANDALIAS','CORBATA','CINTURON','PIJAMA','DELANTAL',
  'COLECTIVO','BICICLETA','HELICOPTERO','AMBULANCIA',
  'CAMIONETA','TRANVIA','BARCO','VELERO','LANCHA','AVIONETA',
  'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
  'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE',
  'LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO','DOMINGO',
  'AMARILLO','NARANJA','VIOLETA','CELESTE','MARRON','PLATEADO','DORADO',
  'CIRCULO','CUADRADO','TRIANGULO','RECTANGULO','ESTRELLA','CORAZON',
  'ARGENTINA','BRASIL','MEXICO','COLOMBIA','ESPANA','ITALIA','FRANCIA',
  'ALEMANIA','PORTUGAL','AUSTRALIA','CANADA','JAPON','CHINA','INDIA',
  'CORDOBA','ROSARIO','MENDOZA','TUCUMAN','SALTA',
];

const MAX_ERRORES = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Figura del ahorcado dibujada con Views nativos
function HangmanFigure({ errors, color }: { errors: number; color: string }) {
  const line: ViewStyle = { position: 'absolute', borderRadius: 2, backgroundColor: color };
  return (
    <View style={{ width: 180, height: 200 }}>
      {/* Horca — siempre visible */}
      <View style={[line, { bottom: 0, left: 5, width: 170, height: 4 }]} />
      <View style={[line, { bottom: 4, left: 25, width: 4, height: 165 }]} />
      <View style={[line, { top: 8, left: 27, width: 93, height: 4 }]} />
      <View style={[line, { top: 12, left: 116, width: 4, height: 22 }]} />

      {/* Error 1: cabeza */}
      {errors >= 1 && (
        <View style={{ position: 'absolute', top: 34, left: 100, width: 36, height: 36,
          borderRadius: 18, borderWidth: 4, borderColor: color }} />
      )}
      {/* Error 2: cuerpo */}
      {errors >= 2 && <View style={[line, { top: 70, left: 116, width: 4, height: 50 }]} />}
      {/* Error 3: brazo izquierdo */}
      {errors >= 3 && (
        <View style={[line, { top: 91, left: 87, width: 36, height: 4,
          transform: [{ rotate: '-45deg' }] }]} />
      )}
      {/* Error 4: brazo derecho */}
      {errors >= 4 && (
        <View style={[line, { top: 91, left: 113, width: 36, height: 4,
          transform: [{ rotate: '45deg' }] }]} />
      )}
      {/* Error 5: pierna izquierda */}
      {errors >= 5 && (
        <View style={[line, { top: 127, left: 91, width: 32, height: 4,
          transform: [{ rotate: '-45deg' }] }]} />
      )}
      {/* Error 6: pierna derecha */}
      {errors >= 6 && (
        <View style={[line, { top: 127, left: 113, width: 32, height: 4,
          transform: [{ rotate: '45deg' }] }]} />
      )}
    </View>
  );
}

function getRandomWord(): string {
  const filtered = PALABRAS.filter(p => p.length >= 5 && p.length <= 9 && !p.includes(' '));
  return filtered[Math.floor(Math.random() * filtered.length)];
}

export default function AhorcadoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [palabra, setPalabra] = useState(() => getRandomWord());
  const [letrasUsadas, setLetrasUsadas] = useState<Set<string>>(new Set());
  const [errores, setErrores] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [ganó, setGanó] = useState(false);
  const { showTutorial, dismissTutorial, reopenTutorial } = useTutorial('ahorcado');
  // Captura la palabra al momento de perder, así el modal no muestra la nueva
  const [palabraFinal, setPalabraFinal] = useState('');

  const initGame = () => {
    setGameOver(false);
    setGanó(false);
    setLetrasUsadas(new Set());
    setErrores(0);
    setPalabra(getRandomWord());
    setPalabraFinal('');
  };


  const handleLetra = (letra: string) => {
    if (letrasUsadas.has(letra) || gameOver) return;

    const nuevasUsadas = new Set(letrasUsadas);
    nuevasUsadas.add(letra);
    setLetrasUsadas(nuevasUsadas);

    if (!palabra.includes(letra)) {
      const nuevosErrores = errores + 1;
      setErrores(nuevosErrores);
      if (nuevosErrores >= MAX_ERRORES) {
        setPalabraFinal(palabra);
        setGameOver(true);
        setGanó(false);
      }
    } else {
      const todasDescubiertas = palabra.split('').every(l => nuevasUsadas.has(l));
      if (todasDescubiertas) {
        setPalabraFinal(palabra);
        setGameOver(true);
        setGanó(true);
      }
    }
  };

  const hangmanColor = errores >= MAX_ERRORES ? Colors.danger : Colors.primary;

  return (
    <View style={styles.container}>
      <AppHeader title="Ahorcado" showBack />

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Errores</Text>
          <Text style={[styles.statValue, errores > 3 && { color: Colors.danger }]}>
            {errores} / {MAX_ERRORES}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Letras usadas</Text>
          <Text style={styles.statValue}>{letrasUsadas.size}</Text>
        </View>
        <TouchableOpacity style={styles.helpBtn} onPress={reopenTutorial} accessibilityLabel="¿Cómo se juega?">
          <Text style={styles.helpBtnText}>❓ ¿Cómo se juega?</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Figura del ahorcado */}
        <View style={styles.hangmanContainer}>
          <HangmanFigure errors={errores} color={hangmanColor} />
        </View>

        {/* Palabra con guiones */}
        <View style={styles.wordRow}>
          {palabra.split('').map((letra, i) => (
            <View key={i} style={styles.letterBox}>
              <Text style={styles.letterText}>
                {letrasUsadas.has(letra) ? letra : ' '}
              </Text>
              <View style={styles.letterUnderline} />
            </View>
          ))}
        </View>

        {/* Letras incorrectas */}
        {errores > 0 && (
          <View style={styles.wrongSection}>
            <Text style={styles.wrongLabel}>Letras incorrectas:</Text>
            <View style={styles.wrongRow}>
              {Array.from(letrasUsadas)
                .filter(l => !palabra.includes(l))
                .map(l => (
                  <View key={l} style={styles.wrongBadge}>
                    <Text style={styles.wrongBadgeText}>{l}</Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Teclado */}
        <View style={styles.keyboard}>
          {ALPHABET.map((letra) => {
            const usada = letrasUsadas.has(letra);
            const correcta = usada && palabra.includes(letra);
            const incorrecta = usada && !palabra.includes(letra);
            return (
              <TouchableOpacity
                key={letra}
                style={[
                  styles.key,
                  correcta && styles.keyCorrect,
                  incorrecta && styles.keyWrong,
                  usada && styles.keyUsed,
                ]}
                onPress={() => handleLetra(letra)}
                disabled={usada || gameOver}
                activeOpacity={0.7}
                accessibilityLabel={`Letra ${letra}`}
              >
                <Text style={[styles.keyText, incorrecta && styles.keyTextWrong]}>
                  {letra}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Botón nuevo juego */}
        <TouchableOpacity style={styles.newGameBtn} onPress={initGame}>
          <Text style={styles.newGameBtnText}>🔄 Nuevo juego</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Tutorial */}
      <Modal visible={showTutorial} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>🪢</Text>
            <Text style={styles.modalTitle}>¿Cómo se juega?</Text>
            <Text style={styles.modalSub}>
              Hay una palabra secreta escondida.{'\n\n'}
              Tocá las letras del teclado para adivinarla de a una.{'\n\n'}
              Si la letra está en la palabra, aparece en su lugar. Si no, se dibuja una parte del ahorcado.{'\n\n'}
              Tenés <Text style={{ fontWeight: 'bold', color: Colors.textPrimary }}>6 errores</Text> antes de perder.
            </Text>
            <TouchableOpacity style={styles.modalBtnPrimary} onPress={dismissTutorial}>
              <Text style={styles.modalBtnPrimaryText}>¡Entendido, a jugar!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal resultado */}
      <Modal visible={gameOver} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>{ganó ? '🎉' : '😢'}</Text>
            <Text style={styles.modalTitle}>{ganó ? '¡Ganaste!' : '¡Perdiste!'}</Text>
            <Text style={styles.modalSub}>
              {ganó
                ? '¡Muy bien! Descubriste la palabra.'
                : `La palabra era: ${palabraFinal}`}
            </Text>
            <TouchableOpacity style={styles.modalBtnPrimary} onPress={initGame}>
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

  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: Colors.white, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  stat: { alignItems: 'center' },
  statLabel: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  statValue: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.textPrimary },
  helpBtn: {
    borderWidth: 2, borderColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  helpBtnText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: 'bold' },

  content: { padding: Spacing.lg, alignItems: 'center' },

  hangmanContainer: {
    marginVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },

  // Palabra
  wordRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: 4,
    marginVertical: Spacing.lg, paddingHorizontal: Spacing.md,
  },
  letterBox: { alignItems: 'center', minWidth: 32 },
  letterText: {
    fontSize: 28, fontWeight: 'bold',
    color: Colors.primary, minHeight: 34,
  },
  letterUnderline: {
    height: 3, width: 32, backgroundColor: Colors.primary,
    borderRadius: 2, marginTop: 2,
  },

  // Letras incorrectas
  wrongSection: { alignItems: 'center', marginBottom: Spacing.md },
  wrongLabel: { fontSize: FontSizes.md, color: Colors.textSecondary, marginBottom: Spacing.xs },
  wrongRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.xs },
  wrongBadge: {
    backgroundColor: Colors.dangerLight, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.danger,
  },
  wrongBadgeText: { color: Colors.danger, fontWeight: 'bold', fontSize: FontSizes.md },

  // Teclado
  keyboard: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: 6,
    marginVertical: Spacing.md, paddingHorizontal: Spacing.sm,
  },
  key: {
    width: 50, height: 50, borderRadius: Radius.sm,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 3, elevation: 3,
  },
  keyUsed: { opacity: 0.35 },
  keyCorrect: { backgroundColor: Colors.success },
  keyWrong: { backgroundColor: Colors.danger },
  keyText: { color: Colors.white, fontWeight: 'bold', fontSize: FontSizes.lg },
  keyTextWrong: { color: Colors.white },

  newGameBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.sm,
    paddingVertical: Spacing.md, alignItems: 'center',
    width: '100%', marginTop: Spacing.md,
  },
  newGameBtnText: { color: Colors.white, fontSize: FontSizes.lg, fontWeight: 'bold' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: '#00000066',
    alignItems: 'center', justifyContent: 'center',
  },
  modalBox: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.xxl, width: '80%', alignItems: 'center',
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
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.sm, width: '100%', alignItems: 'center',
  },
  modalBtnPrimaryText: { color: Colors.white, fontSize: FontSizes.xl, fontWeight: 'bold' },
  modalBtnSecondary: {
    borderWidth: 2, borderColor: Colors.primary, borderRadius: Radius.sm,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl,
    width: '100%', alignItems: 'center',
  },
  modalBtnSecondaryText: { color: Colors.primary, fontSize: FontSizes.xl, fontWeight: 'bold' },
});
