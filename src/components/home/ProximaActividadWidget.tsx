// Widget de próxima actividad para el Home — lee del caché React Query (sin request extra)
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';
import { useRouter } from 'expo-router';
import { useActividades } from '@/hooks/useActividades';
import { parseHora, formatHora } from '@/utils/dateUtils';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import type { ActividadCompleta } from '@/types/database.types';

export function ProximaActividadWidget() {
  const router = useRouter();
  // useMemo evita recrear la fecha en cada render — la query usa toSupabaseDate así que
  // una fecha del mismo día siempre devuelve el mismo cache hit
  const hoy = useMemo(() => new Date(), []);
  const { data: actividades } = useActividades(hoy);

  // Tick sincronizado con el cambio de minuto real del reloj
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const now = new Date();
    const msHastaProximoMinuto = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    const timeoutId = setTimeout(() => {
      setTick((t) => t + 1);
      intervalId = setInterval(() => setTick((t) => t + 1), 60_000);
    }, msHastaProximoMinuto);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const { proxima, minutosRestantes } = useMemo(() => {
    if (!actividades || actividades.length === 0) {
      return { proxima: null, minutosRestantes: 0 };
    }

    const ahora = new Date();
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();

    const futuras = (actividades as ActividadCompleta[])
      .filter((a) => {
        const { horas, minutos } = parseHora(a.hora_inicio);
        return horas * 60 + minutos > minutosAhora;
      })
      .sort((a, b) => {
        const pa = parseHora(a.hora_inicio);
        const pb = parseHora(b.hora_inicio);
        return pa.horas * 60 + pa.minutos - (pb.horas * 60 + pb.minutos);
      });

    const siguiente = futuras[0] ?? null;
    if (!siguiente) return { proxima: null, minutosRestantes: 0 };

    const { horas, minutos } = parseHora(siguiente.hora_inicio);
    return {
      proxima: siguiente,
      minutosRestantes: horas * 60 + minutos - minutosAhora,
    };
  }, [actividades, tick]);

  if (!proxima) return null;

  const emoji = proxima.emoji_icono ?? proxima.tipo_actividad?.emoji ?? '📅';
  const hora = formatHora(proxima.hora_inicio);
  const esPronto = minutosRestantes <= 30;

  const textoHablar = esPronto
    ? `Próxima actividad en ${minutosRestantes} minutos: ${proxima.nombre} a las ${hora}`
    : `Próxima actividad: ${proxima.nombre} a las ${hora}`;

  return (
    <TouchableOpacity
      style={[styles.card, esPronto && styles.cardPronto]}
      onPress={() => router.push(`/horarios/${proxima.id}` as never)}
      activeOpacity={0.85}
      accessibilityLabel={textoHablar}
      accessibilityRole="button"
    >
      {/* Izquierda: [emoji + label] en fila, nombre abajo */}
      <View style={styles.left}>
        <View style={styles.topRow}>
          <View style={[styles.emojiCircle, esPronto && styles.emojiCirclePronto]}>
            <Text style={styles.emoji}>{emoji}</Text>
          </View>
          <Text style={styles.label} numberOfLines={1}>Próxima actividad</Text>
        </View>
        <Text style={styles.nombre} numberOfLines={2}>
          {proxima.nombre}
        </Text>
      </View>

      {/* Hora / badge urgente + botón escuchar */}
      <View style={styles.right}>
        {esPronto ? (
          <View style={styles.prontoBadge}>
            <Text style={styles.prontoTexto}>En {minutosRestantes} minutos</Text>
          </View>
        ) : (
          <View style={styles.horaBadge}>
            <Text style={styles.horaTexto}>{hora}</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.speakBtn}
          onPress={() => {
            Speech.stop();
            Speech.speak(textoHablar, { language: 'es-AR', rate: 0.9 });
          }}
          accessibilityLabel="Escuchar próxima actividad"
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <Text style={styles.speakIcon}>🔊</Text>
          <Text style={styles.speakTexto}>Escuchar</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.lg,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardPronto: {
    borderColor: '#FFE082',
    backgroundColor: '#FFFDE7',
  },

  emojiCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emojiCirclePronto: {
    backgroundColor: '#FFF9C4',
  },
  emoji: {
    fontSize: 20,
  },

  left: {
    flex: 1,
    gap: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  label: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    color: Colors.text.hint,
    flex: 1,
  },
  nombre: {
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginLeft: 44,
    marginTop: -4,
  },

  right: {
    alignItems: 'stretch',
    gap: 6,
    flexShrink: 0,
  },
  horaBadge: {
    backgroundColor: Colors.brand.greenDark,
    borderRadius: Spacing.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 5,
    alignItems: 'center',
  },
  horaTexto: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.heavy,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  prontoBadge: {
    backgroundColor: '#FF8F00',
    borderRadius: Spacing.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 5,
    alignItems: 'center',
  },
  prontoTexto: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.heavy,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  speakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  speakIcon: {
    fontSize: 15,
  },
  speakTexto: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: '#3D5AFE',
  },
});
