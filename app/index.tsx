//pantalla principal (home) con el menu de accesos directos — Horarios, Llamar, Tutoriales, Asistente, Más
import { RUTA_HORARIOS } from '@/constants/features';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { hablar } from '@/utils/tts';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { usePrefetchHome } from '@/hooks/usePrefetchHome';
import { useNovedadesSinLeer } from '@/hooks/useNovedades';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

//datos de cada botón del menú: ícono, texto, color y audio de descripción
interface MenuItem {
  id: string;
  route: string;
  icon: string;
  label: string;
  subtitle: string;
  color: string;
  iconBg: string;
  size: 'large' | 'medium';
  audio: string;
}

const menuItems: MenuItem[] = [
  {
    id: 'horarios',
    route: RUTA_HORARIOS,
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
    color: '#0097A7',
    iconBg: '#80DEEA',
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
  {
    id: 'hablemos',
    route: '/mas/hablemos',
    icon: '💬',
    label: 'Hablemos',
    subtitle: 'Mandale mensajes a otros residentes',
    color: '#5F3E88',
    iconBg: '#B9A5D6',
    size: 'medium',
    audio: 'Hablemos. Mandá mensajes de texto o de voz a otros residentes.',
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

//parlante al lado del ícono de cada tarjeta — lee en voz alta de qué se trata la sección
function BotonParlante({ item, onPress }: { item: MenuItem; onPress: (texto: string) => void }) {
  return (
    <TouchableOpacity
      style={styles.parlanteBtn}
      onPress={() => onPress(item.audio)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Escuchar qué es ${item.label}`}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <Text style={styles.parlanteIcon}>🔊</Text>
    </TouchableOpacity>
  );
}

//botón "Novedades" arriba de la fecha — abre las noticias de la residencia y avisa cuántas no se leyeron
function BotonNovedades({ onPress, onEscuchar }: { onPress: () => void; onEscuchar: (texto: string) => void }) {
  const sinLeer = useNovedadesSinLeer();
  const detalle = sinLeer === 0 ? 'Sin novedades nuevas' : sinLeer === 1 ? '1 novedad nueva' : `${sinLeer} novedades nuevas`;
  const audio = `Novedades. Acá te enterás de las noticias de la residencia. ${sinLeer === 0 ? 'No tenés novedades nuevas.' : `Tenés ${detalle}.`}`;

  return (
    <TouchableOpacity
      style={styles.novedadesCard}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Novedades. ${detalle}`}
    >
      <View style={styles.novedadesIcono}>
        <Image
          source={require('../assets/images/logo-novedades.png')}
          style={styles.novedadesLogo}
          resizeMode="contain"
          accessibilityElementsHidden
        />
      </View>
      <View style={styles.novedadesTextos}>
        <Text style={styles.novedadesLabel}>Novedades</Text>
        {sinLeer > 0 ? (
          <View style={styles.novedadesBadge}>
            <Text style={styles.novedadesBadgeTexto}>{detalle}</Text>
          </View>
        ) : (
          <Text style={styles.novedadesDetalle}>{detalle}</Text>
        )}
      </View>
      <TouchableOpacity
        style={[styles.parlanteBtn, styles.novedadesParlante]}
        onPress={() => onEscuchar(audio)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Escuchar qué es Novedades"
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Text style={styles.parlanteIcon}>🔊</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fecha = getFechaHoy();
  usePrefetchHome();

  // Tarjetas medianas en filas de a 2 — genérico así agregar/sacar una no
  // rompe el layout (la última fila puede quedar con una sola, ocupa el ancho entero).
  const mediumItems = menuItems.slice(1);
  const mediumRows: MenuItem[][] = [];
  for (let i = 0; i < mediumItems.length; i += 2) {
    mediumRows.push(mediumItems.slice(i, i + 2));
  }

  const speak = (text: string) => {
    void hablar(text, { rate: 0.9, alternar: false });
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
        {/* Novedades de la residencia */}
        <BotonNovedades onPress={() => router.push('/novedades' as any)} onEscuchar={speak} />

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcome} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Hoy es {fecha}</Text>
        </View>

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
            <BotonParlante item={menuItems[0]} onPress={speak} />
            <Text style={styles.largeCardLabel}>{menuItems[0].label}</Text>
          </View>
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
                <View style={styles.iconRow}>
                  <View style={[styles.iconCircle, { backgroundColor: item.iconBg }]}>
                    <Text style={styles.mediumCardIcon}>{item.icon}</Text>
                  </View>
                  <BotonParlante item={item} onPress={speak} />
                </View>
                <View style={styles.mediumCardLabelZona}>
                  <Text style={styles.mediumCardLabel}>{item.label}</Text>
                </View>
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
    backgroundColor: Colors.brand.primary,
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
  // Botón "¿Cómo usar?" — fondo blanco casi sólido como los parlantes de las
  // tarjetas, así se reconoce como un botón en toda la Home.
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
    color: Colors.brand.primary,
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
  },
  // Ícono de la sección a la izquierda y parlante contra el borde derecho — los dos
  // quedan a la misma distancia de su borde (el padding de la tarjeta)
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  // Parlante "Escuchar" — mismo tamaño que el círculo del ícono, fondo blanco como el viejo botón
  parlanteBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  parlanteIcon: { fontSize: 28 },

  // Botón Novedades — blanco con borde violeta, para que se distinga de las tarjetas de secciones
  novedadesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 3,
    borderColor: Colors.brand.primary,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  novedadesIcono: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  novedadesLogo: { width: 56, height: 56 },
  novedadesTextos: { flex: 1, gap: 4 },
  novedadesLabel: { fontSize: 29, fontWeight: 'bold', color: Colors.brand.primary },
  novedadesDetalle: { fontSize: 17, color: '#212121' },
  novedadesBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.hablemos.noLeidosBadge,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  novedadesBadgeTexto: { fontSize: 17, fontWeight: 'bold', color: '#FFFFFF' },
  // El parlante blanco no se vería sobre la tarjeta blanca — acá va sobre lila
  novedadesParlante: { backgroundColor: '#E9E2F2' },

  // Large Card (Horarios)
  largeCard: {
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    // 30% más alta que su contenido (58 de ícono + 2×16 de padding = 90), contenido centrado
    minHeight: 117,
    padding: 16,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  largeCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  largeCardIcon: { fontSize: 30 },
  largeCardLabel: { fontSize: 36, fontWeight: 'bold', color: '#FFFFFF' },

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
    minHeight: 165,
    padding: 16,
    paddingBottom: 0,
    flexDirection: 'column',
  },
  // Ocupa todo el alto debajo del ícono, hasta el borde inferior de la tarjeta, y centra
  // el nombre ahí — queda a la misma distancia del ícono que del borde de abajo.
  mediumCardLabelZona: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  mediumCardPlaceholder: {
    flex: 1,
  },
  mediumCardIcon: { fontSize: 26 },
  mediumCardLabel: { fontSize: 29, fontWeight: 'bold', color: '#FFFFFF' },

});
