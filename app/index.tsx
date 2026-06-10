//pantalla principal (home) con el menu de accesos directos — Horarios, Llamar, Tutoriales, Asistente, Más
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useState } from 'react';
import {
  BackHandler,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
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
  const [showLogout, setShowLogout] = useState(false);
  const insets = useSafeAreaInsets();
  const fecha = getFechaHoy();
  const { profile } = useAuth();

  const speak = (text: string) => {
    Speech.stop();
    Speech.speak(text, { language: 'es-AR', rate: 0.9 });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/logo-puente.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>ElderTech</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/profile')}
            style={styles.avatarBtn}
            accessibilityLabel="Mi perfil"
          >
            {profile?.residente?.foto_url ? (
              <Image
                source={{ uri: profile.residente.foto_url }}
                style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: '#FFFFFF' }}
              />
            ) : (
              <Text style={styles.avatarIcon}>👤</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcome} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Hoy es {fecha}</Text>
      </View>

      {/* Menu Grid */}
      <ScrollView
        contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
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

      {/* Logout Modal */}
      <Modal visible={showLogout} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>🚪</Text>
            <Text style={styles.modalTitle}>¿Querés salir?</Text>
            <Text style={styles.modalSub}>¿Estás seguro que querés cerrar la aplicación?</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalBtnDanger}
                onPress={() => {
                  // En web cierra la pestaña del browser, en Android cierra la app
                  if (Platform.OS === 'web') {
                    window.close();
                  } else {
                    BackHandler.exitApp();
                  }
                }}
              >
                <Text style={styles.modalBtnDangerText}>Salir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setShowLogout(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  // Header
  header: {
    backgroundColor: '#4CAF50',
    paddingBottom: 12,
    paddingHorizontal: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoImage: { width: 80, height: 80, marginRight: -8 },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logoText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 46,
    marginLeft: 8,
  },
  // Botón de usuario — mismo tamaño que los botones del AppHeader
  avatarBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  avatarIcon: { fontSize: 28, color: '#FFFFFF' },

  // Welcome
  welcomeSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  welcome: { color: '#2E3A59', fontSize: 26, fontWeight: 'bold', marginBottom: 2 },

  // Grid
  grid: { padding: 14, paddingTop: 4, gap: 12 },

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
  largeCardLabel: { fontSize: 30, fontWeight: 'bold', color: '#FFFFFF' },

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
  mediumCardLabel: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginTop: 4 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIcon: { fontSize: 60, marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#2E3A59', marginBottom: 10, textAlign: 'center' },
  modalSub: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  modalBtns: { flexDirection: 'row', gap: 15, width: '100%' },
  modalBtnDanger: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 15,
    flex: 1,
    alignItems: 'center',
  },
  modalBtnDangerText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  modalBtnCancel: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingVertical: 15,
    flex: 1,
    alignItems: 'center',
  },
  modalBtnCancelText: { color: '#2E3A59', fontWeight: 'bold', fontSize: 16 },
});
