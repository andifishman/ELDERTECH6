// Pantalla de Chat del Asistente — interfaz de conversación con IA
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Alert,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { useAuth } from '@/context/AuthContext';
import { useAsistenteConfig, getFontScale, getSpeechRate } from '@/context/AsistenteConfigContext';
import { useCrearSesion, useEnviarMensaje, useToggleFavoritoMensaje } from '@/hooks/useAsistente';
import { getMensajesDeSesion, transcribirAudio } from '@/services/asistenteService';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import type { MensajeLocal, MensajeContexto } from '@/types/asistente.types';

// ID temporal para mensajes locales mientras cargan
let tempId = 0;
const nextTempId = () => `temp_${++tempId}`;

export default function ChatAsistenteScreen() {
  const { pregunta: preguntaInicial, sesionId: sesionIdParam, mensajeId: mensajeIdParam } = useLocalSearchParams<{ pregunta?: string; sesionId?: string; mensajeId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [androidKbHeight, setAndroidKbHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setAndroidKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setAndroidKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const { profile } = useAuth();
  const residenteId = profile?.residente?.id ?? null;
  const { config } = useAsistenteConfig();

  // Si venimos del historial ya tenemos sesionId; si es nueva, se crea al primer envío
  const [sesionId, setSesionId] = useState<string | null>(sesionIdParam ?? null);
  const [mensajes, setMensajes] = useState<MensajeLocal[]>([]);
  const [input, setInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(!!sesionIdParam);
  const [recargarKey, setRecargarKey] = useState(0);
  const [historialAviso, setHistorialAviso] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [transcribiendo, setTranscribiendo] = useState(false);
  const [mensajeDestacado, setMensajeDestacado] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webRecognitionRef = useRef<any>(null);
  const pulsoAnim = useRef(new Animated.Value(1)).current;

  const flatRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const historialRef = useRef<MensajeContexto[]>([]);

  const crearSesion = useCrearSesion();
  const enviarMensaje = useEnviarMensaje();
  const toggleFavorito = useToggleFavoritoMensaje();

  // ── Inicializar sesión ────────────────────────────────────────────────────
  const sesionIniciadaRef = useRef(false);

  // ── Disparar pregunta inicial si viene del FAQ ────────────────────────────
  // La sesión se crea de forma lazy dentro de `enviar` al primer envío
  const preguntaInicialEnviadaRef = useRef(false);

  useEffect(() => {
    // Si venimos del historial, no hay pregunta inicial que disparar
    if (sesionIdParam) return;
    if (!preguntaInicial) return;
    if (preguntaInicialEnviadaRef.current) return;
    // Esperar a que residenteId esté disponible antes de enviar
    if (!residenteId) return;
    preguntaInicialEnviadaRef.current = true;
    const t = setTimeout(() => enviar(preguntaInicial), 300);
    return () => clearTimeout(t);
  // Se re-ejecuta cuando residenteId pasa de null a un valor real
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residenteId]);

  // ── Cargar mensajes de sesión existente (historial) ───────────────────────
  const reintentarCargaHistorial = useCallback(() => {
    setHistorialAviso(false);
    setCargandoHistorial(true);
    setMensajes([]);
    setRecargarKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!sesionIdParam || !sesionId) return;
    if (!residenteId) return;

    let cancelled = false;

    // 15s: timeout generoso para conexiones lentas desde Argentina a us-east-1
    const TIMEOUT_MS = 15000;

    const safetyTimer = setTimeout(() => {
      if (!cancelled) {
        // No bloqueamos la UI: mostramos aviso pero dejamos el chat usable
        setHistorialAviso(true);
        setCargandoHistorial(false);
      }
    }, TIMEOUT_MS);

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS),
    );

    Promise.race([getMensajesDeSesion(sesionId), timeout])
      .then((msgs) => {
        if (cancelled) return;
        const locales = msgs.map((m) => ({
          id: m.id,
          rol: m.rol,
          contenido: m.contenido,
          es_favorito: m.es_favorito,
          created_at: m.created_at,
        }));
        setMensajes(locales);
        historialRef.current = msgs.map((m) => ({
          role: m.rol === 'usuario' ? ('user' as const) : ('assistant' as const),
          content: m.contenido,
        }));

        if (mensajeIdParam) {
          setMensajeDestacado(mensajeIdParam);
          const idx = locales.findIndex((m) => m.id === mensajeIdParam);
          if (idx !== -1) {
            setTimeout(() => {
              flatRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 });
            }, 400);
            setTimeout(() => setMensajeDestacado(null), 3500);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('[Asistente] Error cargando historial:', err);
          // Degradación: chat usable aunque no se cargue el historial anterior
          setHistorialAviso(true);
        }
      })
      .finally(() => {
        clearTimeout(safetyTimer);
        if (!cancelled) setCargandoHistorial(false);
      });

    return () => { cancelled = true; clearTimeout(safetyTimer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesionId, residenteId, recargarKey]);

  // ── Scroll al último mensaje ──────────────────────────────────────────────

  useEffect(() => {
    if (mensajes.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [mensajes]);

  // ── Leer respuesta del asistente ──────────────────────────────────────────

  const leerTexto = useCallback(
    (texto: string) => {
      Speech.stop();
      Speech.speak(texto, {
        language: 'es-AR',
        rate: getSpeechRate(config.velocidad),
      });
    },
    [config.velocidad],
  );

  // ── Enviar mensaje ────────────────────────────────────────────────────────

  const enviarRef = useRef(false);

  const enviar = useCallback(
    async (texto: string, sid?: string) => {
      if (!texto.trim() || enviarRef.current) return;
      enviarRef.current = true;

      // Mostrar mensajes INMEDIATAMENTE — antes de cualquier await
      Keyboard.dismiss();
      setInput('');
      setEnviando(true);

      const msgUsuarioId = nextTempId();
      const msgAsistenteId = nextTempId();
      const textoTrimmed = texto.trim();

      const msgUsuarioLocal: MensajeLocal = {
        id: msgUsuarioId,
        rol: 'usuario',
        contenido: textoTrimmed,
        es_favorito: false,
        created_at: new Date().toISOString(),
      };
      const msgCargando: MensajeLocal = {
        id: msgAsistenteId,
        rol: 'asistente',
        contenido: '',
        es_favorito: false,
        cargando: true,
        created_at: new Date().toISOString(),
      };

      setMensajes((prev) => [...prev, msgUsuarioLocal, msgCargando]);

      // Timeout global — 71s (3/4 de 95s anterior). El timeout interno de la IA es 67s,
      // así que ese dispara primero con mensaje accionable.
      let timedOut = false;
      const frontendTimeout = setTimeout(() => {
        timedOut = true;
        enviarRef.current = false;
        setEnviando(false);
        setMensajes((prev) =>
          prev.map((m) =>
            m.id === msgAsistenteId
              ? {
                  ...m,
                  contenido: 'No pude responder a tiempo. Tocá "Reintentar" para intentarlo de nuevo. Si sigue sin contestar, cerrá la app y volvé a abrirla.',
                  cargando: false,
                  error: true,
                  preguntaReintentar: textoTrimmed,
                }
              : m,
          ),
        );
      }, 71000);

      // Creación lazy de sesión: si no hay sesionId aún, crear ahora
      let currentSesionId = sid ?? sesionId;
      if (!currentSesionId) {
        if (!residenteId) {
          currentSesionId = 'local_' + Date.now();
          setSesionId(currentSesionId);
          sesionIniciadaRef.current = true;
        } else {
          try {
            const nuevaSesion = await crearSesion.mutateAsync(residenteId);
            currentSesionId = nuevaSesion.id;
            setSesionId(currentSesionId);
            sesionIniciadaRef.current = true;
          } catch {
            currentSesionId = 'local_' + Date.now();
            setSesionId(currentSesionId);
            sesionIniciadaRef.current = true;
          }
        }
      }

      // Si el timeout disparó mientras creábamos la sesión, abortar
      if (timedOut) return;

      try {
        const { msgUsuario, msgAsistente, navegacion } = await enviarMensaje.mutateAsync({
          sesionId: currentSesionId,
          residenteId: residenteId ?? '',
          pregunta: textoTrimmed,
          historial: historialRef.current,
          // No generar título si estamos viendo una sesión del historial
          esPrimerMensaje: mensajes.length === 0 && !sesionIdParam,
        });

        if (timedOut) return;
        clearTimeout(frontendTimeout);

        historialRef.current = [
          ...historialRef.current,
          { role: 'user' as const, content: textoTrimmed },
          { role: 'assistant' as const, content: msgAsistente.contenido },
        ];

        // Reemplazar el placeholder de carga con la respuesta real
        setMensajes((prev) =>
          prev.map((m) =>
            m.id === msgAsistenteId
              ? {
                  ...m,
                  id: msgAsistente.id,
                  contenido: msgAsistente.contenido,
                  cargando: false,
                  navegacion,
                }
              : m.id === msgUsuarioId
              ? { ...m, id: msgUsuario.id }
              : m,
          ),
        );

        // No leer automáticamente — el usuario toca "Escuchar" cuando quiere
      } catch (err) {
        if (timedOut) return;
        clearTimeout(frontendTimeout);
        console.error('[Asistente] Error:', err instanceof Error ? err.message : err);
        setMensajes((prev) =>
          prev.map((m) =>
            m.id === msgAsistenteId
              ? {
                  ...m,
                  contenido: 'Hubo un problema al responder. Tocá "Reintentar" para intentarlo de nuevo. Si sigue fallando, verificá el WiFi o cerrá la app y volvé a abrirla.',
                  cargando: false,
                  error: true,
                  preguntaReintentar: textoTrimmed,
                }
              : m,
          ),
        );
      } finally {
        if (!timedOut) {
          enviarRef.current = false;
          setEnviando(false);
        }
      }
    },
    [sesionId, residenteId, mensajes.length, enviarMensaje, leerTexto],
  );

  // ── Toggle favorito ───────────────────────────────────────────────────────

  const handleToggleFavorito = useCallback(
    (mensajeId: string, esActualFavorito: boolean) => {
      // Solo mensajes del asistente ya persistidos (no temp)
      if (mensajeId.startsWith('temp_')) return;
      const nuevoValor = !esActualFavorito;
      setMensajes((prev) =>
        prev.map((m) =>
          m.id === mensajeId ? { ...m, es_favorito: nuevoValor } : m,
        ),
      );
      toggleFavorito.mutate({ mensajeId, esFavorito: nuevoValor });
    },
    [toggleFavorito],
  );

  // ── Escalar fuente según config ───────────────────────────────────────────

  const scale = getFontScale(config.tamanoTexto);

  // ── Render de cada mensaje ────────────────────────────────────────────────

  const renderMensaje = useCallback(
    ({ item }: { item: MensajeLocal }) => (
      <BurbujaMensaje
        mensaje={item}
        scale={scale}
        destacado={item.id === mensajeDestacado}
        onLeer={() => leerTexto(item.contenido)}
        onToggleFavorito={() => handleToggleFavorito(item.id, item.es_favorito)}
        onReintentar={enviar}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scale, mensajeDestacado, leerTexto, handleToggleFavorito, enviar],
  );

  const puedeEnviar = input.trim().length > 0 && !enviando;

  // ── Animación de pulso del micrófono ──────────────────────────────────────

  const animarPulso = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulsoAnim, { toValue: 1.25, duration: 500, useNativeDriver: true }),
        Animated.timing(pulsoAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulsoAnim]);

  const detenerAnimacion = useCallback(() => {
    pulsoAnim.stopAnimation();
    pulsoAnim.setValue(1);
  }, [pulsoAnim]);

  // ── Grabación de voz ──────────────────────────────────────────────────────

  const iniciarGrabacion = useCallback(async () => {
    if (grabando || transcribiendo || enviando) return;

    // ── Web: usar Web Speech API (Chrome/Edge) ─────────────────────────────
    if (Platform.OS === 'web') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognitionAPI = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) {
        Alert.alert(
          'Micrófono no disponible',
          'Para usar el micrófono en la computadora, abrí la app en Chrome o Edge.',
        );
        return;
      }
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'es-AR';
      recognition.continuous = false;
      recognition.interimResults = false;
      webRecognitionRef.current = recognition;

      recognition.onstart = () => { setGrabando(true); animarPulso(); };
      recognition.onend = () => { setGrabando(false); detenerAnimacion(); };
      recognition.onerror = () => {
        setGrabando(false);
        detenerAnimacion();
        Alert.alert('Sin reconocimiento', 'No se pudo escuchar. Intentá de nuevo.');
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const texto: string = event.results[0]?.[0]?.transcript ?? '';
        if (texto.trim()) {
          setInput(texto.trim());
          setTimeout(() => enviar(texto.trim()), 100);
        }
      };
      recognition.start();
      return;
    }

    // ── Nativo (iOS/Android): expo-av + Groq Whisper ──────────────────────
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert(
          'Permiso de micrófono',
          'Para usar el micrófono, active el permiso en los ajustes del teléfono.',
        );
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setGrabando(true);
      animarPulso();
    } catch (err) {
      console.warn('[Micrófono] Error al iniciar grabación:', err);
      Alert.alert('Error', 'No se pudo iniciar el micrófono. Intentá de nuevo.');
    }
  }, [grabando, transcribiendo, enviando, animarPulso, detenerAnimacion, enviar]);

  const detenerYTranscribir = useCallback(async () => {
    // ── Web: detener Web Speech API ────────────────────────────────────────
    if (Platform.OS === 'web') {
      webRecognitionRef.current?.stop();
      setGrabando(false);
      detenerAnimacion();
      return;
    }

    // ── Nativo: detener grabación y transcribir ────────────────────────────
    if (!recordingRef.current || !grabando) return;
    setGrabando(false);
    detenerAnimacion();
    setTranscribiendo(true);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) throw new Error('No se obtuvo el archivo de audio.');

      const texto = await transcribirAudio(uri);
      if (texto) {
        setInput(texto);
        setTimeout(() => enviar(texto), 100);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo transcribir el audio.';
      Alert.alert('Sin reconocimiento', msg);
    } finally {
      setTranscribiendo(false);
    }
  }, [grabando, detenerAnimacion, enviar]);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => { Speech.stop(); router.back(); }}
          accessibilityLabel="Volver"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={26} color={Colors.text.onDark} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerAvatar}>🤖</Text>
          <Text style={styles.headerTitulo}>Asistente</Text>
        </View>

        {/* Historial */}
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => { Speech.stop(); router.push('/asistente/historial'); }}
          accessibilityLabel="Ver historial de conversaciones"
          accessibilityRole="button"
        >
          <Ionicons name="time-outline" size={24} color={Colors.text.onDark} />
        </TouchableOpacity>

        {/* Ajustes de voz */}
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.push('/asistente/ajustes')}
          accessibilityLabel="Ajustes del asistente"
          accessibilityRole="button"
        >
          <Ionicons name="settings-outline" size={24} color={Colors.text.onDark} />
        </TouchableOpacity>
      </View>

      {/* Lista de mensajes */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 72 : 0}
      >
        <View style={[styles.flex, { paddingBottom: androidKbHeight }]}>
        {cargandoHistorial ? (
          <View style={styles.centrado}>
            <ActivityIndicator size="large" color={Colors.brand.blueDark} />
            <Text style={styles.iniciandoTexto}>Cargando conversación...</Text>
          </View>
        ) : (
          <>
            {historialAviso && (
              <TouchableOpacity
                style={styles.avisoHistorial}
                onPress={reintentarCargaHistorial}
                accessibilityRole="button"
                accessibilityLabel="No se cargó el historial, tocar para reintentar"
              >
                <Ionicons name="warning-outline" size={16} color="#92400E" />
                <Text style={styles.avisoHistorialTexto}>No se cargó el historial anterior · Tocar para reintentar</Text>
              </TouchableOpacity>
            )}
          <FlatList
            ref={flatRef}
            data={mensajes}
            keyExtractor={(item) => item.id}
            renderItem={renderMensaje}
            contentContainerStyle={[
              styles.lista,
              mensajes.length === 0 && styles.listaVacia,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <Text style={[styles.emptyTexto, { fontSize: Typography.size.md * scale }]}>
                  ¿En qué puedo ayudarle?
                </Text>
                <Text style={[styles.emptySubtexto, { fontSize: Typography.size.sm * scale }]}>
                  Escriba su consulta abajo o use el micrófono.
                </Text>
              </View>
            }
          />
          </>
        )}

        {/* Indicador de grabación */}
        {(grabando || transcribiendo) && (
          <View style={styles.grabandoBanner}>
            <Animated.View style={[styles.grabandoPunto, { transform: [{ scale: pulsoAnim }] }]} />
            <Text style={styles.grabandoTexto}>
              {transcribiendo ? 'Transcribiendo...' : Platform.OS === 'web' ? 'Escuchando... Hable ahora' : 'Grabando... Toque el micrófono para detener'}
            </Text>
          </View>
        )}

        {/* Input */}
        <View style={[styles.inputWrapper, { paddingBottom: (Platform.OS === 'android' && androidKbHeight > 0) ? Spacing.sm : insets.bottom + Spacing.sm }]}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { fontSize: Typography.size.md * scale }]}
            placeholder="Escriba su consulta..."
            placeholderTextColor={Colors.text.hint}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => enviar(input)}
            blurOnSubmit={false}
            accessibilityLabel="Campo de texto para escribir su consulta"
            editable={!grabando && !transcribiendo}
          />

          {/* Botón micrófono */}
          <TouchableOpacity
            style={[
              styles.micBtn,
              grabando && styles.micBtnGrabando,
              transcribiendo && styles.micBtnTranscribiendo,
            ]}
            onPress={grabando ? detenerYTranscribir : iniciarGrabacion}
            disabled={transcribiendo || enviando}
            accessibilityLabel={grabando ? 'Detener grabación' : 'Hablar con el asistente'}
            accessibilityRole="button"
            activeOpacity={0.8}
          >
            {transcribiendo ? (
              <ActivityIndicator size="small" color={Colors.text.onDark} />
            ) : (
              <Ionicons
                name={grabando ? 'stop' : 'mic'}
                size={22}
                color={Colors.text.onDark}
              />
            )}
          </TouchableOpacity>

          {/* Botón enviar */}
          <TouchableOpacity
            style={[styles.sendBtn, !puedeEnviar && styles.sendBtnDisabled]}
            onPress={() => enviar(input)}
            disabled={!puedeEnviar}
            accessibilityLabel="Enviar consulta"
            accessibilityRole="button"
          >
            {enviando ? (
              <ActivityIndicator size="small" color={Colors.text.onDark} />
            ) : (
              <Ionicons name="send" size={24} color={Colors.text.onDark} />
            )}
          </TouchableOpacity>
        </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Burbuja de mensaje ───────────────────────────────────────────────────────

interface BurbujaMensajeProps {
  mensaje: MensajeLocal;
  scale: number;
  destacado: boolean;
  onLeer: () => void;
  onToggleFavorito: () => void;
  onReintentar?: (pregunta: string) => void;
}

function BurbujaMensaje({ mensaje, scale, destacado, onLeer, onToggleFavorito, onReintentar }: BurbujaMensajeProps) {
  const esUsuario = mensaje.rol === 'usuario';
  const iconSize = Math.round(22 * scale);
  // sm base + scale capped at 1.15 para que no desborde los botones en fuente "muy grande"
  const accionFontSize = Math.round(Typography.size.sm * Math.min(scale, 1.15));
  const accionAltura = Math.round(52 * scale);
  const router = useRouter();

  return (
    <View style={[styles.burbujaWrapper, esUsuario ? styles.burbujaWrapperDerecha : styles.burbujaWrapperIzquierda]}>

      {/* Avatar del asistente */}
      {!esUsuario && (
        <View style={styles.avatarSmall}>
          <Text style={styles.avatarSmallEmoji}>🤖</Text>
        </View>
      )}

      <View style={[
        styles.burbuja,
        esUsuario ? styles.burbujaUsuario : styles.burbujaAsistente,
        destacado && styles.burbujaDestacada,
      ]}>
        {mensaje.cargando ? (
          <View style={styles.cargandoBurbuja}>
            <ActivityIndicator size="small" color={Colors.text.hint} />
            <Text style={styles.cargandoTexto}>Pensando una respuesta, aguarde unos segundos...</Text>
          </View>
        ) : (
          <>
            <Text style={[
              styles.burbujaTexto,
              esUsuario ? styles.burbujaTextoUsuario : styles.burbujaTextoAsistente,
              { fontSize: Typography.size.md * scale, lineHeight: 26 * scale },
            ]}>
              {mensaje.contenido}
            </Text>

            {/* Acciones del asistente */}
            {!esUsuario && !mensaje.cargando && (
              <>
                {mensaje.error ? (
                  /* Estado de error: solo mostrar botón Reintentar */
                  mensaje.preguntaReintentar && onReintentar && (
                    <TouchableOpacity
                      style={styles.reintentarBtn}
                      onPress={() => onReintentar(mensaje.preguntaReintentar!)}
                      accessibilityLabel="Reintentar la pregunta"
                      accessibilityRole="button"
                      activeOpacity={0.85}
                    >
                      <Ionicons name="refresh" size={iconSize} color={Colors.text.onDark} />
                      <Text style={[styles.reintentarTexto, { fontSize: accionFontSize }]}>Reintentar</Text>
                    </TouchableOpacity>
                  )
                ) : (
                  /* Estado normal: Escuchar, Guardar y navegación */
                  <>
                    <View style={styles.accionesRow}>
                      {/* Escuchar de nuevo */}
                      <TouchableOpacity
                        style={[styles.accionBtn, styles.accionBtnEscuchar, { minHeight: accionAltura }]}
                        onPress={onLeer}
                        accessibilityLabel="Escuchar respuesta nuevamente"
                        accessibilityRole="button"
                        activeOpacity={0.75}
                      >
                        <Ionicons name="volume-medium" size={iconSize} color={Colors.brand.blueDark} />
                        <Text style={[styles.accionTexto, styles.accionTextoEscuchar, { fontSize: accionFontSize }]}>
                          Escuchar
                        </Text>
                      </TouchableOpacity>

                      {/* Guardar como favorito */}
                      <TouchableOpacity
                        style={[
                          styles.accionBtn,
                          mensaje.es_favorito ? styles.accionBtnGuardado : styles.accionBtnGuardar,
                          { minHeight: accionAltura },
                        ]}
                        onPress={onToggleFavorito}
                        accessibilityLabel={mensaje.es_favorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                        accessibilityRole="button"
                        activeOpacity={0.75}
                      >
                        <Ionicons
                          name={mensaje.es_favorito ? 'star' : 'star-outline'}
                          size={iconSize}
                          color={mensaje.es_favorito ? '#D97706' : Colors.text.secondary}
                        />
                        <Text style={[
                          styles.accionTexto,
                          mensaje.es_favorito ? styles.accionTextoGuardado : styles.accionTextoGuardar,
                          { fontSize: accionFontSize },
                        ]}>
                          {mensaje.es_favorito ? 'Guardado' : 'Guardar'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Botón de navegación directa — aparece cuando la IA encontró algo relevante */}
                    {mensaje.navegacion && (
                      <TouchableOpacity
                        style={styles.navegacionBtn}
                        onPress={() => {
                          const nav = mensaje.navegacion!;
                          // Corrección si la IA envía "/" para el perfil
                          const ruta = (nav.ruta === '/' && /perfil/i.test(nav.etiqueta))
                            ? '/profile'
                            : nav.ruta;
                          router.push(ruta as Parameters<typeof router.push>[0]);
                        }}
                        accessibilityLabel={mensaje.navegacion.etiqueta}
                        accessibilityRole="button"
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.navegacionEmoji]}>{mensaje.navegacion.emoji}</Text>
                        <Text style={[styles.navegacionTexto, { fontSize: accionFontSize }]}>
                          {mensaje.navegacion.etiqueta}
                        </Text>
                        <Ionicons name="arrow-forward" size={Math.round(18 * scale)} color={Colors.text.onDark} />
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </View>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#EEF2FF' },
  flex: { flex: 1 },

  // Header
  header: {
    backgroundColor: Colors.brand.blueDark,
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
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerAvatar: { fontSize: 36 },
  headerTitulo: {
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },

  // Lista
  lista: {
    paddingHorizontal: Spacing.screen.horizontal,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  listaVacia: {
    flex: 1,
    justifyContent: 'center',
  },

  // Estado vacío
  emptyContainer: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xxxl,
  },
  emptyEmoji: { fontSize: 64 },
  emptyTexto: {
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  emptySubtexto: {
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Burbujas
  burbujaWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  burbujaWrapperDerecha: { justifyContent: 'flex-end' },
  burbujaWrapperIzquierda: { justifyContent: 'flex-start' },

  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginBottom: 4,
  },
  avatarSmallEmoji: { fontSize: 20 },

  burbuja: {
    maxWidth: '82%',
    borderRadius: Spacing.radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  burbujaUsuario: {
    backgroundColor: Colors.brand.blueDark,
    borderBottomRightRadius: Spacing.radius.sm,
  },
  burbujaAsistente: {
    backgroundColor: Colors.ui.surface,
    borderBottomLeftRadius: Spacing.radius.sm,
    borderWidth: 1,
    borderColor: '#C5CAE9',
  },
  burbujaDestacada: {
    borderWidth: 2,
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  burbujaTexto: {
    fontWeight: Typography.weight.regular,
  },
  burbujaTextoUsuario: {
    color: Colors.text.onDark,
  },
  burbujaTextoAsistente: {
    color: Colors.text.primary,
  },

  // Cargando
  cargandoBurbuja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  cargandoTexto: {
    fontSize: Typography.size.md,
    color: Colors.text.hint,
    fontStyle: 'italic',
  },

  // Acciones de la burbuja del asistente
  accionesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E8EAF6',
  },
  accionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Spacing.radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  accionBtnEscuchar: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1.5,
    borderColor: '#90CAF9',
  },
  accionBtnGuardar: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  accionBtnGuardado: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  accionTexto: {
    fontWeight: Typography.weight.bold,
  },
  accionTextoEscuchar: {
    color: Colors.brand.blueDark,
  },
  accionTextoGuardar: {
    color: Colors.text.secondary,
  },
  accionTextoGuardado: {
    color: '#D97706',
  },

  // Input
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    backgroundColor: Colors.ui.surface,
    paddingHorizontal: Spacing.screen.horizontal,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.ui.border,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  input: {
    flex: 1,
    minHeight: Spacing.touch.comfortable,
    maxHeight: 120,
    backgroundColor: '#EEF2FF',
    borderRadius: Spacing.radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.text.primary,
    borderWidth: 1.5,
    borderColor: '#C5CAE9',
  },
  sendBtn: {
    width: Spacing.touch.comfortable,
    height: Spacing.touch.comfortable,
    borderRadius: Spacing.touch.comfortable / 2,
    backgroundColor: Colors.brand.blueDark,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: Colors.brand.blueDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    flexShrink: 0,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.ui.disabled,
    elevation: 0,
    shadowOpacity: 0,
  },

  // Micrófono
  micBtn: {
    width: Spacing.touch.comfortable,
    height: Spacing.touch.comfortable,
    borderRadius: Spacing.touch.comfortable / 2,
    backgroundColor: '#546E7A',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    flexShrink: 0,
  },
  micBtnGrabando: {
    backgroundColor: '#D32F2F',
    elevation: 4,
    shadowColor: '#D32F2F',
    shadowOpacity: 0.4,
  },
  micBtnTranscribiendo: {
    backgroundColor: '#F57C00',
    elevation: 2,
  },

  // Banner de grabación
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
  grabandoPunto: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D32F2F',
    flexShrink: 0,
  },
  grabandoTexto: {
    fontSize: Typography.size.sm,
    color: '#C62828',
    fontWeight: Typography.weight.medium,
    flex: 1,
  },

  // Estado inicial / error historial
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  iniciandoTexto: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
  },
  errorHistorialEmoji: { fontSize: 48 },
  errorHistorialTexto: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  errorHistorialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.brand.blueDark,
    borderRadius: Spacing.radius.lg,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    minHeight: Spacing.touch.comfortable,
  },
  errorHistorialBtnTexto: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },
  avisoHistorial: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    paddingHorizontal: Spacing.screen.horizontal,
    paddingVertical: Spacing.sm,
  },
  avisoHistorialTexto: {
    flex: 1,
    fontSize: Typography.size.sm,
    color: '#92400E',
    fontWeight: Typography.weight.medium,
  },

  // Botón Reintentar (solo en mensajes con error de timeout)
  reintentarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#C62828',
    borderRadius: Spacing.radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  reintentarTexto: {
    color: Colors.text.onDark,
    fontWeight: Typography.weight.bold,
  },

  // Botón de navegación directa (dentro de burbuja del asistente)
  navegacionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.brand.blueDark,
    borderRadius: Spacing.radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  navegacionEmoji: {
    fontSize: 20,
  },
  navegacionTexto: {
    flex: 1,
    color: Colors.text.onDark,
    fontWeight: Typography.weight.bold,
  },
});
