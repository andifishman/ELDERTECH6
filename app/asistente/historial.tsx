// Historial de conversaciones del Asistente
import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
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

  function formatearFecha(iso: string): string {
    const d = new Date(iso);
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    if (d.toDateString() === hoy.toDateString()) return 'Hoy';
    if (d.toDateString() === ayer.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
  }

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
        <FlatList
          data={[]}
          keyExtractor={() => ''}
          renderItem={() => null}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.content}>
              {/* ── Respuestas guardadas ── */}
              {favoritos.length > 0 && (
                <>
                  <Text style={styles.seccionTitulo}>⭐ Respuestas guardadas</Text>
                  {favoritos.slice(0, 5).map((msg) => (
                    <TouchableOpacity
                      key={msg.id}
                      style={styles.favCard}
                      activeOpacity={0.7}
                      onPress={() => router.push({ pathname: '/asistente/chat', params: { sesionId: msg.sesion_id } })}
                      accessibilityRole="button"
                      accessibilityLabel="Ver conversación con esta respuesta guardada"
                    >
                      <Ionicons name="star" size={20} color="#FFC107" style={{ flexShrink: 0 }} />
                      <Text style={styles.favTexto} numberOfLines={3}>
                        {msg.contenido}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color={Colors.text.hint} style={{ flexShrink: 0 }} />
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* ── Historial de sesiones ── */}
              <Text style={styles.seccionTitulo}>🕐 Conversaciones anteriores</Text>

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
                    onPress={() => router.push({ pathname: '/asistente/chat', params: { sesionId: sesion.id } })}
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
            </View>
          }
        />
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
    backgroundColor: '#FFFDE7',
    borderRadius: Spacing.radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: '#FFF9C4',
  },
  favTexto: {
    flex: 1,
    fontSize: Typography.size.md,
    color: Colors.text.primary,
    lineHeight: 24,
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
