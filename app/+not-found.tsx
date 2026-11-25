//pantalla 404 de la app (celular y web): se muestra cuando se abre una ruta que no existe, por ejemplo un enlace viejo o una notificación antigua.
//Criterios para adultos mayores: dice claro qué pasó sin culpar a nadie, letra grande, botones de 56 px, una salida obvia ("Ir al inicio")
//y botón "Escuchar" (no habla sola: un audio inesperado asusta).
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MateIlustracion } from '@/components/common/MateIlustracion';
import { SpeakButton } from '@/components/common/SpeakButton';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { Typography } from '@/constants/Typography';

const TITULO = '¡Ups! Esta página se fue a tomar unos mates';
const MENSAJE = 'No encontramos lo que buscabas. No es culpa tuya: puede que el enlace sea viejo o que la pantalla ya no exista.';

export default function NoEncontrada() {
  const router = useRouter();

  const irAlInicio = () => router.replace('/');
  const volver = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.contenido} bounces={false}>
        <View style={styles.tarjeta}>
          <View style={styles.numeros} accessible={false} importantForAccessibility="no-hide-descendants">
            <Text style={styles.cuatro} allowFontScaling={false}>4</Text>
            <MateIlustracion tamano={120} estado="perdido" />
            <Text style={styles.cuatro} allowFontScaling={false}>4</Text>
          </View>

          <Text style={styles.titulo} accessibilityRole="header">{TITULO}</Text>
          <Text style={styles.mensaje}>{MENSAJE}</Text>

          <View style={styles.escuchar}>
            <SpeakButton texto={`${TITULO}. ${MENSAJE}`} variante="escuchar" />
          </View>

          <TouchableOpacity style={styles.primario} onPress={irAlInicio} accessibilityRole="button" accessibilityLabel="Ir al inicio" activeOpacity={0.85}>
            <Ionicons name="home" size={24} color="#FFFFFF" />
            <Text style={styles.primarioTexto}>Ir al inicio</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secundario} onPress={volver} accessibilityRole="button" accessibilityLabel="Volver atrás" activeOpacity={0.85}>
            <Ionicons name="arrow-back" size={24} color={Colors.brand.primary} />
            <Text style={styles.secundarioTexto}>Volver atrás</Text>
          </TouchableOpacity>

          <Text style={styles.codigo}>Error 404 · pantalla no encontrada</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2EEF8' },
  contenido: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
  tarjeta: {
    alignItems: 'center', backgroundColor: Colors.ui.surface, borderRadius: 28, borderWidth: 1, borderColor: '#E2D9EF',
    paddingVertical: Spacing.xxxl, paddingHorizontal: Spacing.xl,
  },
  numeros: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: Spacing.sm },
  cuatro: { fontSize: 104, lineHeight: 120, fontWeight: '900', color: Colors.brand.primary, textShadowColor: Colors.brand.primarySoft, textShadowOffset: { width: 0, height: 5 }, textShadowRadius: 0 },
  titulo: { fontSize: 26, lineHeight: 33, fontWeight: Typography.weight.heavy, color: '#2C1D44', textAlign: 'center', marginTop: Spacing.sm },
  mensaje: { fontSize: Typography.size.md, lineHeight: 27, color: '#5B5170', textAlign: 'center', marginTop: Spacing.md },
  escuchar: { marginTop: Spacing.lg, marginBottom: Spacing.lg },
  primario: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, alignSelf: 'stretch',
    minHeight: Spacing.touch.comfortable, borderRadius: 16, backgroundColor: Colors.brand.primary, paddingHorizontal: Spacing.xl,
  },
  primarioTexto: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: '#FFFFFF' },
  secundario: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, alignSelf: 'stretch', marginTop: Spacing.md,
    minHeight: Spacing.touch.comfortable, borderRadius: 16, borderWidth: 2, borderColor: Colors.brand.primary, paddingHorizontal: Spacing.xl,
  },
  secundarioTexto: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.brand.primary },
  codigo: { marginTop: Spacing.xl, fontSize: 14, color: '#5B5170' },
});
