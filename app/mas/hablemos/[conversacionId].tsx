// Hablemos — pantalla de chat 1:1
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import {
  useConversacionesHablemos,
  useEnviarMensajeAudioHablemos,
  useEnviarMensajeTextoHablemos,
  useMarcarLeidosHablemos,
  useMarcarRecibidosHablemos,
  useMensajesHablemos,
} from '@/hooks/useHablemos';
import { useMensajesRealtime } from '@/hooks/useHablemosRealtime';
import { formatHoraDeISO, formatFechaSeparadorChat, esMismodia } from '@/utils/dateUtils';
import { setConversacionHablemosActiva } from '@/utils/hablemosActiveChat';
import type { EstadoMensajeHablemos, MensajeHablemos } from '@/services/hablemosService';

function formatearDuracion(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const ESTADO_TEXTO: Record<EstadoMensajeHablemos, string> = {
  enviado: 'Enviado',
  recibido: 'Recibido',
  leido: 'Leído',
};

export default function HablemosChatScreen() {
  const { conversacionId } = useLocalSearchParams<{ conversacionId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, isLoading: authLoading } = useAuth();
  const propioResidenteId = profile?.residente?.id ?? null;

  const { data: conversaciones } = useConversacionesHablemos();
  const conversacion = useMemo(() => conversaciones?.find((c) => c.id === conversacionId), [conversaciones, conversacionId]);
  const otro = conversacion?.otroParticipante;

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useMensajesHablemos(conversacionId);
  const mensajes = useMemo(() => data?.pages.flat() ?? [], [data]);

  useMensajesRealtime(conversacionId, propioResidenteId);

  const enviarTexto = useEnviarMensajeTextoHablemos(conversacionId);
  const enviarAudio = useEnviarMensajeAudioHablemos(conversacionId);
  const marcarRecibidos = useMarcarRecibidosHablemos(conversacionId);
  const marcarLeidos = useMarcarLeidosHablemos(conversacionId);

  const [input, setInput] = useState('');
  const [grabando, setGrabando] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [duracionSegundos, setDuracionSegundos] = useState(0);
  const [reproduciendoId, setReproduciendoId] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const inicioGrabacionRef = useRef<number>(0);

  // Marca "esta conversación está abierta" — el handler de push la consulta para no mostrar la alerta.
  useFocusEffect(
    useCallback(() => {
      setConversacionHablemosActiva(conversacionId);
      return () => setConversacionHablemosActiva(null);
    }, [conversacionId]),
  );

  // Al entrar (y cada vez que llega un mensaje nuevo) se marca todo lo pendiente como recibido/leído.
  useEffect(() => {
    if (!conversacionId || mensajes.length === 0) return;
    marcarRecibidos.mutate();
    marcarLeidos.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversacionId, mensajes.length]);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const enviarTextoActual = useCallback(async () => {
    const texto = input.trim();
    if (!texto) return;
    setInput('');
    try {
      await enviarTexto.mutateAsync(texto);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo enviar el mensaje.';
      Alert.alert('Error', msg);
      setInput(texto);
    }
  }, [input, enviarTexto]);

  const iniciarGrabacion = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permiso de micrófono', 'Para grabar audio, activá el permiso en los ajustes del teléfono.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      inicioGrabacionRef.current = Date.now();
      setGrabando(true);
    } catch (err) {
      console.warn('[Hablemos] Error al iniciar grabación:', err);
      Alert.alert('Error', 'No se pudo iniciar el micrófono. Intentá de nuevo.');
    }
  }, []);

  const detenerGrabacion = useCallback(async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setGrabando(false);
      if (uri) {
        setAudioUri(uri);
        setDuracionSegundos(Math.round((Date.now() - inicioGrabacionRef.current) / 1000));
      }
    } catch (err) {
      console.warn('[Hablemos] Error al detener grabación:', err);
      setGrabando(false);
    }
  }, []);

  const cancelarGrabacion = useCallback(async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch {}
    recordingRef.current = null;
    setGrabando(false);
  }, []);

  const descartarAudio = useCallback(() => {
    setAudioUri(null);
    setDuracionSegundos(0);
  }, []);

  const enviarAudioActual = useCallback(async () => {
    if (!audioUri) return;
    const uri = audioUri;
    const duracion = duracionSegundos;
    setAudioUri(null);
    setDuracionSegundos(0);
    try {
      await enviarAudio.mutateAsync({ audioUri: uri, duracionSegundos: duracion });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo enviar el mensaje de voz.';
      Alert.alert('Error', msg);
    }
  }, [audioUri, duracionSegundos, enviarAudio]);

  const reproducirAudioPropio = useCallback(async () => {
    if (!audioUri) return;
    try {
      if (soundRef.current) await soundRef.current.unloadAsync();
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri }, { shouldPlay: true });
      soundRef.current = sound;
    } catch (err) {
      console.warn('[Hablemos] Error al reproducir:', err);
    }
  }, [audioUri]);

  const toggleReproducirMensaje = useCallback(
    async (mensaje: MensajeHablemos) => {
      if (!mensaje.audio_url) return;
      if (reproduciendoId === mensaje.id) {
        await soundRef.current?.stopAsync().catch(() => {});
        setReproduciendoId(null);
        return;
      }
      try {
        if (soundRef.current) await soundRef.current.unloadAsync();
        const { sound } = await Audio.Sound.createAsync({ uri: mensaje.audio_url }, { shouldPlay: true });
        soundRef.current = sound;
        setReproduciendoId(mensaje.id);
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) setReproduciendoId(null);
        });
      } catch (err) {
        console.warn('[Hablemos] Error al reproducir:', err);
      }
    },
    [reproduciendoId],
  );

  const nombreOtro = otro ? `${otro.nombre} ${otro.apellido}` : 'Residente';

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} accessibilityLabel="Volver" accessibilityRole="button">
          <Ionicons name="arrow-back" size={26} color={Colors.text.onDark} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          {otro?.foto_url ? (
            <Image source={{ uri: otro.foto_url }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerAvatarInicial}>{nombreOtro.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.headerTitulo} numberOfLines={1}>{nombreOtro}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 72 : 0}
      >
        <View style={styles.flex}>
          {isLoading || authLoading ? (
            <View style={styles.centrado}>
              <ActivityIndicator size="large" color={Colors.hablemos.accent} />
            </View>
          ) : (
            <FlatList
              data={mensajes}
              keyExtractor={(item) => item.id}
              inverted
              // Fuerza a recalcular esPropio/nombreRemitente si el perfil termina
              // de cargar después del primer render — si no, mensajes propios
              // podían quedar pegados del lado equivocado hasta el próximo cambio.
              extraData={propioResidenteId}
              contentContainerStyle={styles.lista}
              showsVerticalScrollIndicator={false}
              onEndReached={() => {
                if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
              }}
              onEndReachedThreshold={0.4}
              ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={Colors.hablemos.accent} style={{ marginVertical: Spacing.md }} /> : null}
              ListEmptyComponent={
                <View style={styles.vacioContainer}>
                  <Text style={styles.vacioEmoji}>👋</Text>
                  <Text style={styles.vacioTexto}>Todavía no hay mensajes. ¡Mandá el primero!</Text>
                </View>
              }
              renderItem={({ item, index }) => {
                const esPropio = item.remitente_id === propioResidenteId;
                // Lista invertida y ordenada de más nuevo a más viejo: el mensaje
                // que se ve arriba en pantalla es el de índice siguiente (más viejo).
                const anterior = mensajes[index + 1];
                const esInicioDeDia = !anterior || !esMismodia(new Date(anterior.created_at), new Date(item.created_at));
                // Tras un separador de día siempre se vuelve a mostrar quién escribe, como en WhatsApp.
                const esInicioDeTanda = esInicioDeDia || anterior.remitente_id !== item.remitente_id;
                return (
                  <>
                    {esInicioDeDia && (
                      <View style={styles.separadorFechaWrapper}>
                        <Text style={styles.separadorFechaTexto}>{formatFechaSeparadorChat(item.created_at)}</Text>
                      </View>
                    )}
                    <Burbuja
                      mensaje={item}
                      esPropio={esPropio}
                      nombreRemitente={esInicioDeTanda ? (esPropio ? 'Vos' : nombreOtro) : null}
                      reproduciendo={reproduciendoId === item.id}
                      onTogglePlay={() => toggleReproducirMensaje(item)}
                    />
                  </>
                );
              }}
            />
          )}

          {grabando && (
            <View style={styles.grabandoBanner}>
              <View style={styles.puntoRojo} />
              <Text style={styles.grabandoTexto}>Grabando mensaje de voz...</Text>
              <TouchableOpacity
                style={styles.grabandoCancelarBtn}
                onPress={cancelarGrabacion}
                accessibilityRole="button"
                accessibilityLabel="Cancelar grabación"
              >
                <Ionicons name="close" size={20} color={Colors.brand.red} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.grabandoDetenerBtn}
                onPress={detenerGrabacion}
                accessibilityRole="button"
                accessibilityLabel="Detener grabación"
              >
                <Ionicons name="stop" size={20} color={Colors.text.onDark} />
              </TouchableOpacity>
            </View>
          )}

          {audioUri && !grabando ? (
            <View style={[styles.inputWrapper, { paddingBottom: insets.bottom + Spacing.sm }]}>
              <TouchableOpacity style={styles.audioPlayBtn} onPress={reproducirAudioPropio} accessibilityRole="button" accessibilityLabel="Escuchar el mensaje de voz grabado">
                <Ionicons name="play" size={22} color={Colors.text.onDark} />
              </TouchableOpacity>
              <Text style={styles.audioDuracionTexto}>{formatearDuracion(duracionSegundos)}</Text>
              <TouchableOpacity style={styles.audioAccionBtn} onPress={descartarAudio} accessibilityRole="button" accessibilityLabel="Descartar mensaje de voz">
                <Ionicons name="trash" size={22} color={Colors.brand.red} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={enviarAudioActual}
                disabled={enviarAudio.isPending}
                accessibilityRole="button"
                accessibilityLabel="Enviar mensaje de voz"
              >
                {enviarAudio.isPending ? <ActivityIndicator size="small" color={Colors.text.onDark} /> : <Ionicons name="send" size={22} color={Colors.text.onDark} />}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.inputWrapper, { paddingBottom: insets.bottom + Spacing.sm }]}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Escribí un mensaje..."
                placeholderTextColor={Colors.text.hint}
                multiline
                maxLength={2000}
                editable={!grabando}
                accessibilityLabel="Campo de texto para escribir tu mensaje"
              />
              {input.trim().length > 0 ? (
                <TouchableOpacity
                  style={styles.sendBtn}
                  onPress={enviarTextoActual}
                  disabled={enviarTexto.isPending}
                  accessibilityRole="button"
                  accessibilityLabel="Enviar mensaje"
                >
                  {enviarTexto.isPending ? <ActivityIndicator size="small" color={Colors.text.onDark} /> : <Ionicons name="send" size={22} color={Colors.text.onDark} />}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.micBtn} onPress={iniciarGrabacion} accessibilityRole="button" accessibilityLabel="Grabar mensaje de voz">
                  <Ionicons name="mic" size={24} color={Colors.text.onDark} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

interface BurbujaProps {
  mensaje: MensajeHablemos;
  esPropio: boolean;
  /** Nombre a mostrar arriba de la burbuja — solo en el primer mensaje de cada tanda seguida de la misma persona. */
  nombreRemitente: string | null;
  reproduciendo: boolean;
  onTogglePlay: () => void;
}

function Burbuja({ mensaje, esPropio, nombreRemitente, reproduciendo, onTogglePlay }: BurbujaProps) {
  return (
    <View style={[styles.burbujaWrapper, esPropio ? styles.burbujaWrapperDerecha : styles.burbujaWrapperIzquierda]}>
      <View style={esPropio ? styles.burbujaColumnaDerecha : styles.burbujaColumnaIzquierda}>
      {nombreRemitente && (
        <Text style={[styles.nombreRemitente, esPropio ? styles.nombreRemitentePropio : styles.nombreRemitenteAjeno]}>
          {nombreRemitente}
        </Text>
      )}
      <View style={[styles.burbuja, esPropio ? styles.burbujaPropia : styles.burbujaAjena]}>
        {mensaje.tipo === 'texto' ? (
          <Text style={styles.burbujaTexto}>{mensaje.contenido}</Text>
        ) : (
          <View style={styles.audioMensajeContainer}>
            <Text style={styles.audioMensajeLabel}>
              🎤 Mensaje de voz · {formatearDuracion(mensaje.audio_duracion_segundos ?? 0)}
            </Text>
            <TouchableOpacity
              style={[styles.audioMensajeBtn, reproduciendo && styles.audioMensajeBtnActivo]}
              onPress={onTogglePlay}
              accessibilityRole="button"
              accessibilityLabel={reproduciendo ? 'Pausar mensaje de voz' : 'Escuchar mensaje de voz'}
              activeOpacity={0.75}
            >
              <Ionicons
                name={reproduciendo ? 'pause' : 'volume-medium'}
                size={20}
                color={reproduciendo ? Colors.speak.active : Colors.brand.greenDark}
              />
              <Text style={[styles.audioMensajeBtnTexto, reproduciendo && styles.audioMensajeBtnTextoActivo]}>
                {reproduciendo ? 'Pausar' : 'Escuchar'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.burbujaMeta}>
          <Text style={styles.burbujaHora}>{formatHoraDeISO(mensaje.created_at)}</Text>
          {esPropio && <Text style={styles.burbujaEstado}>{ESTADO_TEXTO[mensaje.estado]}</Text>}
        </View>
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ECE5DD' },
  flex: { flex: 1 },
  header: {
    backgroundColor: Colors.hablemos.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screen.horizontal,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  headerBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerAvatar: { width: 44, height: 44, borderRadius: 22 },
  headerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarInicial: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.onDark },
  headerTitulo: { flex: 1, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.text.onDark },

  lista: { paddingHorizontal: Spacing.screen.horizontal, paddingTop: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.sm },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  separadorFechaWrapper: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: Spacing.radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    marginVertical: Spacing.xs,
  },
  separadorFechaTexto: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.text.secondary,
  },

  burbujaWrapper: { flexDirection: 'row' },
  burbujaWrapperDerecha: { justifyContent: 'flex-end' },
  burbujaWrapperIzquierda: { justifyContent: 'flex-start' },
  burbujaColumnaDerecha: { maxWidth: '82%', alignItems: 'flex-end' },
  burbujaColumnaIzquierda: { maxWidth: '82%', alignItems: 'flex-start' },
  nombreRemitente: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    marginBottom: 2,
    marginHorizontal: Spacing.xs,
  },
  nombreRemitentePropio: { color: Colors.hablemos.accentDark },
  nombreRemitenteAjeno: { color: Colors.hablemos.accent },
  burbuja: {
    borderRadius: Spacing.radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  burbujaPropia: { backgroundColor: Colors.hablemos.burbujaPropia, borderBottomRightRadius: Spacing.radius.sm },
  burbujaAjena: { backgroundColor: Colors.hablemos.burbujaAjena, borderBottomLeftRadius: Spacing.radius.sm },
  // ~35% más grande que el body normal (18 → 24) para mejor lectura
  burbujaTexto: { fontSize: 24, color: Colors.text.primary, lineHeight: 32 },
  burbujaMeta: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.xs, marginTop: 2 },
  burbujaHora: { fontSize: Typography.size.xs, color: Colors.text.hint },
  burbujaEstado: { fontSize: Typography.size.xs, color: Colors.text.hint, fontStyle: 'italic' },

  audioMensajeContainer: { gap: Spacing.sm, minWidth: 220 },
  audioMensajeLabel: { fontSize: Typography.size.sm, color: Colors.text.secondary },
  audioMensajeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Spacing.radius.lg,
    backgroundColor: '#E8F5E9',
  },
  audioMensajeBtnActivo: { backgroundColor: Colors.speak.activeBg },
  audioMensajeBtnTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.brand.greenDark },
  audioMensajeBtnTextoActivo: { color: Colors.speak.active },

  vacioContainer: { alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.section, paddingHorizontal: Spacing.xxxl, transform: [{ scaleY: -1 }] },
  vacioEmoji: { fontSize: 56 },
  vacioTexto: { fontSize: Typography.size.md, color: Colors.text.hint, textAlign: 'center' },

  grabandoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#FFEBEE',
    paddingHorizontal: Spacing.screen.horizontal,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#FFCDD2',
  },
  puntoRojo: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.brand.red },
  grabandoTexto: { flex: 1, fontSize: Typography.size.sm, color: '#C62828', fontWeight: Typography.weight.medium },
  grabandoCancelarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.brand.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grabandoDetenerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brand.red,
    alignItems: 'center',
    justifyContent: 'center',
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    backgroundColor: Colors.ui.surface,
    paddingHorizontal: Spacing.screen.horizontal,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.ui.border,
  },
  input: {
    flex: 1,
    minHeight: Spacing.touch.comfortable,
    maxHeight: 120,
    backgroundColor: Colors.ui.background,
    borderRadius: Spacing.radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.text.primary,
    fontSize: 24,
    borderWidth: 1,
    borderColor: Colors.ui.border,
  },
  sendBtn: {
    width: Spacing.touch.comfortable,
    height: Spacing.touch.comfortable,
    borderRadius: Spacing.touch.comfortable / 2,
    backgroundColor: Colors.hablemos.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  micBtn: {
    width: Spacing.touch.comfortable,
    height: Spacing.touch.comfortable,
    borderRadius: Spacing.touch.comfortable / 2,
    backgroundColor: Colors.hablemos.accentDark,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  audioPlayBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.hablemos.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioDuracionTexto: { flex: 1, fontSize: Typography.size.md, fontWeight: Typography.weight.medium, color: Colors.text.primary },
  audioAccionBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
