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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useAuth } from '@/context/AuthContext';
import { useAsistenteConfig, getFontScale, getSpeechRate } from '@/context/AsistenteConfigContext';
import { useCrearSesion, useEnviarMensaje, useToggleFavoritoMensaje } from '@/hooks/useAsistente';
import { getMensajesDeSesion } from '@/services/asistenteService';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import type { MensajeLocal, MensajeContexto } from '@/types/asistente.types';

// ID temporal para mensajes locales mientras cargan
let tempId = 0;
const nextTempId = () => `temp_${++tempId}`;

export default function ChatAsistenteScreen() {
  const { pregunta: preguntaInicial, sesionId: sesionIdParam } = useLocalSearchParams<{ pregunta?: string; sesionId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const residenteId = profile?.residente?.id ?? null;
  const { config } = useAsistenteConfig();

  // Si venimos del historial ya tenemos sesionId; si es nueva, se crea al primer envío
  const [sesionId, setSesionId] = useState<string | null>(sesionIdParam ?? null);
  const [mensajes, setMensajes] = useState<MensajeLocal[]>([]);
  const [input, setInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(!!sesionIdParam);

  const flatRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const historialRef = useRef<MensajeContexto[]>([]);

  const crearSesion = useCrearSesion();
  const enviarMensaje = useEnviarMensaje();
  const toggleFavorito = useToggleFavoritoMensaje();

  // ── Cargar mensajes si venimos del historial ──────────────────────────────
  useEffect(() => {
    if (!sesionIdParam) return;
    getMensajesDeSesion(sesionIdParam)
      .then((msgs) => {
        const locales: MensajeLocal[] = msgs.map((m) => ({
          id: m.id,
          rol: m.rol,
          contenido: m.contenido,
          es_favorito: m.es_favorito,
          created_at: m.created_at,
        }));
        setMensajes(locales);
        // Reconstruir historial de contexto para Gemini
        historialRef.current = msgs.map((m) => ({
          role: m.rol === 'usuario' ? ('user' as const) : ('assistant' as const),
          content: m.contenido,
        }));
      })
      .catch(() => {/* si falla, se muestra el chat vacío */})
      .finally(() => setCargandoHistorial(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesionIdParam]);

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
  // residenteId en deps porque RLS necesita auth cargado; si auth llega tarde,
  // el effect se re-ejecuta cuando residenteId cambia de null a valor real.
  useEffect(() => {
    if (!sesionIdParam || !sesionId || !residenteId) return;
    getMensajesDeSesion(sesionId)
      .then((msgs) => {
        setMensajes(
          msgs.map((m) => ({
            id: m.id,
            rol: m.rol,
            contenido: m.contenido,
            es_favorito: m.es_favorito,
            created_at: m.created_at,
          })),
        );
        historialRef.current = msgs.map((m) => ({
          role: m.rol === 'usuario' ? ('user' as const) : ('assistant' as const),
          content: m.contenido,
        }));
      })
      .catch((err) => console.warn('[Asistente] Error cargando historial:', err));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesionId, residenteId]);

  // ── Scroll al último mensaje ──────────────────────────────────────────────

  useEffect(() => {
    if (mensajes.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [mensajes]);

  // ── Leer respuesta del asistente ──────────────────────────────────────────

  const leerTexto = useCallback(
    (texto: string) => {
      if (!config.leerRespuestas) return;
      Speech.stop();
      Speech.speak(texto, {
        language: 'es-AR',
        rate: getSpeechRate(config.velocidad),
      });
    },
    [config.leerRespuestas, config.velocidad],
  );

  // ── Enviar mensaje ────────────────────────────────────────────────────────

  const enviarRef = useRef(false);

  const enviar = useCallback(
    async (texto: string, sid?: string) => {
      if (!texto.trim() || enviarRef.current) return;
      enviarRef.current = true;
      setEnviando(true);

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

      Keyboard.dismiss();
      setInput('');

      // Mensaje del usuario (optimista)
      const msgUsuarioId = nextTempId();
      const msgAsistenteId = nextTempId();

      const msgUsuario: MensajeLocal = {
        id: msgUsuarioId,
        rol: 'usuario',
        contenido: texto.trim(),
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

      setMensajes((prev) => [...prev, msgUsuario, msgCargando]);

      try {
        const { msgUsuario, msgAsistente } = await enviarMensaje.mutateAsync({
          sesionId: currentSesionId,
          residenteId: residenteId ?? '',
          pregunta: texto.trim(),
          historial: historialRef.current,
          // No generar título si estamos viendo una sesión del historial
          esPrimerMensaje: mensajes.length === 0 && !sesionIdParam,
        });

        historialRef.current = [
          ...historialRef.current,
          { role: 'user' as const, content: texto.trim() },
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
                }
              : m.id === msgUsuarioId
              ? { ...m, id: msgUsuario.id }
              : m,
          ),
        );

        // Leer la respuesta en voz
        leerTexto(msgAsistente.contenido);
      } catch (err: any) {
        // Mostrar el error real para poder diagnosticar
        const errorMsg = err?.message ?? String(err);
        console.error('[Asistente] Error:', errorMsg);
        setMensajes((prev) =>
          prev.map((m) =>
            m.id === msgAsistenteId
              ? {
                  ...m,
                  contenido: `Error: ${errorMsg}`,
                  cargando: false,
                }
              : m,
          ),
        );
      } finally {
        enviarRef.current = false;
        setEnviando(false);
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
        onLeer={() => leerTexto(item.contenido)}
        onToggleFavorito={() => handleToggleFavorito(item.id, item.es_favorito)}
      />
    ),
    [scale, leerTexto, handleToggleFavorito],
  );

  const puedeEnviar = input.trim().length > 0 && !enviando;

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
        keyboardVerticalOffset={0}
      >
        {cargandoHistorial ? (
          <View style={styles.centrado}>
            <ActivityIndicator size="large" color={Colors.brand.blueDark} />
            <Text style={styles.iniciandoTexto}>Iniciando conversación...</Text>
          </View>
        ) : (
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
        )}

        {/* Input */}
        <View style={[styles.inputWrapper, { paddingBottom: insets.bottom + Spacing.sm }]}>
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
          />
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
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Burbuja de mensaje ───────────────────────────────────────────────────────

interface BurbujaMensajeProps {
  mensaje: MensajeLocal;
  scale: number;
  onLeer: () => void;
  onToggleFavorito: () => void;
}

function BurbujaMensaje({ mensaje, scale, onLeer, onToggleFavorito }: BurbujaMensajeProps) {
  const esUsuario = mensaje.rol === 'usuario';

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
      ]}>
        {mensaje.cargando ? (
          <View style={styles.cargandoBurbuja}>
            <ActivityIndicator size="small" color={Colors.text.hint} />
            <Text style={styles.cargandoTexto}>Pensando...</Text>
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
              <View style={styles.accionesRow}>
                {/* Escuchar de nuevo */}
                <TouchableOpacity
                  style={styles.accionBtn}
                  onPress={onLeer}
                  accessibilityLabel="Escuchar respuesta nuevamente"
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="volume-medium" size={18} color={Colors.brand.blueDark} />
                  <Text style={styles.accionTexto}>Escuchar</Text>
                </TouchableOpacity>

                {/* Guardar como favorito */}
                <TouchableOpacity
                  style={styles.accionBtn}
                  onPress={onToggleFavorito}
                  accessibilityLabel={mensaje.es_favorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={mensaje.es_favorito ? 'star' : 'star-outline'}
                    size={18}
                    color={mensaje.es_favorito ? '#FFC107' : Colors.text.hint}
                  />
                  <Text style={styles.accionTexto}>
                    {mensaje.es_favorito ? 'Guardado' : 'Guardar'}
                  </Text>
                </TouchableOpacity>
              </View>
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
    fontSize: Typography.size.sm,
    color: Colors.text.hint,
    fontStyle: 'italic',
  },

  // Acciones de la burbuja del asistente
  accionesRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#E8EAF6',
  },
  accionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: Spacing.touch.min,
    paddingHorizontal: Spacing.sm,
  },
  accionTexto: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.medium,
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

  // Estado inicial
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
});
