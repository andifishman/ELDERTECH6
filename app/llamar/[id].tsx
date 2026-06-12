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
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { formatearTelefono, uploadFotoContacto } from '@/services/contactosService';
import { useActualizarContacto } from '@/hooks/useContactos';
import { pickImage, takePhoto } from '@/services/authService';
import { hablar } from '@/utils/tts';
import { useAuth } from '@/context/AuthContext';// ─────────────────────────────────────────────────────────────────────────────
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
  const { profile } = useAuth();
  const residenteId = profile?.residente?.id ?? null;
  // Mutación de React Query: al actualizar invalida el caché de la lista de
  // contactos, así la foto nueva aparece al volver a la pantalla Llamar
  const actualizarMutation = useActualizarContacto(residenteId ?? '');

  const nombreCompleto = params.apellido
    ? `${params.nombre} ${params.apellido}`
    : params.nombre;
  const tieneWhatsApp = params.whatsapp === '1';
  const telefonoFormateado = formatearTelefono(params.telefono ?? '');

  // Iniciales para el avatar fallback
  const iniciales =
    (params.nombre?.charAt(0) ?? '').toUpperCase() +
    (params.apellido?.charAt(0) ?? '').toUpperCase();

  // ─── Foto del contacto ────────────────────────────────────────────────────
  const [fotoUri, setFotoUri] = React.useState<string | null>(params.foto_url ?? null);
  const [subiendoFoto, setSubiendoFoto] = React.useState(false);
  const [showFotoModal, setShowFotoModal] = React.useState(false);
  const [fotoError, setFotoError] = React.useState<string | null>(null);

  async function handleUploadFoto(uri: string) {
    if (!params.id) return;
    setFotoUri(uri);           // preview optimista instantáneo
    setSubiendoFoto(true);
    setFotoError(null);
    try {
      const url = await uploadFotoContacto(params.id, uri);
      await actualizarMutation.mutateAsync({
        id: params.id,
        updates: {
          foto_url: url,
          ...(residenteId ? { residente_id: residenteId } : {}),
        },
      });
      setFotoUri(url);
    } catch (e) {
      // Mantener el preview local aunque falle el upload remoto.
      // El detalle técnico va al log; al usuario, un mensaje simple.
      console.error('[Contacto] Error al subir foto:', e instanceof Error ? e.message : e);
      setFotoError('No se pudo guardar la foto. Probá de nuevo más tarde.');
    } finally {
      setSubiendoFoto(false);
    }
  }

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
  // No usar canOpenURL: en Android 11+ devuelve false sin <queries> en el
  // manifest aunque el teléfono pueda llamar. Intentar abrir y capturar el error.
  const handleLlamar = useCallback(async () => {
    const tel = params.telefono;
    if (!tel) return;

    // Hablar el nombre antes de llamar — útil para adultos mayores
    hablar(`Llamando a ${nombreCompleto}`);

    accionPendienteRef.current = 'llamada';
    setMostrarBannerRetorno(false);

    try {
      await Linking.openURL(`tel:${tel}`);
    } catch {
      accionPendienteRef.current = null;
      Alert.alert(
        'No disponible',
        'Este dispositivo no puede realizar llamadas.',
        [{ text: 'Aceptar' }],
      );
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
      // Esquema nativo primero (abre directo la app).
      // No usar canOpenURL: en Android 11+ miente sin <queries> en el manifest.
      await Linking.openURL(urlNativa);
    } catch {
      try {
        // Fallback a URL web (si WhatsApp no está instalado, abre whatsapp.com)
        await Linking.openURL(urlWa);
      } catch {
        accionPendienteRef.current = null;
        Alert.alert(
          'WhatsApp no disponible',
          'No se pudo abrir WhatsApp. Verificá que esté instalado.',
          [{ text: 'Aceptar' }],
        );
      }
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
          {fotoUri ? (
            <Image
              source={{ uri: fotoUri }}
              style={styles.foto}
              accessibilityLabel={`Foto de ${nombreCompleto}`}
            />
          ) : (
            <View style={styles.fotoFallback}>
              <Text style={styles.fotoIniciales}>{iniciales}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.fotoBtn}
            onPress={() => { setFotoError(null); setShowFotoModal(true); }}
            disabled={subiendoFoto}
            accessibilityLabel="Agregar o cambiar foto del contacto"
          >
            {subiendoFoto ? (
              <ActivityIndicator size={16} color="#388E3C" />
            ) : (
              <Ionicons name="camera" size={18} color="#388E3C" />
            )}
            <Text style={styles.fotoBtnTexto}>
              {subiendoFoto ? 'Subiendo...' : fotoUri ? 'Cambiar foto' : 'Agregar foto'}
            </Text>
          </TouchableOpacity>
          {fotoError && (
            <Text style={styles.fotoErrorText}>{fotoError}</Text>
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

      {/* Modal para elegir foto del contacto */}
      <Modal visible={showFotoModal} transparent animationType="fade" onRequestClose={() => setShowFotoModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalEmoji}>📷</Text>
            <Text style={styles.modalTitulo}>Foto de {nombreCompleto}</Text>
            {fotoError && <Text style={styles.fotoErrorText}>{fotoError}</Text>}
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={async () => {
                setShowFotoModal(false);
                const uri = await takePhoto();
                if (uri) handleUploadFoto(uri);
              }}
            >
              <Ionicons name="camera" size={22} color={Colors.text.onDark} />
              <Text style={styles.modalBtnTexto}>Tomar foto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: Colors.brand.greenDark }]}
              onPress={async () => {
                setShowFotoModal(false);
                const uri = await pickImage();
                if (uri) handleUploadFoto(uri);
              }}
            >
              <Ionicons name="images" size={22} color={Colors.text.onDark} />
              <Text style={styles.modalBtnTexto}>Elegir de galería</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnCancelar} onPress={() => setShowFotoModal(false)}>
              <Text style={styles.modalBtnCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  fotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: Spacing.radius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1.5,
    borderColor: '#388E3C',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  fotoBtnTexto: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: '#388E3C',
  },
  foto: {
    width: 160,
    height: 160,
    borderRadius: 20,
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
    borderRadius: 20,
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
  fotoErrorText: {
    fontSize: Typography.size.sm,
    color: Colors.brand.red,
    textAlign: 'center',
    marginTop: Spacing.sm,
    maxWidth: 220,
  },
  // Modal foto
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.screen.horizontal,
  },
  modalBox: {
    backgroundColor: Colors.ui.surface,
    borderRadius: 20,
    padding: Spacing.xxl,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: Spacing.md,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  modalEmoji: { fontSize: 48 },
  modalTitulo: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  modalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: '#66BB6A',
    borderRadius: Spacing.radius.lg,
    paddingVertical: Spacing.lg,
    width: '100%',
  },
  modalBtnTexto: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },
  modalBtnCancelar: {
    paddingVertical: Spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  modalBtnCancelarTexto: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
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
