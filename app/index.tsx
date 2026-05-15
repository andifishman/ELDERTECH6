import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { HomeCard } from '@/components/home/HomeCard';
import { SpeakRow, SpeakButton } from '@/components/common/SpeakButton';
import { formatFechaCorta } from '@/utils/dateUtils';

const CARDS_GRID = [
  {
    id: 'llamar',
    label: 'Llamar',
    emoji: '📞',
    backgroundColor: Colors.brand.greenMedium,
    ruta: '/llamar' as const,
    textoHablar: 'Llamar. Llamá a tus contactos.',
  },
  {
    id: 'articulos',
    label: 'Artículos',
    emoji: '📖',
    backgroundColor: Colors.brand.purple,
    ruta: '/articulos' as const,
    textoHablar: 'Artículos. Leé guías y consejos.',
  },
  {
    id: 'asistente',
    label: 'Asistente',
    emoji: '🤖',
    backgroundColor: Colors.brand.blueDark,
    ruta: '/asistente' as const,
    textoHablar: 'Asistente. Hablá con el asistente virtual.',
  },
  {
    id: 'mas',
    label: 'Más',
    emoji: '➕',
    backgroundColor: Colors.brand.orange,
    ruta: '/mas' as const,
    textoHablar: 'Más. Ver más opciones: clima, radio y juegos.',
  },
] as const;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const hoy = new Date();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.appLogo}>🌿</Text>
          <Text style={styles.appName}>ElderTech</Text>
        </View>
        <TouchableOpacity
          style={styles.headerIcon}
          accessibilityLabel="Configuración"
          accessibilityRole="button"
        >
          <Ionicons name="globe-outline" size={26} color={Colors.text.onDark} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Fecha + Avatar ── */}
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>{formatFechaCorta(hoy)}</Text>
          <TouchableOpacity
            style={styles.avatar}
            accessibilityLabel="Perfil de usuario"
            accessibilityRole="button"
          >
            <Ionicons name="person-outline" size={22} color={Colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* ── Tarjeta Horarios (grande) ── */}
        <TouchableOpacity
          style={styles.horariosCard}
          onPress={() => router.push('/horarios')}
          activeOpacity={0.85}
          accessibilityLabel="Horarios del día"
          accessibilityRole="button"
        >
          <Text style={styles.horariosEmoji}>📅</Text>
          <Text style={styles.horariosLabel}>Horarios</Text>
          <SpeakButton
            texto="Horarios del día. Mirá las actividades programadas para hoy."
            label="Escuchar Descripcion"
            variante="chip"
          />
        </TouchableOpacity>

        {/* ── Grid 2×2 ── */}
        <View style={styles.grid}>
          {CARDS_GRID.map((card) => (
            <HomeCard
              key={card.id}
              label={card.label}
              emoji={card.emoji}
              backgroundColor={card.backgroundColor}
              textoHablar={card.textoHablar}
              onPress={() => router.push(card.ruta)}
              variant="small"
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.brand.greenDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.brand.greenDark,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  appLogo: {
    fontSize: 26,
  },
  appName: {
    fontSize: 22,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
    letterSpacing: 0.5,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.ui.background,
    borderTopLeftRadius: 0,
  },
  scrollContent: {
    padding: Spacing.screen.horizontal,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  dateText: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.ui.surface,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  horariosCard: {
    backgroundColor: Colors.brand.red,
    borderRadius: Spacing.radius.xl,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  horariosEmoji: {
    fontSize: 52,
  },
  horariosLabel: {
    ...Typography.styles.cardTitle,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
});
