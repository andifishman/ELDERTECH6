// "Cerrar sesión" — solo web. La app nativa no lo tiene a propósito (el celular es de un solo residente),
// pero un navegador puede ser una compu o tablet compartida: sin esto, la sesión de una persona
// quedaría abierta para quien use el equipo después.
import React, { useCallback } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { logout } from '@/services/authService';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

async function darDeBajaAvisosDeEsteNavegador(): Promise<void> {
  try {
    const registro = await navigator.serviceWorker?.getRegistration();
    const suscripcion = await registro?.pushManager.getSubscription();
    // El servicio de push contesta 410 la próxima vez y el backend desactiva la suscripción solo.
    await suscripcion?.unsubscribe();
  } catch {
    // best-effort: si falla, el próximo login de otra persona reasigna la suscripción igual
  }
}

export function CerrarSesionWeb(): React.ReactElement | null {
  const cerrar = useCallback(() => {
    Alert.alert('Cerrar sesión', '¿Querés salir de ElderTech en este dispositivo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            // Con tope de tiempo: salir nunca debe quedar trabado por la limpieza de avisos.
            await Promise.race([darDeBajaAvisosDeEsteNavegador(), new Promise<void>((r) => setTimeout(r, 2000))]);
            await logout(); // NavigationGuard detecta que no hay sesión y lleva al login
          })();
        },
      },
    ]);
  }, []);

  if (Platform.OS !== 'web') return null;

  return (
    <TouchableOpacity style={estilos.boton} onPress={cerrar} accessibilityRole="button" accessibilityLabel="Cerrar sesión">
      <Ionicons name="log-out-outline" size={26} color={Colors.text.primary} />
      <Text style={estilos.texto}>Cerrar sesión</Text>
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    minHeight: Spacing.touch.comfortable,
    borderRadius: Spacing.radius.lg,
    borderWidth: 2,
    borderColor: Colors.ui.border,
    backgroundColor: Colors.ui.surface,
  },
  texto: { fontSize: Typography.size.lg, fontWeight: Typography.weight.semibold, color: Colors.text.primary },
});
