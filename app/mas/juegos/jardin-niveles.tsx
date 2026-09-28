// Mapa de niveles de Jardín ElderTech — camino estilo "candy crush": 30
// niveles en fila, cada uno se desbloquea al completar el anterior, con 1 a
// 3 estrellas según cuántos movimientos usó el residente para llegar al
// objetivo. El detalle de cada nivel vive en @/constants/nivelesJardin; acá
// solo se pinta el progreso que devuelve el backend.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '@/components/ui/AppHeader';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';
import { NIVELES_JARDIN } from '@/constants/nivelesJardin';
import { obtenerProgresoNivelesJardin, type ProgresoNivelJardin } from '@/services/juegosService';

function NodoNivel({
  nivel,
  estado,
  estrellas,
  alineacion,
  onPress,
}: {
  nivel: number;
  estado: 'bloqueado' | 'disponible' | 'completado';
  estrellas: number;
  alineacion: 'left' | 'center' | 'right';
  onPress: () => void;
}) {
  const colores: Record<typeof estado, [string, string]> = {
    bloqueado: ['#B0BEC5', '#78909C'],
    disponible: ['#66BB6A', Colors.primary],
    completado: ['#FFD54F', '#F57F17'],
  } as const;
  const [claro, oscuro] = colores[estado];

  return (
    <View
      style={[
        styles.filaNodo,
        alineacion === 'left' && { justifyContent: 'flex-start' },
        alineacion === 'right' && { justifyContent: 'flex-end' },
        alineacion === 'center' && { justifyContent: 'center' },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        disabled={estado === 'bloqueado'}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ disabled: estado === 'bloqueado' }}
        accessibilityLabel={
          estado === 'bloqueado'
            ? `Nivel ${nivel}, bloqueado. Completá el nivel ${nivel - 1} primero.`
            : `Nivel ${nivel}${estado === 'completado' ? `, completado con ${estrellas} de 3 estrellas` : ', disponible'}`
        }
        style={styles.nodoWrap}
      >
        <View style={[styles.nodo, { backgroundColor: oscuro, borderColor: claro }]}>
          {estado === 'bloqueado' ? (
            <Ionicons name="lock-closed" size={26} color="#ECEFF1" />
          ) : (
            <Text style={styles.nodoTexto}>{nivel}</Text>
          )}
        </View>
        {estado === 'completado' && (
          <View style={styles.estrellasFila}>
            {[1, 2, 3].map((n) => (
              <Ionicons
                key={n}
                name={n <= estrellas ? 'star' : 'star-outline'}
                size={16}
                color={n <= estrellas ? '#F9A825' : '#CFD8DC'}
              />
            ))}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function JardinNivelesScreen() {
  const router = useRouter();
  const [progreso, setProgreso] = useState<ProgresoNivelJardin[] | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(() => {
    setCargando(true);
    obtenerProgresoNivelesJardin()
      .then(setProgreso)
      .catch(() => setProgreso([]))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Al volver de jugar un nivel, refresca el progreso para desbloquear el siguiente.
  useFocusEffect(cargar);

  const progresoPorNivel = new Map((progreso ?? []).map((p) => [p.nivel, p]));

  const irANivel = (nivel: number) => {
    router.push(`/mas/juegos/jardin?nivel=${nivel}` as never);
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Jardín ElderTech" showBack />

      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.titulo}>Camino de niveles</Text>
          <Text style={styles.subtitulo}>
            Completá cada nivel para desbloquear el siguiente. Cuantos menos movimientos uses, más estrellas ganás.
          </Text>

          <TouchableOpacity
            style={styles.libreBtnWrap}
            onPress={() => router.push('/mas/juegos/jardin' as never)}
            activeOpacity={0.85}
          >
            <View style={styles.libreBtn}>
              <Ionicons name="infinite" size={20} color={Colors.primary} />
              <Text style={styles.libreBtnText}>Jugar en modo libre (sin niveles)</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.camino}>
            {NIVELES_JARDIN.map((n, idx) => {
              const propio = progresoPorNivel.get(n.numero);
              const anteriorCompletado = n.numero === 1 || progresoPorNivel.has(n.numero - 1);
              const estado: 'bloqueado' | 'disponible' | 'completado' = propio
                ? 'completado'
                : anteriorCompletado
                  ? 'disponible'
                  : 'bloqueado';
              const alineacion = idx % 4 === 0 ? 'left' : idx % 4 === 1 ? 'center' : idx % 4 === 2 ? 'right' : 'center';
              return (
                <NodoNivel
                  key={n.numero}
                  nivel={n.numero}
                  estado={estado}
                  estrellas={propio?.estrellas ?? 0}
                  alineacion={alineacion}
                  onPress={() => irANivel(n.numero)}
                />
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  titulo: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.textPrimary, textAlign: 'center' },
  subtitulo: { fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.md, lineHeight: 22 },

  libreBtnWrap: { alignSelf: 'center', marginBottom: Spacing.lg },
  libreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  libreBtnText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: 'bold' },

  camino: { gap: Spacing.lg },
  filaNodo: { flexDirection: 'row', width: '100%' },
  nodoWrap: { alignItems: 'center', minWidth: 64 },
  nodo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  nodoTexto: { color: Colors.white, fontSize: FontSizes.lg, fontWeight: 'bold' },
  estrellasFila: { flexDirection: 'row', gap: 1, marginTop: 4 },
});
