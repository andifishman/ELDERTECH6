// Ajustes del Asistente — velocidad de voz, tamaño de texto, leer respuestas
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { AppHeader } from '@/components/common/AppHeader';
import { useAsistenteConfig, getSpeechRate } from '@/context/AsistenteConfigContext';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import type { ConfigVoz } from '@/types/asistente.types';

export default function AjustesAsistenteScreen() {
  const insets = useSafeAreaInsets();
  const { config, setVelocidad, setTamanoTexto, toggleLeerRespuestas } = useAsistenteConfig();

  function probarVoz() {
    Speech.stop();
    Speech.speak('Esta es la velocidad y el volumen del asistente.', {
      language: 'es-AR',
      rate: getSpeechRate(config.velocidad),
    });
  }

  return (
    <View style={styles.root}>
      <AppHeader
        titulo="Ajustes"
        mostrarVolver
        backgroundColor={Colors.brand.blueDark}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Leer respuestas ── */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Voz del asistente</Text>

          <View style={styles.opcionSwitch}>
            <View style={styles.opcionInfo}>
              <Text style={styles.opcionLabel}>Leer respuestas automáticamente</Text>
              <Text style={styles.opcionDesc}>
                El asistente leerá en voz alta cada respuesta
              </Text>
            </View>
            <Switch
              value={config.leerRespuestas}
              onValueChange={toggleLeerRespuestas}
              trackColor={{ false: Colors.ui.disabled, true: Colors.brand.blueDark }}
              thumbColor={Colors.ui.surface}
              accessibilityLabel="Activar lectura automática de respuestas"
            />
          </View>
        </View>

        {/* ── Velocidad ── */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Velocidad de la voz</Text>
          <Text style={styles.seccionDesc}>
            Pensado para que sea más fácil de entender
          </Text>

          <View style={styles.opcionesRow}>
            {(['lenta', 'normal'] as ConfigVoz['velocidad'][]).map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.opcionBtn, config.velocidad === v && styles.opcionBtnActivo]}
                onPress={() => setVelocidad(v)}
                accessibilityLabel={`Velocidad ${v}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: config.velocidad === v }}
              >
                <Text style={styles.opcionEmoji}>
                  {v === 'lenta' ? '🐢' : '🐇'}
                </Text>
                <Text style={[
                  styles.opcionBtnTexto,
                  config.velocidad === v && styles.opcionBtnTextoActivo,
                ]}>
                  {v === 'lenta' ? 'Lenta' : 'Normal'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.probarBtn}
            onPress={probarVoz}
            accessibilityLabel="Probar velocidad de voz"
            accessibilityRole="button"
          >
            <Text style={styles.probarBtnTexto}>🔊  Probar voz</Text>
          </TouchableOpacity>
        </View>

        {/* ── Tamaño de texto ── */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Tamaño del texto</Text>
          <Text style={styles.seccionDesc}>
            Ajuste el tamaño de las letras en el chat
          </Text>

          <View style={styles.opcionesRow}>
            {([
              { key: 'normal',     label: 'Normal',    size: 16 },
              { key: 'grande',     label: 'Grande',    size: 20 },
              { key: 'muy_grande', label: 'Muy grande', size: 24 },
            ] as { key: ConfigVoz['tamanoTexto']; label: string; size: number }[]).map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[styles.opcionBtn, config.tamanoTexto === t.key && styles.opcionBtnActivo]}
                onPress={() => setTamanoTexto(t.key)}
                accessibilityLabel={`Tamaño ${t.label}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: config.tamanoTexto === t.key }}
              >
                <Text style={{ fontSize: t.size, fontWeight: Typography.weight.bold, color: config.tamanoTexto === t.key ? Colors.text.onDark : Colors.text.primary }}>
                  Aa
                </Text>
                <Text style={[
                  styles.opcionBtnTexto,
                  config.tamanoTexto === t.key && styles.opcionBtnTextoActivo,
                ]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ui.background },
  content: {
    padding: Spacing.screen.horizontal,
    gap: Spacing.lg,
  },

  seccion: {
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  seccionTitulo: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  seccionDesc: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    lineHeight: 22,
    marginTop: -Spacing.sm,
  },

  // Switch
  opcionSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  opcionInfo: { flex: 1 },
  opcionLabel: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  opcionDesc: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    marginTop: 2,
    lineHeight: 20,
  },

  // Botones de opciones
  opcionesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  opcionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.radius.lg,
    borderWidth: 2,
    borderColor: Colors.ui.border,
    backgroundColor: Colors.ui.background,
    minHeight: Spacing.touch.comfortable,
  },
  opcionBtnActivo: {
    backgroundColor: Colors.brand.blueDark,
    borderColor: Colors.brand.blueDark,
  },
  opcionEmoji: { fontSize: 24 },
  opcionBtnTexto: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text.secondary,
  },
  opcionBtnTextoActivo: {
    color: Colors.text.onDark,
  },

  // Probar voz
  probarBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Spacing.radius.lg,
    borderWidth: 2,
    borderColor: Colors.brand.blueDark,
    minHeight: Spacing.touch.comfortable,
    justifyContent: 'center',
  },
  probarBtnTexto: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.brand.blueDark,
  },
});
