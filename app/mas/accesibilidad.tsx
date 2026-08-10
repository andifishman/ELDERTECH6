// Pantalla de ajustes de accesibilidad — tamaño de texto
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { useAccesibilidad, getEscala, type TamanoTexto } from '@/context/AccesibilidadContext';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

// Muestra qué versión del código está corriendo y permite forzar la
// búsqueda/descarga de una actualización a mano. Se agregó porque varias
// veces se publicó un fix por `eas update` y no había forma de confirmar,
// mirando el celular, si ese update había llegado a bajarse y aplicarse —
// solo quedaba "cerrá la app un par de veces y fijate" sin certeza real.
function infoActualizacion(): { canal: string; id: string; fecha: string } {
  const canal = Updates.channel || '—';
  if (!Updates.isEmbeddedLaunch && Updates.updateId) {
    const fecha = Updates.createdAt
      ? new Date(Updates.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
      : '—';
    return { canal, id: Updates.updateId.slice(0, 8), fecha };
  }
  return { canal, id: 'integrada en la app (sin update)', fecha: '—' };
}

const OPCIONES_TAMANO: { valor: TamanoTexto; etiqueta: string; descripcion: string }[] = [
  { valor: 'normal', etiqueta: 'Normal', descripcion: 'Texto estándar' },
  { valor: 'grande', etiqueta: 'Grande', descripcion: 'Un poco más grande' },
];

export default function AccesibilidadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { config, setTamanoTexto } = useAccesibilidad();
  const [buscando, setBuscando] = useState(false);
  const info = infoActualizacion();

  const buscarActualizacion = async () => {
    if (Platform.OS === 'web' || __DEV__) {
      Alert.alert('No disponible', 'Buscar actualizaciones solo funciona en la app instalada (APK), no en modo desarrollo.');
      return;
    }
    setBuscando(true);
    try {
      const resultado = await Updates.checkForUpdateAsync();
      if (!resultado.isAvailable) {
        Alert.alert('Ya estás al día', 'No hay ninguna actualización nueva — esta es la última versión.');
        return;
      }
      await Updates.fetchUpdateAsync();
      Alert.alert(
        '¡Hay una actualización nueva!',
        'Se descargó. La app se va a reiniciar ahora para aplicarla.',
        [{ text: 'OK', onPress: () => { void Updates.reloadAsync(); } }],
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      Alert.alert('No se pudo buscar la actualización', msg);
    } finally {
      setBuscando(false);
    }
  };

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

        {/* ── Actualizaciones ── */}
        <Text style={styles.seccionTitulo}>Actualizaciones</Text>
        <View style={styles.card}>
          <View style={styles.updateInfoBox}>
            <Text style={styles.updateInfoLinea}>Canal: <Text style={styles.updateInfoValor}>{info.canal}</Text></Text>
            <Text style={styles.updateInfoLinea}>Versión: <Text style={styles.updateInfoValor}>{info.id}</Text></Text>
            {info.fecha !== '—' && (
              <Text style={styles.updateInfoLinea}>Publicada: <Text style={styles.updateInfoValor}>{info.fecha}</Text></Text>
            )}
          </View>
          <View style={styles.divisor} />
          <TouchableOpacity
            style={styles.buscarUpdateBtn}
            onPress={buscarActualizacion}
            disabled={buscando}
            accessibilityRole="button"
            accessibilityLabel="Buscar actualización"
          >
            {buscando ? (
              <ActivityIndicator color={Colors.brand.greenDark} />
            ) : (
              <>
                <Ionicons name="cloud-download-outline" size={22} color={Colors.brand.greenDark} />
                <Text style={styles.buscarUpdateBtnTexto}>Buscar actualización</Text>
              </>
            )}
          </TouchableOpacity>
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

  updateInfoBox: { padding: Spacing.lg, gap: 4 },
  updateInfoLinea: { fontSize: Typography.size.sm, color: Colors.text.secondary },
  updateInfoValor: { fontWeight: Typography.weight.semibold, color: Colors.text.primary },
  buscarUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    minHeight: 56,
  },
  buscarUpdateBtnTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.brand.greenDark },
});
