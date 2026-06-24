import AppHeader from '@/components/ui/AppHeader';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ALL_GROUPS: { category: string; color: string; items: string[] }[] = [
  { category: 'Frutas',             color: '#4CAF50', items: ['Manzana','Pera','Sandía','Piña','Durazno','Naranja','Uva','Frutilla','Melón','Limón','Banana','Ciruela','Kiwi','Mango','Cereza'] },
  { category: 'Verduras',           color: '#8BC34A', items: ['Zanahoria','Lechuga','Tomate','Cebolla','Papa','Zapallo','Brocoli','Espinaca','Ajo','Acelga','Apio','Pepino','Berenjena','Choclo','Remolacha'] },
  { category: 'Animales',           color: '#FF9800', items: ['Perro','Gato','Leon','Tigre','Elefante','Jirafa','Delfin','Pinguino','Tortuga','Caballo','Conejo','Oso','Lobo','Mono','Vaca'] },
  { category: 'Animales del mar',   color: '#0097A7', items: ['Tiburon','Pulpo','Ballena','Cangrejo','Medusa','Calamar','Langosta','Foca','Morsa'] },
  { category: 'Aves',               color: '#43A047', items: ['Aguila','Loro','Paloma','Pinguino','Flamenco','Gorrion','Cuervo','Pato','Gallo','Gallina','Cisne'] },
  { category: 'Deportes',           color: '#2196F3', items: ['Futbol','Basquet','Tenis','Voley','Natacion','Ciclismo','Boxeo','Rugby','Golf','Atletismo','Handball','Polo','Remo','Judo'] },
  { category: 'Paises de America',  color: '#F44336', items: ['Argentina','Brasil','Mexico','Colombia','Chile','Peru','Venezuela','Bolivia','Uruguay','Paraguay','Cuba','Ecuador'] },
  { category: 'Paises de Europa',   color: '#E53935', items: ['Francia','Italia','España','Alemania','Portugal','Grecia','Suecia','Noruega','Polonia','Holanda','Suiza'] },
  { category: 'Capitales',          color: '#AD1457', items: ['Buenos Aires','Paris','Roma','Madrid','Berlin','Londres','Tokio','Moscu','Lima','Bogota','Santiago','Brasilia'] },
  { category: 'Instrumentos',       color: '#00BCD4', items: ['Guitarra','Piano','Violin','Flauta','Bateria','Trompeta','Arpa','Acordeon','Bajo','Bombo','Saxofon','Clarinete','Cello','Mandolina'] },
  { category: 'Transportes',        color: '#607D8B', items: ['Auto','Tren','Avion','Barco','Bicicleta','Moto','Colectivo','Helicoptero','Tranvia','Subte','Camion','Lancha','Velero','Taxi','Ambulancia'] },
  { category: 'Profesiones',        color: '#795548', items: ['Medico','Maestro','Abogado','Cocinero','Bombero','Policia','Enfermero','Arquitecto','Piloto','Carpintero','Plomero','Electricista','Contador','Periodista','Veterinario'] },
  { category: 'Flores',             color: '#E91E63', items: ['Rosa','Margarita','Tulipan','Girasol','Jazmin','Clavel','Lila','Begonia','Amapola','Dalia','Orquidea','Lavanda','Azalea','Gardenia','Petunia'] },
  { category: 'Meses del año',      color: '#009688', items: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'] },
  { category: 'Colores',            color: '#9C27B0', items: ['Rojo','Azul','Verde','Amarillo','Naranja','Rosa','Celeste','Marron','Blanco','Negro','Violeta','Gris','Dorado','Plateado'] },
  { category: 'Partes del cuerpo',  color: '#FF5722', items: ['Cabeza','Brazo','Pierna','Mano','Pie','Espalda','Cuello','Rodilla','Codo','Hombro','Tobillo','Pecho','Frente'] },
  { category: 'Comidas argentinas', color: '#FFC107', items: ['Milanesa','Empanada','Asado','Locro','Choripan','Medialunas','Alfajor','Dulce de leche','Mate','Facturas'] },
  { category: 'Postres',            color: '#F06292', items: ['Helado','Torta','Flan','Brownie','Tiramisu','Mousse','Cheesecake','Panqueque','Arroz con leche'] },
  { category: 'Bebidas',            color: '#26A69A', items: ['Agua','Jugo','Leche','Cafe','Te','Mate','Gaseosa','Limonada','Chocolate','Cerveza'] },
  { category: 'Ropa',               color: '#7E57C2', items: ['Camisa','Pantalon','Vestido','Falda','Abrigo','Bufanda','Gorro','Zapatos','Medias','Remera','Campera','Corbata','Cinturon','Guantes'] },
  { category: 'Muebles',            color: '#8D6E63', items: ['Silla','Mesa','Cama','Sofa','Armario','Escritorio','Estante','Sillon','Comoda','Ropero'] },
  { category: 'Electrodomesticos',  color: '#546E7A', items: ['Heladera','Microondas','Lavarropas','Televisor','Licuadora','Tostadora','Aspiradora','Plancha','Cafetera','Horno'] },
  { category: 'Cosas de la escuela',color: '#0288D1', items: ['Lapiz','Goma','Regla','Cuaderno','Mochila','Tijera','Pegamento','Compas','Marcador','Carpeta'] },
  { category: 'Formas',             color: '#283593', items: ['Circulo','Cuadrado','Triangulo','Rectangulo','Estrella','Rombo','Ovalo','Pentagono','Hexagono','Cruz'] },
  { category: 'Herramientas',       color: '#37474F', items: ['Martillo','Destornillador','Llave','Sierra','Taladro','Pinza','Nivel','Pala','Hacha'] },
  { category: 'Cantantes',          color: '#7B1FA2', items: ['Mercedes Sosa','Sandro','Palito Ortega','Frank Sinatra','Elvis','Gardel','Piazzolla','Serrat'] },
  { category: 'Peliculas clasicas', color: '#C2185B', items: ['Titanic','Bambi','Pinocho','Cenicienta','Blancanieves','El Padrino','Casablanca','Grease','Rocky','Superman'] },
  { category: 'Cosas del campo',    color: '#558B2F', items: ['Tractor','Vaca','Gallina','Trigo','Maiz','Molino','Estancia','Gaucho','Mate'] },
  { category: 'Estaciones del año', color: '#F57F17', items: ['Primavera','Verano','Otoño','Invierno'] },
  { category: 'Signos del zodiaco', color: '#6A1B9A', items: ['Aries','Tauro','Geminis','Cancer','Leo','Virgo','Libra','Escorpio','Sagitario','Capricornio','Acuario','Piscis'] },
  { category: 'Fiestas judías',     color: '#1565C0', items: ['Pesaj','Januca','Purim','Rosh Hashana','Yom Kipur','Sucot','Shavuot','Lag Baomer','Shabbat'] },
  { category: 'Objetos judíos',     color: '#4527A0', items: ['Menora','Mezuza','Kipa','Talit','Shofar','Sidur','Tora','Janukia','Matza'] },
  { category: 'Palabras en hebreo', color: '#283593', items: ['Shalom','Mazel tov','Lehayim','Toda','Sababa','Yalla','Beseder','Chaver','Neshama'] },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function pickGroups() {
  const picked = shuffle(ALL_GROUPS).slice(0, 4);
  return picked.map((g) => ({
    ...g,
    items: shuffle(g.items).slice(0, 4),
  }));
}

interface Group {
  category: string;
  color: string;
  items: string[];
}

interface CardItem {
  word: string;
  groupIndex: number;
}

export default function ConexionesScreen() {
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState<Group[]>([]);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [solved, setSolved] = useState<number[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [won, setWon] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);

  const initGame = useCallback(() => {
    const picked = pickGroups();
    const allCards: CardItem[] = shuffle(
      picked.flatMap((g, gi) => g.items.map((word) => ({ word, groupIndex: gi })))
    );
    setGroups(picked);
    setCards(allCards);
    setSelected([]);
    setSolved([]);
    setMistakes(0);
    setShowModal(false);
    setWon(false);
  }, []);

  useEffect(() => { initGame(); }, []);

  const toggleSelect = (index: number) => {
    if (solved.includes(cards[index].groupIndex)) return;
    setSelected((prev) => {
      if (prev.includes(index)) return prev.filter((i) => i !== index);
      if (prev.length >= 4) return prev;
      return [...prev, index];
    });
  };

  const handleCheck = () => {
    if (selected.length !== 4) return;
    const groupIndices = selected.map((i) => cards[i].groupIndex);
    const allSame = groupIndices.every((g) => g === groupIndices[0]);

    if (allSame) {
      const newSolved = [...solved, groupIndices[0]];
      setSolved(newSolved);
      setSelected([]);
      if (newSolved.length === 4) {
        setWon(true);
        setShowModal(true);
      }
    } else {
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      setSelected([]);
      if (newMistakes >= 4) {
        setWon(false);
        setShowModal(true);
      } else {
        Alert.alert('Incorrecto', 'Esas palabras no son del mismo grupo. Intentá de nuevo.');
      }
    }
  };

  const maxMistakes = 4;
  const livesLeft = maxMistakes - mistakes;

  return (
    <View style={styles.container}>
      <AppHeader title="Conexiones" subtitle="Agrupa las palabras por categoria" showBack />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Vidas */}
        <View style={styles.livesRow}>
          <Text style={styles.livesLabel}>Intentos: </Text>
          {Array.from({ length: maxMistakes }).map((_, i) => (
            <Text key={i} style={styles.lifeIcon}>{i < livesLeft ? '❤️' : '🖤'}</Text>
          ))}
        </View>

        {/* Grupos resueltos */}
        {solved.map((gi) => (
          <View key={gi} style={[styles.solvedGroup, { backgroundColor: groups[gi]?.color }]}>
            <Text style={styles.solvedCategory}>{groups[gi]?.category}</Text>
            <Text style={styles.solvedWords}>{groups[gi]?.items.join(' · ')}</Text>
          </View>
        ))}

        {/* Grilla 4x4 */}
        <View style={styles.grid}>
          {cards.map((card, index) => {
            const isSolved = solved.includes(card.groupIndex);
            const isSelected = selected.includes(index);
            if (isSolved) return null;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => toggleSelect(index)}
                activeOpacity={0.75}
                accessibilityLabel={card.word}
              >
                <Text style={[styles.cardText, isSelected && styles.cardTextSelected]}>
                  {card.word}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Botón confirmar */}
        <TouchableOpacity
          style={[styles.checkBtn, selected.length !== 4 && styles.checkBtnDisabled]}
          onPress={handleCheck}
          disabled={selected.length !== 4}
          activeOpacity={0.8}
        >
          <Text style={styles.checkBtnText}>Confirmar seleccion</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.newGameBtn} onPress={initGame} activeOpacity={0.8}>
          <Text style={styles.newGameBtnText}>🔄 Nuevo juego</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Tutorial */}
      <Modal visible={showTutorial} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>🔗</Text>
            <Text style={styles.modalTitle}>¿Cómo se juega?</Text>
            <View style={styles.answersBox}>
              <Text style={styles.instructionText}>
                Hay 16 palabras divididas en 4 grupos secretos de 4 palabras cada uno.{'\n\n'}
                Tocá 4 palabras que creas que van juntas y presioná{' '}
                <Text style={styles.bold}>Confirmar</Text>.{'\n\n'}
                Si acertás, el grupo se revela. Si te equivocás, perdés un intento.{'\n\n'}
                Tenés <Text style={styles.bold}>4 intentos</Text> antes de perder.
              </Text>
            </View>
            <TouchableOpacity style={styles.modalBtnPrimary} onPress={() => setShowTutorial(false)}>
              <Text style={styles.modalBtnPrimaryText}>¡Entendido, a jugar!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal resultado */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>{won ? '🎉' : '😢'}</Text>
            <Text style={styles.modalTitle}>{won ? '¡Ganaste!' : '¡Perdiste!'}</Text>
            <Text style={styles.modalSub}>
              {won
                ? `Encontraste todos los grupos con ${mistakes} error${mistakes !== 1 ? 'es' : ''}!`
                : 'Se te acabaron los intentos.'}
            </Text>
            {!won && (
              <View style={styles.answersBox}>
                <Text style={styles.answersTitle}>Las respuestas eran:</Text>
                {groups.map((g, i) => (
                  <Text key={i} style={styles.answerLine}>
                    <Text style={{ fontWeight: 'bold', color: g.color }}>{g.category}:</Text>{' '}
                    {g.items.join(', ')}
                  </Text>
                ))}
              </View>
            )}
            <TouchableOpacity style={styles.modalBtnPrimary} onPress={initGame}>
              <Text style={styles.modalBtnPrimaryText}>Jugar de nuevo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, alignItems: 'center', gap: Spacing.md },

  instructionText: { fontSize: FontSizes.md, color: Colors.textSecondary, lineHeight: 22 },
  bold: { fontWeight: 'bold', color: Colors.textPrimary },

  livesRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  livesLabel: { fontSize: FontSizes.md, color: Colors.textSecondary },
  lifeIcon: { fontSize: 20, marginHorizontal: 2 },

  solvedGroup: {
    width: '100%', borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center',
  },
  solvedCategory: { fontSize: FontSizes.lg, fontWeight: 'bold', color: '#fff' },
  solvedWords: { fontSize: FontSizes.sm, marginTop: 2, color: '#fff' },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: Spacing.sm,
    width: '100%',
  },
  card: {
    width: 76, height: 76,
    backgroundColor: Colors.white, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.border, padding: 4,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  cardSelected: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  cardText: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  cardTextSelected: { color: Colors.white },

  checkBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.sm,
    paddingVertical: Spacing.md, alignItems: 'center', width: '100%',
  },
  checkBtnDisabled: { opacity: 0.4 },
  checkBtnText: { color: Colors.white, fontSize: FontSizes.lg, fontWeight: 'bold' },
  newGameBtn: {
    borderWidth: 2, borderColor: Colors.primary, borderRadius: Radius.sm,
    paddingVertical: Spacing.md, alignItems: 'center', width: '100%',
  },
  newGameBtnText: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: 'bold' },

  modalOverlay: {
    flex: 1, backgroundColor: '#00000066',
    alignItems: 'center', justifyContent: 'center',
  },
  modalBox: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.xxl, width: '88%', alignItems: 'center',
  },
  modalIcon: { fontSize: 64, marginBottom: Spacing.md },
  modalTitle: { fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: Spacing.sm },
  modalSub: { fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.md },
  answersBox: { width: '100%', marginBottom: Spacing.lg },
  answersTitle: { fontWeight: 'bold', fontSize: FontSizes.md, color: Colors.textPrimary, marginBottom: Spacing.xs },
  answerLine: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginBottom: 4 },
  modalBtnPrimary: {
    backgroundColor: Colors.primary, borderRadius: Radius.sm,
    paddingVertical: Spacing.md, width: '100%', alignItems: 'center',
  },
  modalBtnPrimaryText: { color: Colors.white, fontSize: FontSizes.lg, fontWeight: 'bold' },
});
