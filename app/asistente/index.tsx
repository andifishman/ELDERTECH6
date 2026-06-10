// Pantalla principal del Asistente — bienvenida, FAQ y acceso al historial
import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/common/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { useFaq, useSesionesRecientes } from '@/hooks/useAsistente';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { hablar } from '@/utils/tts';
import type { FaqAsistente } from '@/types/asistente.types';

export default function AsistenteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const residenteId = profile?.residente?.id ?? null;
  const nombre = profile?.residente?.nombre ?? '';

  const { data: faq = [], isLoading: cargandoFaq } = useFaq();
  const { data: sesiones = [] } = useSesionesRecientes(residenteId);

  const irAlChat = useCallback(
    (preguntaInicial?: string) => {
      router.push({
        pathname: '/asistente/chat',
        params: preguntaInicial ? { pregunta: preguntaInicial } : {},
      });
    },
    [router],
  );

  const irAHistorial = useCallback(() => {
    router.push('/asistente/historial');
  }, [router]);

  return (
    <View style={styles.root}>
      <AppHeader
        titulo="Asistente"
        mostrarVolver
        backgroundColor={Colors.brand.blueDark}
        textoHablar="Asistente virtual. Puedo ayudarte con WhatsApp, llamadas, fotos y otras funciones del teléfono."
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Bienvenida ── */}
        <View style={styles.bienvenidaCard}>
          <View style={styles.avatarCirculo}>
            <Text style={styles.avatarEmoji}>🤖</Text>
          </View>
          <View style={styles.bienvenidaTextos}>
            <Text style={styles.bienvenidaTitulo}>
              {nombre ? `Hola, ${nombre}` : 'Hola'}
            </Text>
            <Text style={styles.bienvenidaSubtitulo}>
              Soy su asistente virtual.{'\n'}
              Puedo ayudarle con WhatsApp, llamadas, fotos y funciones del teléfono.
            </Text>
          </View>
        </View>

        {/* ── Botón principal — Nueva consulta ── */}
        <TouchableOpacity
          style={styles.btnNuevaConsulta}
          onPress={() => irAlChat()}
          accessibilityLabel="Hacer una nueva consulta al asistente"
          accessibilityRole="button"
          activeOpacity={0.85}
        >
          <Ionicons name="chatbubble-ellipses" size={28} color={Colors.text.onDark} />
          <Text style={styles.btnNuevaConsultaTexto}>Hacer una consulta</Text>
        </TouchableOpacity>

        {/* ── Preguntas frecuentes ── */}
        <View style={styles.seccionHeader}>
          <Text style={styles.seccionTitulo}>Preguntas frecuentes</Text>
          <TouchableOpacity
            onPress={() => hablar('Preguntas frecuentes. Toque cualquier pregunta para que el asistente la responda.')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Escuchar descripción de preguntas frecuentes"
          >
            <Ionicons name="volume-medium" size={22} color={Colors.brand.blueDark} />
          </TouchableOpacity>
        </View>

        {cargandoFaq ? (
          <ActivityIndicator
            size="large"
            color={Colors.brand.blueDark}
            style={{ marginVertical: Spacing.xl }}
          />
        ) : (
          <View style={styles.faqGrid}>
            {faq.map((item) => (
              <FaqCard
                key={item.id}
                item={item}
                onPress={() => irAlChat(item.pregunta)}
              />
            ))}
          </View>
        )}

        {/* ── Historial ── */}
        {sesiones.length > 0 && (
          <>
            <View style={styles.seccionHeader}>
              <Text style={styles.seccionTitulo}>Conversaciones recientes</Text>
            </View>
            <TouchableOpacity
              style={styles.historialBtn}
              onPress={irAHistorial}
              accessibilityLabel="Ver historial de conversaciones"
              accessibilityRole="button"
            >
              <Ionicons name="time" size={24} color={Colors.brand.blueDark} />
              <View style={styles.historialInfo}>
                <Text style={styles.historialTexto}>Ver conversaciones anteriores</Text>
                <Text style={styles.historialSubtexto}>
                  {sesiones.length} conversacion{sesiones.length !== 1 ? 'es' : ''} guardada{sesiones.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={Colors.text.hint} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Tarjeta de FAQ ───────────────────────────────────────────────────────────

function FaqCard({ item, onPress }: { item: FaqAsistente; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.faqCard}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={item.pregunta}
      accessibilityRole="button"
    >
      <Text style={styles.faqEmoji}>{item.emoji}</Text>
      <Text style={styles.faqPregunta} numberOfLines={3}>
        {item.pregunta}
      </Text>
      <Ionicons
        name="arrow-forward-circle"
        size={22}
        color={Colors.brand.blueDark}
        style={styles.faqFlecha}
      />
    </TouchableOpacity>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ui.background },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.screen.horizontal,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },

  // Bienvenida
  bienvenidaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderLeftWidth: 5,
    borderLeftColor: Colors.brand.blueDark,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  avatarCirculo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarEmoji: { fontSize: 40 },
  bienvenidaTextos: { flex: 1, gap: 4 },
  bienvenidaTitulo: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  bienvenidaSubtitulo: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    lineHeight: 24,
  },

  // Botón principal
  btnNuevaConsulta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.brand.blueDark,
    borderRadius: Spacing.radius.xl,
    paddingVertical: Spacing.lg,
    minHeight: Spacing.touch.comfortable,
    elevation: 4,
    shadowColor: Colors.brand.blueDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  btnNuevaConsultaTexto: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },

  // Sección
  seccionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  seccionTitulo: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },

  // Grid de FAQ
  faqGrid: {
    gap: Spacing.sm,
  },
  faqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    minHeight: Spacing.touch.comfortable,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  faqEmoji: { fontSize: 28, flexShrink: 0 },
  faqPregunta: {
    flex: 1,
    fontSize: Typography.size.md,
    color: Colors.text.primary,
    fontWeight: Typography.weight.semibold,
    lineHeight: 24,
  },
  faqFlecha: { flexShrink: 0 },

  // Historial
  historialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: Spacing.radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    minHeight: Spacing.touch.comfortable,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  historialInfo: { flex: 1 },
  historialTexto: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.brand.blueDark,
  },
  historialSubtexto: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    marginTop: 2,
  },
});
