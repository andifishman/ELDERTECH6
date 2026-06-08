import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthInput } from '@/components/auth/AuthInput';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { LoadingButton } from '@/components/auth/LoadingButton';
import { login } from '@/services/authService';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);

    if (!username.trim()) {
      setError('Ingresá tu usuario o email.');
      return;
    }
    if (!password) {
      setError('Ingresá tu contraseña.');
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
      // Navegar de inmediato — el perfil carga en background en AuthContext
      router.replace('/');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al iniciar sesión.');
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>ElderTech</Text>
            </View>
            <Text style={styles.title}>Iniciá sesión</Text>
            <Text style={styles.subtitle}>Ingresá tu usuario o email y tu contraseña</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            <AuthInput
              label="Usuario o email"
              value={username}
              onChangeText={setUsername}
              placeholder="María García o maria@email.com"
              autoCapitalize="none"
              autoComplete="username"
              returnKeyType="next"
              required
            />

            <PasswordInput
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              required
            />

            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.forgotLink}
              accessibilityRole="link"
            >
              <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            <LoadingButton
              title="Ingresar →"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />

            <View style={styles.divider}>
              <Text style={styles.dividerText}>¿Sos nuevo?</Text>
            </View>

            <LoadingButton
              title="Crear una cuenta nueva"
              onPress={() => router.push('/(auth)/register')}
              variant="outline"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.screen.horizontal + 4,
    paddingBottom: Spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.section,
    paddingBottom: Spacing.xxxl,
  },
  logoContainer: {
    backgroundColor: Colors.brand.greenDark,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.radius.md,
    marginBottom: Spacing.xl,
  },
  logoText: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
    letterSpacing: 1,
  },
  title: {
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderRadius: Spacing.radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.brand.red,
  },
  errorBannerText: {
    fontSize: Typography.size.md,
    color: Colors.brand.red,
    fontWeight: Typography.weight.medium,
  },
  forgotLink: {
    alignSelf: 'flex-start',
    marginTop: -Spacing.sm,
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.sm,
    minHeight: Spacing.touch.min,
    justifyContent: 'center',
  },
  forgotText: {
    fontSize: Typography.size.md,
    color: Colors.brand.greenDark,
    fontWeight: Typography.weight.medium,
    textDecorationLine: 'underline',
  },
  loginButton: {
    marginBottom: Spacing.xxl,
  },
  divider: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dividerText: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
  },
});
