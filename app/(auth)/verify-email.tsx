import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useAuth } from '@/context/AuthContext';

type Status = 'loading' | 'success' | 'error';

export default function VerifyEmailScreen() {
  const { session } = useAuth();
  const [status, setStatus] = useState<Status>('loading');

  // If session exists (set by the deep link handler in _layout.tsx), show success
  useEffect(() => {
    if (session) {
      setStatus('success');
    } else {
      // Give the deep link handler a moment to set the session
      const timer = setTimeout(() => {
        setStatus(session ? 'success' : 'error');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [session]);

  // Navigate home once verified
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => router.replace('/'), 2500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={Colors.brand.greenDark} />
            <Text style={styles.title}>Verificando...</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <Ionicons name="shield-checkmark" size={84} color={Colors.brand.greenDark} />
            <Text style={styles.title}>Autenticación verificada</Text>
            <Text style={styles.subtitle}>Tu cuenta fue confirmada exitosamente.</Text>
            <Text style={styles.hint}>Entrando a la aplicación...</Text>
          </>
        )}

        {status === 'error' && (
          <>
            <Ionicons name="close-circle-outline" size={84} color={Colors.brand.red} />
            <Text style={[styles.title, styles.titleError]}>Error de verificación</Text>
            <Text style={styles.subtitle}>
              El link puede haber expirado.{'\n'}Pedí un nuevo link o contactá al personal.
            </Text>
            <TouchableOpacity
              style={styles.volverBtn}
              onPress={() => router.replace('/login')}
              accessibilityRole="button"
              accessibilityLabel="Volver al inicio de sesión"
            >
              <Text style={styles.volverBtnTexto}>Ir al inicio de sesión</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.section,
    gap: Spacing.lg,
  },
  title: {
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  titleError: {
    color: Colors.brand.red,
  },
  subtitle: {
    fontSize: Typography.size.lg,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 28,
  },
  hint: {
    fontSize: Typography.size.md,
    color: Colors.text.hint,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  volverBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.brand.greenDark,
    borderRadius: 14,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxxl,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volverBtnTexto: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },
});
