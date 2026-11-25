//pantalla 404 de la app (celular y web): se muestra cuando se abre una pantalla que no existe, por ejemplo un enlace viejo o una notificación antigua.
//Criterios para adultos mayores: logo de ElderTech, un saludo según la hora, qué hacer en dos pasos grandes ("cerrá la aplicación / volvé a abrirla"),
//letra grande, botones de 60 px y "Escuchar" (no habla sola: un audio inesperado asusta).
import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SpeakButton } from '@/components/common/SpeakButton';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { Typography } from '@/constants/Typography';

function saludoSegunHora(hora: number): string {
  if (hora < 6) return 'Buenas noches';
  if (hora < 13) return 'Buenos días';
  if (hora < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function fechaDeHoy(ahora: Date): string {
  const f = ahora.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  return f.charAt(0).toUpperCase() + f.slice(1);
}

export default function NoEncontrada() {
  const router = useRouter();
  const { saludo, fecha } = useMemo(() => {
    const ahora = new Date();
    return { saludo: saludoSegunHora(ahora.getHours()), fecha: fechaDeHoy(ahora) };
  }, []);

  const irAlInicio = () => router.replace('/');
  const volver = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const lectura = `${saludo}. No pudimos abrir esta pantalla. Primero, cerrá la aplicación. Después, volvé a abrirla. Si sigue pasando, avisale a quien te acompaña en la residencia.`;

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.contenido} bounces={false}>
        <View style={styles.tarjeta}>
          <View style={styles.logoContainer} accessible accessibilityLabel="ElderTech">
            <Image source={require('../assets/images/logo-puente.png')} style={styles.logo} resizeMode="contain" />
          </View>

          <Text style={styles.fecha}>{fecha}</Text>
          <Text style={styles.saludo} accessibilityRole="header">{saludo}</Text>
          <Text style={styles.subtitulo}>No pudimos abrir esta pantalla. Probá así:</Text>

          <View style={styles.pasos}>
            <View style={styles.paso}>
              <View style={styles.numero}><Text style={styles.numeroTexto}>1</Text></View>
              <Text style={styles.pasoTexto}>Cerrá la aplicación.</Text>
            </View>
            <View style={styles.paso}>
              <View style={styles.numero}><Text style={styles.numeroTexto}>2</Text></View>
              <Text style={styles.pasoTexto}>Volvé a abrirla.</Text>
            </View>
          </View>

          <Text style={styles.ayuda}>Si sigue pasando, avisale a quien te acompaña en la residencia.</Text>

          <View style={styles.escuchar}>
            <SpeakButton texto={lectura} variante="escuchar" />
          </View>

          <TouchableOpacity style={styles.primario} onPress={irAlInicio} accessibilityRole="button" accessibilityLabel="Ir al inicio" activeOpacity={0.85}>
            <Ionicons name="home" size={26} color="#FFFFFF" />
            <Text style={styles.primarioTexto}>Ir al inicio</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secundario} onPress={volver} accessibilityRole="button" accessibilityLabel="Volver atrás" activeOpacity={0.85}>
            <Ionicons name="arrow-back" size={26} color={Colors.brand.primary} />
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
  logoContainer: { backgroundColor: Colors.brand.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Spacing.radius.xl },
  logo: { width: 150, height: 94 },
  fecha: { marginTop: Spacing.xl, fontSize: Typography.size.md, color: '#5B5170' },
  saludo: { fontSize: 36, lineHeight: 42, fontWeight: Typography.weight.heavy, color: '#2C1D44', textAlign: 'center', marginTop: Spacing.xs },
  subtitulo: { fontSize: Typography.size.lg + 1, lineHeight: 30, color: '#5B5170', textAlign: 'center', marginTop: Spacing.sm },
  pasos: { alignSelf: 'stretch', marginTop: Spacing.xxl, gap: Spacing.md },
  paso: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, backgroundColor: '#F6F2FB', borderRadius: 18, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.lg },
  numero: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  numeroTexto: { fontSize: 22, fontWeight: Typography.weight.heavy, color: '#FFFFFF' },
  pasoTexto: { flex: 1, fontSize: 22, lineHeight: 28, fontWeight: Typography.weight.bold, color: '#2C1D44' },
  ayuda: { marginTop: Spacing.xl, fontSize: Typography.size.md, lineHeight: 27, color: '#5B5170', textAlign: 'center' },
  escuchar: { marginTop: Spacing.lg, marginBottom: Spacing.lg },
  primario: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, alignSelf: 'stretch',
    minHeight: 60, borderRadius: 18, backgroundColor: Colors.brand.primary, paddingHorizontal: Spacing.xl,
  },
  primarioTexto: { fontSize: 22, fontWeight: Typography.weight.heavy, color: '#FFFFFF' },
  secundario: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, alignSelf: 'stretch', marginTop: Spacing.md,
    minHeight: 60, borderRadius: 18, borderWidth: 3, borderColor: Colors.brand.primary, paddingHorizontal: Spacing.xl,
  },
  secundarioTexto: { fontSize: 22, fontWeight: Typography.weight.heavy, color: Colors.brand.primary },
  codigo: { marginTop: Spacing.xl, fontSize: 14, color: '#5B5170' },
});
