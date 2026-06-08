import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthInput } from '@/components/auth/AuthInput';
import { LoadingButton } from '@/components/auth/LoadingButton';
import { requestPasswordReset } from '@/services/authService';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

export default function ForgotPasswordScreen() {
  const [value, setValue] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    setFieldError(null);
    setApiError(null);
    if (!value.trim()) {
      setFieldError('Ingresá tu nombre de usuario o email.');
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(value);
      setSent(true);
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : 'No se pudo enviar el email.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <Ionicons name="mail-outline" size={72} color={Colors.brand.greenDark} />
          <Text style={styles.successTitle}>Email enviado</Text>
          <Text style={styles.successMessage}>
            Revisá tu correo y seguí las instrucciones para recuperar tu contraseña.
            {'\n\n'}
            Si necesitás ayuda, pedísela a un familiar o al personal.
          </Text>
          <LoadingButton
            title="Volver al inicio"
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityLabel="Volver"
          >
            <Ionicons name="arrow-back" size={26} color={Colors.text.onDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recuperar contraseña</Text>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="lock-open-outline" size={60} color={Colors.brand.greenDark} />
          </View>

          <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>
          <Text style={styles.description}>
            Ingresá tu nombre de usuario o email y te enviaremos un link para crear una nueva contraseña.
          </Text>

          {apiError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{apiError}</Text>
            </View>
          )}

          <AuthInput
            label="Nombre de usuario o email"
            value={value}
            onChangeText={setValue}
            placeholder="María García o maria@email.com"
            error={fieldError}
            autoCapitalize="none"
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />

          <LoadingButton
            title="Enviar email"
            onPress={handleSend}
            loading={loading}
            style={styles.sendButton}
          />

          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.cancelLink}
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.brand.greenDark,
    paddingHorizontal: Spacing.screen.horizontal,
    paddingVertical: Spacing.md,
    minHeight: 56,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
    textAlign: 'center',
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
  sendButton: {
    marginTop: Spacing.sm,
  },
  cancelLink: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    minHeight: Spacing.touch.min,
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    textDecorationLine: 'underline',
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
