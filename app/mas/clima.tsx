import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppHeader } from '@/components/common/AppHeader';
import { LoadingState, ErrorState } from '@/components/common/LoadingState';
import { useClima } from '@/hooks/useClima';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import type { PronosticoDia } from '@/types/clima.types';

export default function ClimaScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useClima();

  if (isLoading) {
    return (
      <View style={styles.root}>
        <AppHeader titulo="Clima" subtitulo="Temperatura y pronóstico" mostrarVolver />
        <LoadingState mensaje="Cargando clima..." color={Colors.weather.background} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.root}>
        <AppHeader titulo="Clima" subtitulo="Temperatura y pronóstico" mostrarVolver />
        <ErrorState mensaje="No se pudo cargar el clima. Verificá tu conexión." onReintentar={refetch} />
      </View>
    );
  }

  const textoHablar = [
    `Clima en ${data.ciudad}.`,
    `Temperatura actual: ${data.temperatura} grados.`,
    `${data.descripcion}.`,
    `Máxima ${data.tempMax} grados, mínima ${data.tempMin} grados.`,
    `Sensación térmica ${data.sensacionTermica} grados.`,
    `Humedad ${data.humedad} por ciento.`,
    `Viento ${data.viento} kilómetros por hora.`,
  ].join(' ');

  return (
    <View style={styles.root}>
      <AppHeader
        titulo="Clima"
        subtitulo="Temperatura y pronóstico"
        mostrarVolver
        textoHablar={textoHablar}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.text.onDark}
          />
        }
      >
        {/* ── Card principal con gradiente ── */}
        <LinearGradient
          colors={['#1565C0', '#1976D2', '#2196F3']}
          style={styles.weatherCard}
        >
          <Text style={styles.ciudadNombre}>{data.ciudad}</Text>
          <Text style={styles.ciudadPais}>{data.pais}</Text>

          <Text style={styles.weatherEmoji}>{data.emoji}</Text>
          <Text style={styles.temperatura}>{data.temperatura}°C</Text>
          <Text style={styles.descripcion}>{data.descripcion}</Text>
          <Text style={styles.maxMin}>
            Máx {data.tempMax}° · Mín {data.tempMin}°
          </Text>

          {/* Detalles */}
          <View style={styles.detallesRow}>
            <DetalleItem emoji="🌡️" valor={`${data.sensacionTermica}°C`} label="Sensación" />
            <DetalleItem emoji="💧" valor={`${data.humedad}%`} label="Humedad" />
            <DetalleItem emoji="💨" valor={`${data.viento} km/h`} label="Viento" />
          </View>
        </LinearGradient>

        {/* ── Pronóstico 7 días ── */}
        <View style={styles.pronosticoContainer}>
          <Text style={styles.pronosticoTitulo}>Pronóstico 7 días</Text>
          {data.pronostico.map((dia: PronosticoDia) => (
            <PronosticoDiaRow key={dia.fecha} dia={dia} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function DetalleItem({ emoji, valor, label }: { emoji: string; valor: string; label: string }) {
  return (
    <View style={styles.detalleItem}>
      <Text style={styles.detalleEmoji}>{emoji}</Text>
      <Text style={styles.detalleValor}>{valor}</Text>
      <Text style={styles.detalleLabel}>{label}</Text>
    </View>
  );
}

function PronosticoDiaRow({ dia }: { dia: PronosticoDia }) {
  return (
    <View style={styles.pronosticoRow}>
      <Text style={styles.pronosticoDia}>{dia.labelDia}</Text>
      <Text style={styles.pronosticoEmoji}>{dia.emoji}</Text>
      <Text style={styles.pronosticoTemps}>
        {dia.tempMax}° / {dia.tempMin}°
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  weatherCard: {
    margin: Spacing.screen.horizontal,
    borderRadius: Spacing.radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.sm,
    elevation: 4,
    shadowColor: Colors.weather.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  ciudadNombre: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },
  ciudadPais: {
    fontSize: Typography.size.sm,
    color: Colors.text.onDarkSecondary,
  },
  weatherEmoji: {
    fontSize: 72,
    marginVertical: Spacing.sm,
  },
  temperatura: {
    fontSize: Typography.size.display,
    fontWeight: Typography.weight.heavy,
    color: Colors.text.onDark,
    lineHeight: 56,
  },
  descripcion: {
    fontSize: Typography.size.lg,
    color: Colors.text.onDark,
    fontWeight: Typography.weight.medium,
  },
  maxMin: {
    fontSize: Typography.size.md,
    color: Colors.text.onDarkSecondary,
  },
  detallesRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    backgroundColor: Colors.weather.card,
    borderRadius: Spacing.radius.lg,
    borderWidth: 1,
    borderColor: Colors.weather.cardBorder,
    overflow: 'hidden',
    width: '100%',
  },
  detalleItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: 4,
  },
  detalleEmoji: {
    fontSize: 20,
  },
  detalleValor: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },
  detalleLabel: {
    fontSize: Typography.size.xs,
    color: Colors.text.onDarkSecondary,
  },
  pronosticoContainer: {
    backgroundColor: Colors.ui.surface,
    margin: Spacing.screen.horizontal,
    marginTop: 0,
    borderRadius: Spacing.radius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.xxxl,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  pronosticoTitulo: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  pronosticoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
  },
  pronosticoDia: {
    flex: 1,
    fontSize: Typography.size.md,
    color: Colors.text.primary,
    fontWeight: Typography.weight.medium,
  },
  pronosticoEmoji: {
    fontSize: 22,
    width: 36,
    textAlign: 'center',
  },
  pronosticoTemps: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.semibold,
    textAlign: 'right',
    minWidth: 80,
  },
});
