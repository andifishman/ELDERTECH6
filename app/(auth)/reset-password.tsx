import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { LoadingButton } from '@/components/auth/LoadingButton';
import { updatePassword, Validators } from '@/services/authService';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const passwordErr = Validators.password(password);
    const confirmErr = Validators.confirmarPassword(confirm, password);

    if (passwordErr || confirmErr) {
      setErrors({
        password: passwordErr ?? undefined,
        confirm: confirmErr ?? undefined,
      });
      return;
    }

    setErrors({});
    setError(null);
    setLoading(true);

    try {
      await updatePassword(password);
      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={80} color={Colors.brand.greenDark} />
          <Text style={styles.successTitle}>Contraseña actualizada</Text>
          <Text style={styles.successMessage}>
            Tu contraseña fue cambiada exitosamente.{'\n'}Ya podés iniciar sesión.
          </Text>
          <LoadingButton
            title="Iniciar sesión"
            onPress={() => router.replace('/(auth)/login')}
            style={styles.button}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Nueva contraseña</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="key-outline" size={60} color={Colors.brand.greenDark} />
          </View>

          <Text style={styles.title}>Creá tu nueva contraseña</Text>
          <Text style={styles.description}>
            Ingresá una contraseña nueva y segura para tu cuenta.
          </Text>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          <PasswordInput
            label="Nueva contraseña"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            required
          />

          <PasswordInput
            label="Confirmar contraseña"
            value={confirm}
            onChangeText={setConfirm}
            error={errors.confirm}
            required
          />

          <View style={styles.hints}>
            {['Mínimo 8 caracteres', '1 mayúscula'].map((h) => (
              <Text key={h} style={styles.hintItem}>• {h}</Text>
            ))}
          </View>

          <LoadingButton
            title="Guardar contraseña"
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitButton}
          />
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
  header: {
    backgroundColor: Colors.brand.greenDark,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.screen.horizontal,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.screen.horizontal + 4,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.section,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: Spacing.xxxl,
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
  },
  hints: {
    backgroundColor: '#E8F5E9',
    borderRadius: Spacing.radius.md,
    padding: Spacing.md,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  hintItem: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  submitButton: {
    marginTop: Spacing.sm,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
  },
  successTitle: {
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  successMessage: {
    fontSize: Typography.size.lg,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: Spacing.section,
  },
  button: {
    width: '100%',
  },
});
