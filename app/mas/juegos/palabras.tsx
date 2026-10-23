// Palabras — mapa de niveles: botón grande "Continuar", Top 3 y los 300 niveles agrupados por "mundo".
// Tres niveles por fila y bien grandes, para que sea fácil tocarlos. El nivel 1 está libre; cada nivel
// se desbloquea al completar el anterior. Los completados se pueden volver a jugar (sin pistas de premio).
import { FondoPalabras } from '@/components/palabras/FondoPalabras';
import { MUNDOS_PALABRAS, mundoDeNivel, NIVELES_POR_MUNDO } from '@/constants/mundosPalabras';
import { obtenerProgresoPalabras, obtenerTopPuntajes, type ProgresoPalabras, type TopPuntaje } from '@/services/juegosService';
import { guardarProgresoPalabras, leerProgresoPalabras } from '@/utils/palabrasEstado';
import { TOTAL_NIVELES_PALABRAS } from '@/utils/palabrasNiveles';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MEDALLAS = ['🥇', '🥈', '🥉'];
const COLUMNAS = 3;
const SEPARACION = 14;
const MARGEN = 16;

export default function PalabrasNivelesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Si ya se vio el progreso (por ejemplo al volver del juego), se muestra al instante y se refresca de fondo.
  const [progreso, setProgreso] = useState<ProgresoPalabras | null>(() => leerProgresoPalabras());
  const [top, setTop] = useState<TopPuntaje[]>([]);
  const [cargando, setCargando] = useState(() => leerProgresoPalabras() === null);
  const [error, setError] = useState(false);

  const cargar = useCallback(() => {
    setError(false);
    obtenerProgresoPalabras()
      .then((p) => {
        guardarProgresoPalabras(p);
        setProgreso(p);
      })
      .catch(() => setError(leerProgresoPalabras() === null))
      .finally(() => setCargando(false));
    obtenerTopPuntajes('palabras').then(setTop).catch(() => setTop([]));
  }, []);

  useFocusEffect(cargar);

  const completados = useMemo(() => new Set(progreso?.nivelesCompletados ?? []), [progreso]);
  const maximo = progreso && progreso.nivelesCompletados.length ? Math.max(...progreso.nivelesCompletados) : 0;
  const siguiente = Math.min(maximo + 1, TOTAL_NIVELES_PALABRAS);
  const terminoTodo = maximo >= TOTAL_NIVELES_PALABRAS;
  const mundoActual = mundoDeNivel(siguiente);

  const lado = Math.floor((Math.min(width, 560) - MARGEN * 2 - SEPARACION * (COLUMNAS - 1)) / COLUMNAS);

  const abrir = (nivel: number) => router.push({ pathname: '/mas/juegos/palabras-juego', params: { nivel: String(nivel) } } as never);

  return (
    <View style={styles.container}>
      <FondoPalabras mundo={mundoActual} />

      <View style={[styles.barra, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity style={styles.volver} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Volver">
          <Text style={styles.volverTexto}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.titulo} allowFontScaling={false}>Palabras</Text>
        <View style={styles.volver} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]} showsVerticalScrollIndicator={false}>
        {cargando ? (
          <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 40 }} />
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
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={terminoTodo ? 'Volver a jugar el último nivel' : `Jugar el nivel ${siguiente}`}
            >
              <Text style={styles.continuarChico}>{maximo === 0 ? 'Empezá a jugar' : terminoTodo ? '¡Completaste todo!' : 'Continuar'}</Text>
              <Text style={styles.continuarGrande}>Nivel {siguiente}</Text>
              <Text style={styles.continuarMundo}>{mundoActual.emoji} {mundoActual.nombre}</Text>
            </TouchableOpacity>

            <View style={styles.resumen}>
              <View style={styles.dato}><Text style={styles.datoTexto}>✓ {completados.size} de {TOTAL_NIVELES_PALABRAS}</Text></View>
              <View style={styles.dato}><Text style={styles.datoTexto}>💡 {progreso?.pistas ?? 0} pistas</Text></View>
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

            {MUNDOS_PALABRAS.map((mundo, m) => {
              const desde = m * NIVELES_POR_MUNDO + 1;
              const hasta = Math.min(desde + NIVELES_POR_MUNDO - 1, TOTAL_NIVELES_PALABRAS);
              const hechosMundo = Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i).filter((n) => completados.has(n)).length;
              return (
                <View key={mundo.nombre} style={styles.mundo}>
                  <View style={styles.mundoTitulo}>
                    <Text style={styles.mundoNombre} allowFontScaling={false}>{mundo.emoji} {mundo.nombre}</Text>
                    <Text style={styles.mundoAvance} allowFontScaling={false}>{hechosMundo}/{hasta - desde + 1}</Text>
                  </View>
                  <View style={styles.grilla}>
                    {Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i).map((n) => {
                      const hecho = completados.has(n);
                      const disponible = n <= maximo + 1;
                      const esActual = n === siguiente && !terminoTodo;
                      return (
                        <TouchableOpacity
                          key={n}
                          style={[
                            styles.nivel,
                            { width: lado, height: lado },
                            hecho && styles.nivelHecho,
                            esActual && { backgroundColor: '#FFC531', borderColor: '#FFFFFF' },
                            !disponible && styles.nivelBloqueado,
                          ]}
                          disabled={!disponible}
                          activeOpacity={0.8}
                          onPress={() => abrir(n)}
                          accessibilityRole="button"
                          accessibilityLabel={`Nivel ${n}${hecho ? ', completado' : disponible ? '' : ', bloqueado'}`}
                        >
                          {disponible ? (
                            <Text style={[styles.nivelNumero, esActual && { color: '#3A2A00' }]} allowFontScaling={false}>{n}</Text>
                          ) : (
                            <Text style={styles.nivelCandado}>🔒</Text>
                          )}
                          {hecho ? <Text style={styles.nivelTilde}>✓</Text> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const sombra = { shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 } as const;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B3C5D' },
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 6 },
  volver: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  volverTexto: { fontSize: 38, lineHeight: 42, color: '#FFFFFF', fontWeight: '700', marginTop: -4 },
  titulo: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },

  content: { paddingHorizontal: MARGEN, gap: 18, alignSelf: 'center', width: '100%', maxWidth: 560 },
  continuar: { backgroundColor: '#FFC531', borderRadius: 28, paddingVertical: 20, alignItems: 'center', minHeight: 120, justifyContent: 'center', ...sombra },
  continuarChico: { fontSize: 20, color: '#6B4A00', fontWeight: '700' },
  continuarGrande: { fontSize: 44, color: '#3A2A00', fontWeight: '800' },
  continuarMundo: { fontSize: 18, color: '#6B4A00', fontWeight: '700' },
  resumen: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  dato: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  datoTexto: { fontSize: 19, fontWeight: '800', color: '#2B3A55' },

  topCaja: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 22, padding: 16, gap: 10 },
  topTitulo: { fontSize: 21, fontWeight: '800', color: '#2B3A55' },
  topFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topTexto: { fontSize: 19, color: '#2B3A55', flexShrink: 1 },
  topPuntos: { fontSize: 19, fontWeight: '800', color: '#5E35B1' },

  mundo: { gap: 12 },
  mundoTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  mundoNombre: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  mundoAvance: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.95)' },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: SEPARACION },
  nivel: { borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center', ...sombra },
  nivelHecho: { backgroundColor: '#C8F0CF', borderColor: '#43A047' },
  nivelBloqueado: { backgroundColor: 'rgba(255,255,255,0.22)', borderColor: 'rgba(255,255,255,0.3)', shadowOpacity: 0, elevation: 0 },
  nivelNumero: { fontSize: 44, fontWeight: '800', color: '#2B3A55' },
  nivelCandado: { fontSize: 34, opacity: 0.85 },
  nivelTilde: { position: 'absolute', top: 6, right: 12, fontSize: 24, fontWeight: '800', color: '#2E7D32' },

  errorCaja: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 20, gap: 14, alignItems: 'center' },
  errorTexto: { fontSize: 19, textAlign: 'center', color: '#2B3A55' },
  reintentar: { minHeight: 56, paddingHorizontal: 28, borderRadius: 18, backgroundColor: '#2E7D32', alignItems: 'center', justifyContent: 'center' },
  reintentarTexto: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
});
