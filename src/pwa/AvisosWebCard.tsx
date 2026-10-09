// Tarjeta "Avisos en este dispositivo" (pantalla Más) — solo web. En nativo no renderiza nada:
// ahí el permiso de notificaciones se pide automáticamente al iniciar sesión.
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { activarAvisos, estadoAvisos, type EstadoAvisos } from './avisosWeb';

const TEXTO_ESTADO: Record<EstadoAvisos, string> = {
  activo: '✅ Los avisos están activados en este dispositivo.',
  pendiente: 'Activá los avisos para enterarte de mensajes, recordatorios y actividades aunque no tengas la aplicación abierta.',
  'requiere-instalar':
    'Para recibir avisos en el iPhone, primero agregá ElderTech a tu pantalla de inicio (botón Compartir › Agregar a inicio) y abrila desde ahí.',
  denegado: 'Los avisos están bloqueados. Activalos en Ajustes del teléfono › Notificaciones › ElderTech.',
  'no-soportado': 'Este navegador no puede mostrar avisos. Probá con Safari en el iPhone o con Chrome en Android o computadora.',
};

export function AvisosWebCard(): React.ReactElement | null {
  const [estado, setEstado] = useState<EstadoAvisos>('no-soportado');
  const [resultado, setResultado] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') setEstado(estadoAvisos());
  }, []);

  const activar = useCallback(async () => {
    setTrabajando(true);
    const r = await activarAvisos();
    setResultado(r.ok ? null : r.mensaje);
    setEstado(estadoAvisos());
    setTrabajando(false);
  }, []);

  if (Platform.OS !== 'web') return null;

  return (
    <View style={estilos.tarjeta}>
      <Text style={estilos.titulo}>🔔 Avisos en este dispositivo</Text>
      <Text style={estilos.texto}>{resultado ?? TEXTO_ESTADO[estado]}</Text>
      {estado === 'pendiente' && (
        <TouchableOpacity style={estilos.boton} onPress={activar} disabled={trabajando} accessibilityRole="button">
          <Text style={estilos.botonTexto}>{trabajando ? 'Activando…' : 'Activar avisos'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.xl,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  titulo: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  texto: { fontSize: Typography.size.md, color: Colors.text.primary, lineHeight: 26 },
  boton: {
    minHeight: Spacing.touch.comfortable,
    borderRadius: Spacing.radius.lg,
    backgroundColor: Colors.brand.greenDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  botonTexto: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: '#FFFFFF' },
});
