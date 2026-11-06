// Mi familia — lista de familiares que le escriben al residente
import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { AppHeader } from '@/components/common/AppHeader';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useConversacionesFamilia } from '@/hooks/useMiFamilia';
import { formatFechaListaConversaciones } from '@/utils/dateUtils';
import type { ConversacionFamilia } from '@/services/miFamiliaService';

function titulo(c: ConversacionFamilia): string {
  return c.parentesco ? `${c.familiar} (${c.parentesco})` : c.familiar;
}

export default function MiFamiliaListaScreen() {
  const { data: conversaciones, isLoading, isError, refetch } = useConversacionesFamilia();

  return (
    <View style={styles.root}>
      <AppHeader
        titulo="Mi familia"
        mostrarVolver
        backgroundColor={Colors.hablemos.accent}
        textoHablar="Mi familia. Leé y contestá los mensajes de tus familiares."
      />

      {isLoading ? (
        <ActivityIndicator color={Colors.hablemos.accent} style={{ marginTop: Spacing.xxl }} />
      ) : isError ? (
        <View style={styles.vacioContainer}>
          <Text style={styles.vacioTexto}>No pudimos cargar tus mensajes. Revisá tu conexión.</Text>
          <TouchableOpacity style={styles.reintentar} onPress={() => void refetch()} accessibilityRole="button" accessibilityLabel="Reintentar">
            <Text style={styles.reintentarTexto}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversaciones ?? []}
          keyExtractor={(item) => item.vinculoId}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.vacioContainer}>
              <Text style={styles.vacioEmoji}>👪</Text>
              <Text style={styles.vacioTexto}>Todavía no tenés familiares conectados. La residencia los puede conectar por vos.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/mas/familia/${item.vinculoId}` as never)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Mensajes con ${titulo(item)}${item.sinLeer > 0 ? `, ${item.sinLeer} sin leer` : ''}`}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarInicial}>{item.familiar.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.nombre} numberOfLines={1} maxFontSizeMultiplier={1.3}>{titulo(item)}</Text>
                <Text style={[styles.preview, item.sinLeer > 0 && styles.previewNoLeido]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                  {item.ultimoMensaje ? item.ultimoMensaje.vistaPrevia : 'Todavía no hay mensajes'}
                </Text>
              </View>
              <View style={styles.meta}>
                {item.ultimoMensaje && <Text style={styles.hora} maxFontSizeMultiplier={1.3}>{formatFechaListaConversaciones(item.ultimoMensaje.creadoEn)}</Text>}
                {item.sinLeer > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeTexto}>{item.sinLeer > 99 ? '99+' : item.sinLeer}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ui.background },
  lista: { padding: Spacing.screen.horizontal, paddingBottom: Spacing.section },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    minHeight: Spacing.touch.comfortable + Spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.hablemos.accent, alignItems: 'center', justifyContent: 'center' },
  avatarInicial: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.text.onDark },
  info: { flex: 1, gap: 2 },
  nombre: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.primary, paddingRight: 10 },
  preview: { fontSize: Typography.size.sm, color: Colors.text.hint, paddingRight: 10 },
  previewNoLeido: { color: Colors.text.primary, fontWeight: Typography.weight.semibold },
  meta: { alignItems: 'flex-end', gap: Spacing.xs },
  hora: { fontSize: Typography.size.xs, color: Colors.text.hint },
  badge: { minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 6, backgroundColor: Colors.hablemos.noLeidosBadge, alignItems: 'center', justifyContent: 'center' },
  badgeTexto: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: Colors.text.onDark },
  vacioContainer: { alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.section, paddingHorizontal: Spacing.xxxl },
  vacioEmoji: { fontSize: 56 },
  vacioTexto: { fontSize: Typography.size.md, color: Colors.text.hint, textAlign: 'center' },
  reintentar: { backgroundColor: Colors.hablemos.accent, borderRadius: Spacing.radius.xl, paddingHorizontal: Spacing.xl, minHeight: Spacing.touch.min, justifyContent: 'center' },
  reintentarTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.onDark },
});
