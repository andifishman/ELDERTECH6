//pantalla principal (home) con el menu de accesos directos — Horarios, Llamar, Tutoriales, Asistente, Más
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { usePrefetchHome } from '@/hooks/usePrefetchHome';
import { ProximaActividadWidget } from '@/components/home/ProximaActividadWidget';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

//datos de cada botón del menú: ícono, texto, color y audio de descripción
const menuItems = [
  {
    id: 'horarios',
    route: '/horarios',
    icon: '📅',
    label: 'Horarios',
    subtitle: 'Actividades de la semana',
    color: '#E57373',
    iconBg: '#EF9A9A',
    size: 'large',
    audio: 'Horarios. Acá podés ver todas las actividades de la semana, con sus horarios y descripciones.',
  },
  {
    id: 'llamar',
    route: '/llamar',
    icon: '📞',
    label: 'Llamar',
    subtitle: 'Contactar a personas',
    color: '#66BB6A',
    iconBg: '#A5D6A7',
    size: 'medium',
    audio: 'Llamar. Desde acá podés llamar o escribirle por WhatsApp a tu familia y amigos.',
  },
  {
    id: 'articulos',
    route: '/articulos',
    icon: '📚',
    label: 'Tutoriales',
    subtitle: 'Aprendé con videos',
    color: '#AB47BC',
    iconBg: '#CE93D8',
    size: 'medium',
    audio: 'Tutoriales. Encontrás guías y videos para aprender a usar el celular paso a paso.',
  },
  {
    id: 'asistente',
    route: '/asistente',
    icon: '🤖',
    label: 'Asistente',
    subtitle: 'Asistente personal para ayudas',
    color: '#42A5F5',
    iconBg: '#90CAF9',
    size: 'medium',
    audio: 'Asistente. Podés hacerle preguntas y te va a responder de forma simple y clara.',
  },
  {
    id: 'mas',
    route: '/mas',
    icon: '➕',
    label: 'Más',
    subtitle: 'Ver más opciones de la aplicación',
    color: '#FFA726',
    iconBg: '#FFCC80',
    size: 'medium',
    audio: 'Más opciones. Acá encontrás juegos, radio, noticias, clima, linterna y más.',
  },
  {
    id: 'hablemos',
    route: '/mas/hablemos',
    icon: '💬',
    label: 'Hablemos',
    subtitle: 'Mandale mensajes a otros residentes',
    color: '#00897B',
    iconBg: '#4DB6AC',
    size: 'medium',
    audio: 'Hablemos. Mandá mensajes de texto o de voz a otros residentes.',
  },
  {
    id: 'agenda',
    route: '/agenda',
    icon: '🗒️',
    label: 'Agenda',
    subtitle: 'Tu agenda personal',
    color: '#5C6BC0',
    iconBg: '#9FA8DA',
    size: 'medium',
    audio: 'Agenda. Muy pronto vas a poder ver tu agenda personal acá.',
  },
];

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function getFechaHoy() {
  const hoy = new Date();
  const diaSemana = DIAS[hoy.getDay()];
  const diaMes = hoy.getDate();
  const mes = MESES[hoy.getMonth()];
  return `${diaSemana} ${diaMes} de ${mes}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fecha = getFechaHoy();
  usePrefetchHome();

  // Tarjetas medianas en filas de a 2 — genérico así agregar/sacar una no
  // rompe el layout (la última fila puede quedar con una sola, ocupa el ancho entero).
  const mediumItems = menuItems.slice(1);
  const mediumRows: (typeof menuItems)[] = [];
  for (let i = 0; i < mediumItems.length; i += 2) {
    mediumRows.push(mediumItems.slice(i, i + 2));
  }

  const speak = (text: string) => {
    Speech.stop();
    Speech.speak(text, { language: 'es-AR', rate: 0.9 });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerRow}>
          {/* Botón bien visible — abre la guía "¿Cómo usar?" con explicaciones
              simples de cada sección de la aplicación. */}
          <TouchableOpacity
            style={styles.comoUsarBtn}
            onPress={() => router.push('/como-usar' as any)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="¿Cómo usar la aplicación? Abre una guía con explicaciones simples"
          >
            <Text style={styles.comoUsarBtnTexto}>¿Cómo usar?</Text>
          </TouchableOpacity>
          <Text style={styles.logoText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            ElderTech
          </Text>
        </View>
      </View>

      {/* Menu Grid */}
      <ScrollView
        contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcome} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Hoy es {fecha}</Text>
        </View>

        {/* Widget próxima actividad */}
        <ProximaActividadWidget />

        {/* Large Horarios Card */}
        <TouchableOpacity
          style={[styles.largeCard, { backgroundColor: menuItems[0].color }]}
          onPress={() => router.push(menuItems[0].route as any)}
          activeOpacity={0.8}
        >
          <View style={styles.largeCardInner}>
            <View style={[styles.iconCircle, { backgroundColor: menuItems[0].iconBg }]}>
              <Text style={styles.largeCardIcon}>{menuItems[0].icon}</Text>
            </View>
            <Text style={styles.largeCardLabel}>{menuItems[0].label}</Text>
          </View>
          <TouchableOpacity
            style={styles.audioBtn}
            onPress={() => speak(menuItems[0].audio)}
            activeOpacity={0.7}
          >
            <Text style={styles.audioBtnText}>🔊  Escuchar</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Medium Cards */}
        {mediumRows.map((fila, i) => (
          <View key={i} style={styles.mediumRow}>
            {fila.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.mediumCard, { backgroundColor: item.color }]}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.8}
              >
                <View style={styles.mediumCardInner}>
                  <View style={[styles.iconCircle, { backgroundColor: item.iconBg }]}>
                    <Text style={styles.mediumCardIcon}>{item.icon}</Text>
                  </View>
                  <Text style={styles.mediumCardLabel}>{item.label}</Text>
                </View>
                <TouchableOpacity
                  style={styles.audioBtn}
                  onPress={() => speak(item.audio)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.audioBtnText}>🔊  Escuchar</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            {/* Fila incompleta (ej. mientras solo hay 1 tarjeta nueva) — placeholder
                invisible para que la tarjeta real quede del mismo tamaño, pegada
                a la izquierda, dejando el lugar reservado para la próxima sección. */}
            {fila.length === 1 && <View style={styles.mediumCardPlaceholder} />}
          </View>
        ))}
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  // Header
  header: {
    backgroundColor: '#4CAF50',
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 52,
    gap: 10,
  },
  // Botón "¿Cómo usar?" — mismo estilo cuadrado que los botones "Escuchar"
  // de las tarjetas (fondo blanco casi sólido, esquinas poco redondeadas),
  // así se reconoce como el mismo tipo de botón en toda la Home.
  comoUsarBtn: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 11,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  comoUsarBtnTexto: {
    color: '#2E7D32',
    fontWeight: 'bold',
    fontSize: 20,
  },
  logoText: {
    flexShrink: 1,
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 42,
    textAlign: 'right',
  },

  // Welcome
  welcomeSection: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
  },
  welcome: { color: '#2E3A59', fontSize: 26, fontWeight: 'bold', marginBottom: 2 },

  // Grid
  grid: { padding: 14, paddingTop: 2, gap: 12 },

  // Shared icon circle
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  // Large Card (Horarios)
  largeCard: {
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    padding: 16,
    paddingBottom: 14,
    flexDirection: 'column',
  },
  largeCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  largeCardIcon: { fontSize: 30 },
  largeCardLabel: { fontSize: 36, fontWeight: 'bold', color: '#FFFFFF' },

  // Botón Escuchar — rectangular redondeado, fondo blanco, texto azul
  audioBtn: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  audioBtnText: { fontSize: 16, fontWeight: '700', color: '#3D5AFE' },

  // Medium Cards
  mediumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  mediumCard: {
    flex: 1,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    minHeight: 210,
    padding: 16,
    paddingBottom: 14,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  mediumCardPlaceholder: {
    flex: 1,
  },
  mediumCardInner: {
    flex: 1,
    marginBottom: 12,
  },
  mediumCardIcon: { fontSize: 26 },
  mediumCardLabel: { fontSize: 29, fontWeight: 'bold', color: '#FFFFFF', marginTop: 4 },

});
