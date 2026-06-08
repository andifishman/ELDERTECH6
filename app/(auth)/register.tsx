import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthInput } from '@/components/auth/AuthInput';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { LoadingButton } from '@/components/auth/LoadingButton';
import { AvatarPicker } from '@/components/auth/AvatarPicker';
import { InterestSelector } from '@/components/auth/InterestSelector';
import { CiudadFamiliarSelector } from '@/components/auth/CiudadFamiliarSelector';
import { NivelDificultadSelector } from '@/components/auth/NivelDificultadSelector';
import {
  registerUser,
  getIntereses,
  getCiudadesFamiliares,
  checkUsernameAvailable,
  Validators,
} from '@/services/authService';
import type { RegisterFormData, RegisterStep, Interes, CiudadFamiliar, ValidationErrors } from '@/types/auth.types';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

const INITIAL_FORM: RegisterFormData = {
  nombre: '',
  apellido: '',
  fecha_nacimiento: '',
  foto_uri: null,
  username: '',
  email: '',
  password: '',
  confirmar_password: '',
  piso: '',
  habitacion: '',
  nivel_dificultad: 'independiente',
  intereses: [],
  ciudades_familiares: [],
};

const STEP_TITLES: Record<RegisterStep, string> = {
  1: 'Tus datos personales',
  2: 'Tu cuenta',
  3: 'Tu lugar y gustos',
};

export default function RegisterScreen() {
  const [step, setStep] = useState<RegisterStep>(1);
  const [form, setForm] = useState<RegisterFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [intereses, setIntereses] = useState<Interes[]>([]);
  const [ciudades, setCiudades] = useState<CiudadFamiliar[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    Promise.all([getIntereses(), getCiudadesFamiliares()])
      .then(([ints, ciud]) => {
        setIntereses(ints);
        setCiudades(ciud);
      })
      .finally(() => setLoadingLists(false));
  }, []);

  function update<K extends keyof RegisterFormData>(key: K, value: RegisterFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleDateChange(text: string) {
    // Extraer solo dígitos
    const digits = text.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    update('fecha_nacimiento', formatted);
  }

  function scrollTop() {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  // ─── Step 1 validation ──────────────────────────────────────────────────────
  function validateStep1(): boolean {
    const e: ValidationErrors = {};
    const nombreErr = Validators.nombre(form.nombre);
    const apellidoErr = Validators.apellido(form.apellido);
    const fechaErr = Validators.fechaNacimiento(form.fecha_nacimiento);
    if (nombreErr) e.nombre = nombreErr;
    if (apellidoErr) e.apellido = apellidoErr;
    if (fechaErr) e.fecha_nacimiento = fechaErr;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ─── Step 2 validation ──────────────────────────────────────────────────────
  async function validateStep2(): Promise<boolean> {
    const e: ValidationErrors = {};
    const usernameErr = Validators.username(form.username);
    const emailErr = Validators.email(form.email);
    const passwordErr = Validators.password(form.password);
    const confirmErr = Validators.confirmarPassword(form.confirmar_password, form.password);
    if (usernameErr) e.username = usernameErr;
    if (emailErr) e.email = emailErr;
    if (passwordErr) e.password = passwordErr;
    if (confirmErr) e.confirmar_password = confirmErr;

    if (!usernameErr && form.username.trim().length >= 3) {
      const available = await checkUsernameAvailable(form.username);
      if (!available) e.username = 'Ese nombre de usuario ya está en uso.';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────
  async function handleNext() {
    setGeneralError(null);
    scrollTop();

    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      setLoading(true);
      const valid = await validateStep2();
      setLoading(false);
      if (valid) setStep(3);
    }
  }

  function handleBack() {
    setGeneralError(null);
    scrollTop();
    if (step > 1) setStep((s) => (s - 1) as RegisterStep);
  }

  // ─── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setGeneralError(null);
    setLoading(true);
    try {
      await registerUser(form);
      setSuccess(true);
    } catch (e: unknown) {
      setGeneralError(e instanceof Error ? e.message : 'Error al registrarse.');
      scrollTop();
    } finally {
      setLoading(false);
    }
  }

  // ─── Success screen ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color={Colors.brand.greenDark} />
          </View>
          <Text style={styles.successTitle}>¡Cuenta creada!</Text>
          <Text style={styles.successMessage}>
            Bienvenido/a a ElderTech.{'\n'}Ya podés iniciar sesión.
          </Text>
          <LoadingButton
            title="Iniciar sesión"
            onPress={() => router.replace('/(auth)/login')}
            style={styles.successButton}
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
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={step === 1 ? () => router.back() : handleBack}
            style={styles.backButton}
            accessibilityLabel="Volver"
          >
            <Ionicons name="arrow-back" size={26} color={Colors.text.onDark} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Crear una cuenta nueva</Text>
          <View style={{ width: 48 }} />
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          {([1, 2, 3] as RegisterStep[]).map((s) => (
            <View
              key={s}
              style={[styles.progressDot, step >= s && styles.progressDotActive]}
            />
          ))}
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.stepTitle}>{STEP_TITLES[step]}</Text>
          <Text style={styles.stepSubtitle}>Paso {step} de 3</Text>

          {generalError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{generalError}</Text>
            </View>
          )}

          {/* ─── Step 1 ──────────────────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <AvatarPicker
                uri={form.foto_uri}
                onChange={(uri) => update('foto_uri', uri)}
              />
              <AuthInput
                label="Nombre"
                value={form.nombre}
                onChangeText={(v) => update('nombre', v)}
                placeholder="Ej: María"
                error={errors.nombre}
                required
                returnKeyType="next"
              />
              <AuthInput
                label="Apellido"
                value={form.apellido}
                onChangeText={(v) => update('apellido', v)}
                placeholder="Ej: García"
                error={errors.apellido}
                required
                returnKeyType="next"
              />
              <AuthInput
                label="Fecha de nacimiento"
                value={form.fecha_nacimiento}
                onChangeText={handleDateChange}
                placeholder="DD/MM/AAAA"
                error={errors.fecha_nacimiento}
                required
                keyboardType="numeric"
                returnKeyType="done"
                maxLength={10}
              />
            </>
          )}

          {/* ─── Step 2 ──────────────────────────────────────────────────────── */}
          {step === 2 && (
            <>
              <AuthInput
                label="Nombre de usuario"
                value={form.username}
                onChangeText={(v) => update('username', v)}
                placeholder="Ej: María García"
                error={errors.username}
                required
                autoCapitalize="none"
                autoComplete="username"
                returnKeyType="next"
              />
              <AuthInput
                label="Correo electrónico"
                value={form.email}
                onChangeText={(v) => update('email', v)}
                placeholder="Ej: maria@email.com"
                error={errors.email}
                required
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
              />
              <PasswordInput
                label="Contraseña"
                value={form.password}
                onChangeText={(v) => update('password', v)}
                error={errors.password}
                required
              />
              <PasswordInput
                label="Confirmar contraseña"
                value={form.confirmar_password}
                onChangeText={(v) => update('confirmar_password', v)}
                error={errors.confirmar_password}
                required
              />
              <View style={styles.passwordHints}>
                <Text style={styles.hintText}>La contraseña debe tener:</Text>
                {[
                  'Mínimo 8 caracteres',
                  'Al menos 1 mayúscula',
                ].map((hint) => (
                  <Text key={hint} style={styles.hintItem}>• {hint}</Text>
                ))}
              </View>
            </>
          )}

          {/* ─── Step 3 ──────────────────────────────────────────────────────── */}
          {step === 3 && (
            <>
              <View style={styles.sectionGroup}>
                <AuthInput
                  label="Piso / Habitación"
                  value={form.piso}
                  onChangeText={(v) => update('piso', v)}
                  placeholder="Ej: Piso 2"
                  returnKeyType="next"
                />
                <AuthInput
                  label="Número de habitación"
                  value={form.habitacion}
                  onChangeText={(v) => update('habitacion', v)}
                  placeholder="Ej: 204"
                  returnKeyType="done"
                />
              </View>

              <View style={styles.sectionGroup}>
                <Text style={styles.sectionLabel}>Estado de dificultad</Text>
                <NivelDificultadSelector
                  value={form.nivel_dificultad}
                  onChange={(v) => update('nivel_dificultad', v)}
                />
              </View>

              {loadingLists ? (
                <ActivityIndicator color={Colors.brand.greenDark} size="large" style={styles.loader} />
              ) : (
                <>
                  <View style={styles.sectionGroup}>
                    <Text style={styles.sectionLabel}>Intereses</Text>
                    <Text style={styles.sectionHint}>Seleccioná los que más te gustan</Text>
                    <InterestSelector
                      intereses={intereses}
                      selected={form.intereses}
                      onChange={(v) => update('intereses', v)}
                    />
                  </View>

                  <View style={styles.sectionGroup}>
                    <Text style={styles.sectionLabel}>Ciudades de familiares</Text>
                    <Text style={styles.sectionHint}>¿Dónde viven tus seres queridos?</Text>
                    <CiudadFamiliarSelector
                      ciudades={ciudades}
                      selected={form.ciudades_familiares}
                      onChange={(v) => update('ciudades_familiares', v)}
                    />
                  </View>
                </>
              )}
            </>
          )}

          {/* ─── Buttons ─────────────────────────────────────────────────────── */}
          <View style={styles.buttons}>
            {step < 3 ? (
              <LoadingButton
                title="Continuar →"
                onPress={handleNext}
                loading={loading}
              />
            ) : (
              <LoadingButton
                title="Registrarme ✓"
                onPress={handleSubmit}
                loading={loading}
              />
            )}
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            style={styles.loginLink}
          >
            <Text style={styles.loginLinkText}>
              ¿Ya tenés cuenta?{' '}
              <Text style={styles.loginLinkBold}>Iniciá sesión aquí</Text>
            </Text>
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
  topBar: {
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
  topTitle: {
    flex: 1,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.brand.greenDark,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  progressDotActive: {
    backgroundColor: Colors.text.onDark,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.screen.horizontal + 4,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.section,
  },
  stepTitle: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
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
  passwordHints: {
    backgroundColor: '#E8F5E9',
    borderRadius: Spacing.radius.md,
    padding: Spacing.md,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.lg,
  },
  hintText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.brand.greenDark,
    marginBottom: Spacing.xs,
  },
  hintItem: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  sectionGroup: {
    marginBottom: Spacing.xxl,
  },
  sectionLabel: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  sectionHint: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },
  loader: {
    marginVertical: Spacing.xxxl,
  },
  buttons: {
    marginTop: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    minHeight: Spacing.touch.min,
    justifyContent: 'center',
  },
  loginLinkText: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  loginLinkBold: {
    color: Colors.brand.greenDark,
    fontWeight: Typography.weight.semibold,
    textDecorationLine: 'underline',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
  },
  successIcon: {
    marginBottom: Spacing.xxl,
  },
  successTitle: {
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  successMessage: {
    fontSize: Typography.size.lg,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: Spacing.section,
  },
  successButton: {
    width: '100%',
  },
  webPhotoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#E8F5E9',
    borderRadius: Spacing.radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: -Spacing.md,
    marginBottom: Spacing.lg,
  },
  webPhotoNoteText: {
    fontSize: Typography.size.sm,
    color: Colors.brand.greenDark,
    flex: 1,
  },
});
