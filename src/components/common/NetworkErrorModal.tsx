// Modal de marca ElderTech para fallas de red — reemplaza el "Network request
// failed" crudo (que no dice nada útil a un adulto mayor) por un mensaje
// claro y una acción concreta: ir directo a los ajustes de WiFi.
//
// Se dispara desde cualquier parte de la app con mostrarErrorDeRed() (ver
// networkErrorModal.ts) — apiClient.ts lo llama automáticamente ante
// cualquier fetch fallido por falta de conexión, y la pantalla de login
// también (ahí el error viene directo de Supabase, no pasa por apiClient).
//
// No se vuelve a mostrar solo porque otro pedido de fondo también haya
// fallado mientras sigue visible o recién se cerró — para eso queda
// "silenciado" hasta que la conexión vuelva de verdad (useNetworkStatus),
// así no aparece en cadena por cada intento fallido de fondo.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { registrarModalErrorDeRed } from '@/utils/networkErrorModal';
import { abrirAjustesWifi } from '@/utils/wifiSettings';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

export function NetworkErrorModal() {
  const [visible, setVisible] = useState(false);
  const silenciadoRef = useRef(false);
  const { conectado } = useNetworkStatus();

  // Apenas vuelve la conexión, se "rearma" — la próxima falla real va a
  // poder mostrar el modal de nuevo.
  useEffect(() => {
    if (conectado) {
      silenciadoRef.current = false;
      setVisible(false);
    }
  }, [conectado]);

  useEffect(() => {
    registrarModalErrorDeRed(() => {
      if (!silenciadoRef.current) setVisible(true);
    });
    return () => registrarModalErrorDeRed(null);
  }, []);

  const cerrar = () => {
    silenciadoRef.current = true;
    setVisible(false);
  };

  const irAWifi = () => {
    silenciadoRef.current = true;
    setVisible(false);
    void abrirAjustesWifi();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cerrar}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={styles.iconoWrap}>
            <Ionicons name="wifi-outline" size={36} color={Colors.text.onDark} />
          </View>
          <Text style={styles.titulo}>Sin conexión a internet</Text>
          <Text style={styles.texto}>
            ElderTech no se pudo conectar. Probá cambiar de red de WiFi o revisar que esté encendido, y volvé a intentar.
          </Text>
          <TouchableOpacity style={styles.btnPrimario} onPress={irAWifi} accessibilityRole="button" accessibilityLabel="Abrir ajustes de WiFi">
            <Ionicons name="settings-outline" size={22} color={Colors.text.onDark} />
            <Text style={styles.btnPrimarioTexto}>Abrir ajustes de WiFi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecundario} onPress={cerrar} accessibilityRole="button" accessibilityLabel="Cerrar aviso">
            <Text style={styles.btnSecundarioTexto}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  box: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconoWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.brand.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  titulo: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary, textAlign: 'center' },
  texto: { fontSize: Typography.size.md, color: Colors.text.secondary, textAlign: 'center', lineHeight: 24 },
  btnPrimario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    minHeight: Spacing.touch.comfortable,
    width: '100%',
    backgroundColor: Colors.brand.orange,
    borderRadius: Spacing.radius.lg,
    marginTop: Spacing.sm,
  },
  btnPrimarioTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.onDark },
  btnSecundario: {
    minHeight: Spacing.touch.comfortable,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecundarioTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.semibold, color: Colors.text.secondary },
});
