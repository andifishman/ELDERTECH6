// Historial de conversaciones del Asistente
import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/common/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { useSesionesRecientes, useMensajesFavoritos } from '@/hooks/useAsistente';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import type { SesionAsistente, MensajeAsistente } from '@/types/asistente.types';

export default function HistorialAsistenteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const residenteId = profile?.residente?.id ?? null;

  const { data: sesiones = [], isLoading } = useSesionesRecientes(residenteId);
  const { data: favoritos = [] } = useMensajesFavoritos(residenteId);

  const formatearFecha = useCallback((iso: string): string => {
    const d = new Date(iso);
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);
    if (d.toDateString() === hoy.toDateString()) return 'Hoy';
    if (d.toDateString() === ayer.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
  }, []);

  const irAlMensajeFavorito = useCallback((sesionId: string, mensajeId: string) => {
    router.push({ pathname: '/asistente/chat', params: { sesionId, mensajeId } });
  }, [router]);

  const irAlChat = useCallback((sesionId: string) => {
    router.push({ pathname: '/asistente/chat', params: { sesionId } });
  }, [router]);

  return (
    <View style={styles.root}>
      <AppHeader
        titulo="Conversaciones"
        mostrarVolver
        backgroundColor={Colors.brand.blueDark}
      />

      {isLoading ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={Colors.brand.blueDark} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Respuestas guardadas ── */}
          {favoritos.length > 0 ? (
            <>
              <Text style={styles.seccionTitulo}>⭐  Respuestas guardadas</Text>
              {favoritos.map((msg) => (
                <TouchableOpacity
                  key={msg.id}
                  style={styles.favCard}
                  activeOpacity={0.75}
                  onPress={() => irAlMensajeFavorito(msg.sesion_id, msg.id)}
                  accessibilityRole="button"
                  accessibilityLabel="Ver esta respuesta en el chat"
                >
                  <View style={styles.favIcono}>
                    <Ionicons name="star" size={22} color="#F59E0B" />
                  </View>
                  <View style={styles.favCuerpo}>
                    <Text style={styles.favTexto} numberOfLines={3}>
                      {msg.contenido}
                    </Text>
                    <Text style={styles.favAccion}>Toque para ver en el chat →</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <>
              <Text style={styles.seccionTitulo}>⭐  Respuestas guardadas</Text>
              <View style={styles.vacioCont}>
                <Text style={styles.vacioTexto}>
                  Toque la estrella en cualquier respuesta para guardarla aquí.
                </Text>
              </View>
            </>
          )}

          {/* ── Historial de sesiones ── */}
          <Text style={[styles.seccionTitulo, { marginTop: Spacing.xl }]}>🕐  Conversaciones anteriores</Text>

          {sesiones.length === 0 ? (
            <View style={styles.vacioCont}>
              <Text style={styles.vacioEmoji}>💬</Text>
              <Text style={styles.vacioTexto}>
                Todavía no hay conversaciones guardadas.
              </Text>
            </View>
          ) : (
            sesiones.map((sesion) => (
              <TouchableOpacity
                key={sesion.id}
                style={styles.sesionCard}
                onPress={() => irAlChat(sesion.id)}
                accessibilityLabel={`Conversación: ${sesion.titulo ?? formatearFecha(sesion.created_at)}`}
                accessibilityRole="button"
                activeOpacity={0.8}
              >
                <View style={styles.sesionIcono}>
                  <Ionicons name="chatbubbles" size={24} color={Colors.brand.blueDark} />
                </View>
                <View style={styles.sesionInfo}>
                  <Text style={styles.sesionTitulo} numberOfLines={1}>
                    {sesion.titulo ?? 'Conversación'}
                  </Text>
                  <Text style={styles.sesionFecha}>
                    {formatearFecha(sesion.created_at)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.text.hint} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ui.background },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    padding: Spacing.screen.horizontal,
    gap: Spacing.md,
  },

  seccionTitulo: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },

  // Favoritos
  favCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: Spacing.radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    elevation: 1,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  favIcono: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  favCuerpo: {
    flex: 1,
    gap: 4,
  },
  favTexto: {
    fontSize: Typography.size.md,
    color: Colors.text.primary,
    lineHeight: 24,
  },
  favAccion: {
    fontSize: Typography.size.sm,
    color: '#D97706',
    fontWeight: Typography.weight.semibold,
    marginTop: 2,
  },

  // Sesiones
  sesionCard: {
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
  sesionIcono: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sesionInfo: { flex: 1 },
  sesionTitulo: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  sesionFecha: {
    fontSize: Typography.size.sm,
    color: Colors.text.hint,
    marginTop: 2,
  },

  // Vacío
  vacioCont: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.md,
  },
  vacioEmoji: { fontSize: 56 },
  vacioTexto: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 26,
  },
});
