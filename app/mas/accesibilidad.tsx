// Pantalla de ajustes de accesibilidad — tamaño de texto y buscar actualizaciones
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { useAccesibilidad, getEscala, type TamanoTexto } from '@/context/AccesibilidadContext';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

const OPCIONES_TAMANO: { valor: TamanoTexto; etiqueta: string; descripcion: string }[] = [
  { valor: 'normal', etiqueta: 'Normal', descripcion: 'Texto estándar' },
  { valor: 'grande', etiqueta: 'Grande', descripcion: 'Un poco más grande' },
];

export default function AccesibilidadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { config, setTamanoTexto } = useAccesibilidad();

  const [buscando, setBuscando] = useState(false);
  const [estadoActualizacion, setEstadoActualizacion] = useState<string | null>(null);

  // Busca, descarga y aplica la última actualización OTA publicada — sin esto,
  // la app solo revisa updates al abrirse desde cero, lo que no siempre es
  // obvio para probar cambios recién publicados.
  const buscarActualizacion = useCallback(async () => {
    if (!Updates.isEnabled) {
      Alert.alert(
        'No disponible',
        'Las actualizaciones automáticas no están activas en esta versión de la app (por ejemplo, si la estás probando desde Expo Go o un build de desarrollo).',
      );
      return;
    }
    setBuscando(true);
    setEstadoActualizacion(null);
    try {
      const resultado = await Updates.checkForUpdateAsync();
      if (!resultado.isAvailable) {
        setEstadoActualizacion('Ya tenés la última versión instalada.');
        return;
      }
      setEstadoActualizacion('Encontramos una actualización, descargando...');
      await Updates.fetchUpdateAsync();
      // Reinicia la app ya con la nueva versión cargada.
      await Updates.reloadAsync();
    } catch {
      setEstadoActualizacion('No se pudo buscar actualizaciones. Revisá tu conexión a internet e intentá de nuevo.');
    } finally {
      setBuscando(false);
    }
  }, []);

  return (
    <View style={styles.root}>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.back()}
          accessibilityLabel="Volver"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={26} color={Colors.text.onDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Accesibilidad</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Tamaño de texto ── */}
        <Text style={styles.seccionTitulo}>Tamaño de texto</Text>

        <View style={styles.card}>
          {OPCIONES_TAMANO.map((op, i) => {
            const activo = config.tamanoTexto === op.valor;
            return (
              <React.Fragment key={op.valor}>
                {i > 0 && <View style={styles.divisor} />}
                <TouchableOpacity
                  style={[styles.opcionFila, activo && styles.opcionFilaActiva]}
                  onPress={() => setTamanoTexto(op.valor)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Tamaño ${op.etiqueta}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: activo }}
                >
                  <View style={styles.opcionTextos}>
                    <Text style={[
                      styles.opcionEtiqueta,
                      { fontSize: 18 * getEscala(op.valor) },
                      activo && styles.opcionEtiquetaActiva,
                    ]}>
                      {op.etiqueta}
                    </Text>
                    <Text style={styles.opcionDesc}>{op.descripcion}</Text>
                  </View>
                  <View style={[styles.radio, activo && styles.radioActivo]}>
                    {activo && <View style={styles.radioPunto} />}
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>

        {/* ── Buscar actualización ── */}
        <Text style={styles.seccionTitulo}>Actualizaciones</Text>

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.actualizarBtn}
            onPress={buscarActualizacion}
            disabled={buscando}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Buscar actualización de la aplicación"
          >
            {buscando ? (
              <ActivityIndicator color={Colors.text.onDark} />
            ) : (
              <Ionicons name="refresh" size={22} color={Colors.text.onDark} />
            )}
            <Text style={styles.actualizarBtnTexto}>{buscando ? 'Buscando...' : 'Buscar actualización'}</Text>
          </TouchableOpacity>
          {estadoActualizacion && (
            <Text style={styles.actualizarEstadoTexto}>{estadoActualizacion}</Text>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ui.background },

  header: {
    backgroundColor: Colors.brand.greenDark,
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
  },
  headerTitulo: {
    flex: 1,
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
    textAlign: 'center',
  },

  scroll: { flex: 1 },
  content: {
    padding: Spacing.screen.horizontal,
    gap: Spacing.md,
  },

  seccionTitulo: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
    marginTop: Spacing.sm,
    marginBottom: 2,
  },

  card: {
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.lg,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
  },

  divisor: { height: 1, backgroundColor: Colors.ui.border },

  opcionFila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    minHeight: 72,
  },
  opcionFilaActiva: {
    backgroundColor: 'rgba(27,94,59,0.07)',
  },
  opcionTextos: { flex: 1, gap: 2 },
  opcionEtiqueta: {
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  opcionEtiquetaActiva: {
    color: Colors.brand.greenDark,
  },
  opcionDesc: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
  },

  radio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.ui.disabled,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioActivo: { borderColor: Colors.brand.greenDark },
  radioPunto: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.brand.greenDark,
  },

  actualizarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.brand.greenDark,
    paddingVertical: Spacing.lg,
    minHeight: Spacing.touch.large,
  },
  actualizarBtnTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.onDark },
  actualizarEstadoTexto: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },

  preview: {
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.lg,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  previewLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.medium,
    color: Colors.text.hint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewTexto: {
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    lineHeight: 28,
  },
  previewSub: {
    color: Colors.text.secondary,
    lineHeight: 20,
  },
});
