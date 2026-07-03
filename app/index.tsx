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
import { useAuth } from '@/context/AuthContext';
import { usePrefetchHome } from '@/hooks/usePrefetchHome';
import { ProximaActividadWidget } from '@/components/home/ProximaActividadWidget';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

//datos de cada botón del menú: ícono, texto, color y audio de descripción
const menuItems = [
  {
    id: 'horarios',
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
    icon: '➕',
    label: 'Más',
    subtitle: 'Ver más opciones de la aplicación',
    color: '#FFA726',
    iconBg: '#FFCC80',
    size: 'medium',
    audio: 'Más opciones. Acá encontrás juegos, radio, noticias, clima, linterna y más.',
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
  const { profile } = useAuth();
  usePrefetchHome();

  const speak = (text: string) => {
    Speech.stop();
    Speech.speak(text, { language: 'es-AR', rate: 0.9 });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.logoText}>ElderTech</Text>
          <TouchableOpacity
            onPress={() => router.push('/profile')}
            style={styles.profileBtn}
            accessibilityLabel="Mi perfil"
            accessibilityRole="button"
          >
            <Text style={styles.profileBtnText}>Mi Perfil</Text>
          </TouchableOpacity>
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
          onPress={() => router.push('/horarios')}
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

        {/* Medium Cards — fila 1 */}
        <View style={styles.mediumRow}>
          {menuItems.slice(1, 3).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.mediumCard, { backgroundColor: item.color }]}
              onPress={() => router.push(`/${item.id}` as any)}
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
        </View>

        {/* Medium Cards — fila 2 */}
        <View style={styles.mediumRow}>
          {menuItems.slice(3, 5).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.mediumCard, { backgroundColor: item.color }]}
              onPress={() => router.push(`/${item.id}` as any)}
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
        </View>
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
    paddingLeft: 40,
    paddingRight: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
  },
  logoText: {
    flex: 1,
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 46,
  },
  profileBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  profileBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
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
  mediumCardInner: {
    flex: 1,
    marginBottom: 12,
  },
  mediumCardIcon: { fontSize: 26 },
  mediumCardLabel: { fontSize: 29, fontWeight: 'bold', color: '#FFFFFF', marginTop: 4 },

});
