// Hablemos — pantalla a pantalla completa para escribir un mensaje de texto.
// Reemplaza el campo de texto chico que antes vivía abajo del chat: acá el
// residente ve un campo grande y un botón "Enviar" bien grande, sin tener
// que reconocer un ícono minúsculo.
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/common/AppHeader';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useEnviarMensajeTextoHablemos } from '@/hooks/useHablemos';

const MAX_CARACTERES = 2000;

export default function HablemosEscribirScreen() {
  const { conversacionId, nombreOtro } = useLocalSearchParams<{ conversacionId: string; nombreOtro?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [texto, setTexto] = useState('');
  const enviarTexto = useEnviarMensajeTextoHablemos(conversacionId);

  const enviar = useCallback(async () => {
    const contenido = texto.trim();
    if (!contenido) return;
    try {
      await enviarTexto.mutateAsync(contenido);
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo enviar el mensaje.';
      Alert.alert('Error', msg);
    }
  }, [texto, enviarTexto, router]);

  const puedeEnviar = texto.trim().length > 0 && !enviarTexto.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <AppHeader
        titulo="Escribir mensaje"
        subtitulo={nombreOtro ? `Para ${nombreOtro}` : undefined}
        mostrarVolver
        mostrarHablar={false}
        backgroundColor={Colors.hablemos.accent}
      />

      <View style={styles.cuerpo}>
        <TextInput
          style={styles.input}
          value={texto}
          onChangeText={setTexto}
          placeholder="Escribí acá tu mensaje..."
          placeholderTextColor={Colors.text.hint}
          multiline
          autoFocus
          maxLength={MAX_CARACTERES}
          textAlignVertical="top"
          accessibilityLabel="Campo de texto para escribir tu mensaje"
        />
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <TouchableOpacity
          style={[styles.enviarBtn, !puedeEnviar && styles.enviarBtnDeshabilitado]}
          onPress={enviar}
          disabled={!puedeEnviar}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensaje"
          activeOpacity={0.8}
        >
          {enviarTexto.isPending ? (
            <ActivityIndicator size="small" color={Colors.text.onDark} />
          ) : (
            <>
              <Ionicons name="send" size={26} color={Colors.text.onDark} />
              <Text style={styles.enviarBtnTexto}>Enviar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ui.background },
  cuerpo: { flex: 1, padding: Spacing.screen.horizontal },
  input: {
    flex: 1,
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.lg,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    padding: Spacing.lg,
    fontSize: 24,
    lineHeight: 32,
    color: Colors.text.primary,
  },
  footer: {
    paddingHorizontal: Spacing.screen.horizontal,
    paddingTop: Spacing.md,
    backgroundColor: Colors.ui.background,
  },
  enviarBtn: {
    minHeight: Spacing.touch.large,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Spacing.radius.xl,
    backgroundColor: Colors.hablemos.accent,
  },
  enviarBtnDeshabilitado: { backgroundColor: Colors.ui.disabled },
  enviarBtnTexto: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.text.onDark },
});
