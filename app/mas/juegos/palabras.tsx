// Palabras — pantalla de niveles: botón grande "Continuar", Top 3 y la grilla de los 150 niveles.
// El nivel 1 está siempre libre; cada nivel se desbloquea al completar el anterior.
// Los niveles ya completados se pueden volver a jugar (sin pistas de premio).
import AppHeader from '@/components/ui/AppHeader';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';
import { obtenerProgresoPalabras, obtenerTopPuntajes, type ProgresoPalabras, type TopPuntaje } from '@/services/juegosService';
import { TOTAL_NIVELES_PALABRAS } from '@/utils/palabrasNiveles';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MEDALLAS = ['🥇', '🥈', '🥉'];

export default function PalabrasNivelesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [progreso, setProgreso] = useState<ProgresoPalabras | null>(null);
  const [top, setTop] = useState<TopPuntaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(() => {
    setError(false);
    obtenerProgresoPalabras()
      .then(setProgreso)
      .catch(() => setError(true))
      .finally(() => setCargando(false));
    obtenerTopPuntajes('palabras').then(setTop).catch(() => setTop([]));
  }, []);

  // Se recarga cada vez que se vuelve a esta pantalla (por ejemplo al terminar un nivel).
  useFocusEffect(cargar);

  const completados = useMemo(() => new Set(progreso?.nivelesCompletados ?? []), [progreso]);
  const maximo = progreso && progreso.nivelesCompletados.length ? Math.max(...progreso.nivelesCompletados) : 0;
  const siguiente = Math.min(maximo + 1, TOTAL_NIVELES_PALABRAS);
  const terminoTodo = maximo >= TOTAL_NIVELES_PALABRAS;

  const abrir = (nivel: number) => router.push({ pathname: '/mas/juegos/palabras-juego', params: { nivel: String(nivel) } } as never);

  return (
    <View style={styles.container}>
      <AppHeader title="Palabras" subtitle="Armá palabras con las letras" showBack />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {cargando ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing.xl }} />
        ) : error ? (
          <View style={styles.errorCaja}>
            <Text style={styles.errorTexto}>No pude cargar tu avance. Revisá la conexión.</Text>
            <TouchableOpacity style={styles.reintentar} onPress={cargar} accessibilityRole="button">
              <Text style={styles.reintentarTexto}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.continuar}
              onPress={() => abrir(siguiente)}
              accessibilityRole="button"
              accessibilityLabel={terminoTodo ? 'Volver a jugar el último nivel' : `Jugar el nivel ${siguiente}`}
            >
              <Text style={styles.continuarChico}>{maximo === 0 ? 'Empezá a jugar' : terminoTodo ? '¡Completaste todo!' : 'Continuar'}</Text>
              <Text style={styles.continuarGrande}>Nivel {siguiente}</Text>
            </TouchableOpacity>

            <View style={styles.resumen}>
              <Text style={styles.resumenTexto}>Completaste {completados.size} de {TOTAL_NIVELES_PALABRAS} niveles</Text>
              <Text style={styles.resumenTexto}>💡 Pistas: {progreso?.pistas ?? 0}</Text>
            </View>

            {top.length > 0 && (
              <View style={styles.topCaja}>
                <Text style={styles.topTitulo}>🏆 Los que más avanzaron</Text>
                {top.map((t, i) => (
                  <View key={t.residenteId} style={styles.topFila}>
                    <Text style={styles.topTexto}>{MEDALLAS[i] ?? ''} {t.nombre}</Text>
                    <Text style={styles.topPuntos}>Nivel {t.puntos}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.seccion}>Todos los niveles</Text>
            <View style={styles.grilla}>
              {Array.from({ length: TOTAL_NIVELES_PALABRAS }, (_, i) => i + 1).map((n) => {
                const hecho = completados.has(n);
                const disponible = n <= maximo + 1;
                return (
                  <TouchableOpacity
                    key={n}
                    style={[styles.nivel, hecho && styles.nivelHecho, !disponible && styles.nivelBloqueado, n === siguiente && !terminoTodo && styles.nivelActual]}
                    disabled={!disponible}
                    onPress={() => abrir(n)}
                    accessibilityRole="button"
                    accessibilityLabel={`Nivel ${n}${hecho ? ', completado' : disponible ? '' : ', bloqueado'}`}
                  >
                    <Text style={[styles.nivelNumero, !disponible && styles.nivelNumeroBloqueado]}>{disponible ? n : '🔒'}</Text>
                    {hecho ? <Text style={styles.nivelTilde}>✓</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.md },
  continuar: { backgroundColor: '#5E35B1', borderRadius: Radius.lg, paddingVertical: Spacing.lg, alignItems: 'center', minHeight: 96, justifyContent: 'center', elevation: 3 },
  continuarChico: { fontSize: FontSizes.md, color: '#D1C4E9', fontWeight: '700' },
  continuarGrande: { fontSize: 34, color: '#FFFFFF', fontWeight: '800' },
  resumen: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.sm },
  resumenTexto: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.textPrimary },
  topCaja: { backgroundColor: '#FFFFFF', borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  topTitulo: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.textPrimary },
  topFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topTexto: { fontSize: FontSizes.md, color: Colors.textPrimary, flexShrink: 1 },
  topPuntos: { fontSize: FontSizes.md, fontWeight: '800', color: '#5E35B1' },
  seccion: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.textPrimary, marginTop: Spacing.sm },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start' },
  nivel: { width: 64, height: 64, borderRadius: Radius.md, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#B39DDB', alignItems: 'center', justifyContent: 'center' },
  nivelHecho: { backgroundColor: '#E8F5E9', borderColor: Colors.success },
  nivelActual: { backgroundColor: '#EDE7F6', borderColor: '#5E35B1', borderWidth: 3 },
  nivelBloqueado: { backgroundColor: '#EEEEEE', borderColor: '#CCCCCC' },
  nivelNumero: { fontSize: FontSizes.lg, fontWeight: '800', color: '#311B92' },
  nivelNumeroBloqueado: { color: '#9E9E9E', fontSize: FontSizes.md },
  nivelTilde: { position: 'absolute', top: 2, right: 6, fontSize: 14, fontWeight: '800', color: Colors.success },
  errorCaja: { backgroundColor: '#FFFFFF', borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md, alignItems: 'center' },
  errorTexto: { fontSize: FontSizes.md, textAlign: 'center', color: Colors.textPrimary },
  reintentar: { minHeight: 52, paddingHorizontal: Spacing.xl, borderRadius: Radius.lg, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  reintentarTexto: { fontSize: FontSizes.md, fontWeight: '800', color: '#FFFFFF' },
});
