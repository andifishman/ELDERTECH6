// Pantalla de detalle de contacto — foto grande, nombre y dos botones enormes: Llamar y WhatsApp
import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  AppState,
  AppStateStatus,
  Linking,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { formatearTelefono } from '@/services/contactosService';
import { hablar } from '@/utils/tts';// ─────────────────────────────────────────────────────────────────────────────
// ESTRATEGIA DE RETORNO A LA APP
// ─────────────────────────────────────────────────────────────────────────────
//
// ANDROID:
//   • Al abrir el marcador con "tel:", el SO mueve ElderTech al background.
//   • Cuando el usuario termina/rechaza/no contesta, Android restaura la app
//     que estaba antes del marcador → ElderTech vuelve al primer plano.
//   • Usamos AppState para detectar el retorno (background → active) y
//     mostrar un banner de confirmación amigable.
//   • Limitación: Si el usuario navega a otra app durante la llamada, no hay
//     retorno automático garantizado. El banner le recuerda que puede volver.
//
// iOS:
//   • iOS NO retorna automáticamente a la app luego de una llamada.
//   • La mejor alternativa es una notificación local programada que aparece
//     al terminar la llamada (expo-notifications), pero requiere permisos
//     adicionales. Por ahora, mostramos un banner claro con el botón "Volver".
//   • El banner usa AppState: cuando la app vuelve a active después de una
//     llamada, muestra "¿Terminó la llamada? Tocá Volver." en tamaño grande.
//
// WHATSAPP:
//   • Se abre con https://wa.me/<número> — abre directamente la conversación.
//   • Retorno: igual que llamadas, detectado por AppState → active.
//   • No hay deep link de WhatsApp → ElderTech, por restricciones de sandboxing.
// ─────────────────────────────────────────────────────────────────────────────

export default function ContactoDetalleScreen() {
  const params = useLocalSearchParams<{
    id: string;
    nombre: string;
    apellido?: string;
    telefono: string;
    whatsapp?: string;
    foto_url?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const nombreCompleto = params.apellido
    ? `${params.nombre} ${params.apellido}`
    : params.nombre;
  const tieneWhatsApp = params.whatsapp === '1';
  const telefonoFormateado = formatearTelefono(params.telefono ?? '');

  // Iniciales para el avatar fallback
  const iniciales =
    (params.nombre?.charAt(0) ?? '').toUpperCase() +
    (params.apellido?.charAt(0) ?? '').toUpperCase();

  // ─── Retorno automático via AppState ────────────────────────────────────────
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const accionPendienteRef = useRef<'llamada' | 'whatsapp' | null>(null);
  const [mostrarBannerRetorno, setMostrarBannerRetorno] = React.useState(false);
  const [textoAccion, setTextoAccion] = React.useState('');

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      // App vuelve al primer plano después de haber ido al background
      if (
        (prev === 'background' || prev === 'inactive') &&
        nextState === 'active' &&
        accionPendienteRef.current
      ) {
        const accion = accionPendienteRef.current;
        accionPendienteRef.current = null;

        setTextoAccion(
          accion === 'llamada'
            ? '¿Terminó la llamada?'
            : '¿Terminó la conversación?',
        );
        setMostrarBannerRetorno(true);

        // En Android la app ya volvió — ocultar banner automáticamente a los 6s
        if (Platform.OS === 'android') {
          setTimeout(() => setMostrarBannerRetorno(false), 6000);
        }
      }
    });

    return () => sub.remove();
  }, []);

  // ─── Llamada telefónica ────────────────────────────────────────────────────
  const handleLlamar = useCallback(async () => {
    const tel = params.telefono;
    if (!tel) return;

    const url = `tel:${tel}`;
    const puedeAbrir = await Linking.canOpenURL(url);

    if (!puedeAbrir) {
      Alert.alert(
        'No disponible',
        'Este dispositivo no puede realizar llamadas.',
        [{ text: 'Aceptar' }],
      );
      return;
    }

    // Hablar el nombre antes de llamar — útil para adultos mayores
    hablar(`Llamando a ${nombreCompleto}`);

    accionPendienteRef.current = 'llamada';
    setMostrarBannerRetorno(false);

    try {
      await Linking.openURL(url);
    } catch {
      accionPendienteRef.current = null;
      Alert.alert('Error', 'No se pudo iniciar la llamada. Intentá de nuevo.');
    }
  }, [params.telefono, nombreCompleto]);

  // ─── WhatsApp ─────────────────────────────────────────────────────────────
  const handleWhatsApp = useCallback(async () => {
    const tel = params.telefono;
    if (!tel) return;

    // Número limpio sin el "+" para wa.me
    const numLimpio = tel.replace(/\D/g, '');

    // URL oficial de WhatsApp Click-to-Chat
    // Formato: https://wa.me/<número_internacional_sin_+>
    const urlWa = `https://wa.me/${numLimpio}`;

    // Fallback con esquema nativo (mejor en algunos dispositivos Android)
    const urlNativa = `whatsapp://send?phone=${numLimpio}`;

    hablar(`Abriendo WhatsApp de ${nombreCompleto}`);

    accionPendienteRef.current = 'whatsapp';
    setMostrarBannerRetorno(false);

    try {
      // Intentar esquema nativo primero (abre directo la app)
      const puedeNativo = await Linking.canOpenURL(urlNativa);
      if (puedeNativo) {
        await Linking.openURL(urlNativa);
      } else {
        // Fallback a URL web (si WhatsApp no está instalado, abre whatsapp.com)
        await Linking.openURL(urlWa);
      }
    } catch {
      accionPendienteRef.current = null;
      Alert.alert(
        'WhatsApp no disponible',
        'No se pudo abrir WhatsApp. Verificá que esté instalado.',
        [{ text: 'Aceptar' }],
      );
    }
  }, [params.telefono, nombreCompleto]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.flex}>
      {/* Header personalizado con botón volver grande */}
      <LinearGradient
        colors={['#388E3C', '#66BB6A']}
        style={[styles.headerGradient, { paddingTop: insets.top }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.volverBtn}
            onPress={() => router.back()}
            accessibilityLabel="Volver a contactos"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={28} color={Colors.text.onDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitulo} numberOfLines={1}>
            {nombreCompleto}
          </Text>
          {/* Botón escuchar */}
          <TouchableOpacity
            style={styles.volverBtn}
            onPress={() =>
              hablar(
                `Contacto: ${nombreCompleto}. Teléfono: ${telefonoFormateado}. ` +
                `Tocá el botón verde para llamar${tieneWhatsApp ? ', o el botón de WhatsApp para enviarle un mensaje' : ''}.`
              )
            }
            accessibilityLabel="Escuchar descripción de pantalla"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="volume-high" size={26} color={Colors.text.onDark} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Foto grande */}
        <View style={styles.fotoContainer}>
          {params.foto_url ? (
            <Image
              source={{ uri: params.foto_url }}
              style={styles.foto}
              accessibilityLabel={`Foto de ${nombreCompleto}`}
            />
          ) : (
            <View style={styles.fotoFallback}>
              <Text style={styles.fotoIniciales}>{iniciales}</Text>
            </View>
          )}
        </View>

        {/* Nombre grande */}
        <Text style={styles.nombre}>{nombreCompleto}</Text>

        {/* Teléfono */}
        <Text style={styles.telefono}>{telefonoFormateado}</Text>

        {/* ── BOTONES PRINCIPALES ── */}
        <View style={styles.botonesContainer}>

          {/* Botón LLAMAR */}
          <TouchableOpacity
            style={[styles.botonAccion, styles.botonLlamar]}
            onPress={handleLlamar}
            activeOpacity={0.8}
            accessibilityLabel={`Llamar a ${nombreCompleto}`}
            accessibilityRole="button"
          >
            <View style={styles.botonIconoWrapper}>
              {Platform.OS === 'ios' ? (
                // iOS — auricular verde, estilo Apple Phone
                <Ionicons name="call" size={36} color={Colors.text.onDark} />
              ) : (
                // Android — auricular estilo Google Phone
                <FontAwesome5 name="phone-alt" size={32} color={Colors.text.onDark} />
              )}
            </View>
            <Text style={styles.botonTexto}>
              {Platform.OS === 'ios' ? 'Llamar' : 'Llamar'}
            </Text>
          </TouchableOpacity>

          {/* Botón WHATSAPP */}
          {tieneWhatsApp && (
            <TouchableOpacity
              style={[styles.botonAccion, styles.botonWhatsApp]}
              onPress={handleWhatsApp}
              activeOpacity={0.8}
              accessibilityLabel={`Abrir WhatsApp de ${nombreCompleto}`}
              accessibilityRole="button"
            >
              <View style={styles.botonIconoWrapper}>
                <FontAwesome5 name="whatsapp" size={38} color={Colors.text.onDark} />
              </View>
              <Text style={styles.botonTexto}>WhatsApp</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Aviso si no tiene WhatsApp */}
        {!tieneWhatsApp && (
          <Text style={styles.sinWhatsApp}>
            Este contacto no tiene WhatsApp configurado.
          </Text>
        )}

        {/* Info sobre retorno a la app */}
        <View style={styles.infoRetorno}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.text.secondary} />
          <Text style={styles.infoRetornoTexto}>
            {Platform.OS === 'android'
              ? 'Al terminar la llamada, la app se abrirá automáticamente.'
              : 'Al terminar la llamada, volvé a ElderTech tocando el ícono de la app.'}
          </Text>
        </View>
      </ScrollView>

      {/* Banner de retorno — aparece cuando la app vuelve al primer plano */}
      {mostrarBannerRetorno && (
        <View style={[styles.bannerRetorno, { bottom: insets.bottom + 16 }]}>
          <Text style={styles.bannerTexto}>{textoAccion}</Text>
          <TouchableOpacity
            style={styles.bannerBtn}
            onPress={() => {
              setMostrarBannerRetorno(false);
              router.back();
            }}
            accessibilityLabel="Volver a la lista de contactos"
            accessibilityRole="button"
          >
            <Ionicons name="home" size={22} color="#66BB6A" />
            <Text style={styles.bannerBtnTexto}>Volver</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  // Header
  headerGradient: {
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.screen.horizontal,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  volverBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitulo: {
    flex: 1,
    fontSize: 24,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
    textAlign: 'center',
  },
  // Scroll
  scroll: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    paddingHorizontal: Spacing.screen.horizontal,
  },
  // Foto
  fotoContainer: {
    marginBottom: Spacing.xl,
  },
  foto: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: Colors.ui.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  fotoFallback: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#66BB6A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.ui.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  fotoIniciales: {
    fontSize: 64,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },
  // Nombre y teléfono
  nombre: {
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.heavy,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    lineHeight: 40,
  },
  telefono: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.medium,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
  },
  // Botones de acción
  botonesContainer: {
    width: '100%',
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  botonAccion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.radius.xl,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 88,  // muy grande — adultos mayores
  },
  botonLlamar: {
    backgroundColor: '#388E3C',
  },
  botonWhatsApp: {
    backgroundColor: '#25D366', // color oficial de WhatsApp
  },
  botonIconoWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waIcono: {
    fontSize: 32,
  },
  botonTexto: {
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
    letterSpacing: 0.5,
  },
  sinWhatsApp: {
    fontSize: Typography.size.sm,
    color: Colors.text.hint,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  // Info sobre retorno
  infoRetorno: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: Spacing.radius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  infoRetornoTexto: {
    flex: 1,
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  // Banner de retorno automático
  bannerRetorno: {
    position: 'absolute',
    left: Spacing.screen.horizontal,
    right: Spacing.screen.horizontal,
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 2,
    borderColor: '#66BB6A',
    gap: Spacing.md,
  },
  bannerTexto: {
    flex: 1,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  bannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(102,187,106,0.12)',
    borderRadius: Spacing.radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: Spacing.touch.comfortable,
  },
  bannerBtnTexto: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: '#388E3C',
  },
});
