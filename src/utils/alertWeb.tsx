// Implementación de `Alert.alert` para web.
//
// En react-native-web `Alert.alert` es un método VACÍO: no muestra nada. La app
// usa Alert.alert en ~40 lugares (errores, permisos de micrófono, confirmaciones de
// borrado…), así que en web esos avisos —y las decisiones que esperan— simplemente
// no aparecían. Se evitó `window.alert/confirm` (el navegador de iOS PWA los
// bloquea o los muestra sin estilo, con letra chica) y se renderiza un modal con
// botones grandes, igual que el resto de la app.
//
// Uso: `instalarAlertWeb()` una vez al arrancar (app/_layout.tsx) y montar
// <AlertaWebHost /> dentro del árbol. En Android/iOS ambos son no-ops.
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Platform, StyleSheet, Text, TouchableOpacity, View, type AlertButton, type AlertOptions } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

interface AlertaPendiente {
  titulo: string;
  mensaje?: string;
  botones: AlertButton[];
  cancelable: boolean;
  onDismiss?: () => void;
}

type Oyente = (alerta: AlertaPendiente | null) => void;

let oyente: Oyente | null = null;
const cola: AlertaPendiente[] = [];
let actual: AlertaPendiente | null = null;

function publicar(): void {
  oyente?.(actual);
}

function mostrarSiguiente(): void {
  actual = cola.shift() ?? null;
  publicar();
}

function encolar(alerta: AlertaPendiente): void {
  cola.push(alerta);
  if (!actual) mostrarSiguiente();
}

export function instalarAlertWeb(): void {
  if (Platform.OS !== 'web') return;
  Alert.alert = (titulo: string, mensaje?: string, botones?: AlertButton[], opciones?: AlertOptions) => {
    encolar({
      titulo,
      mensaje,
      botones: botones && botones.length > 0 ? botones : [{ text: 'Aceptar' }],
      cancelable: opciones?.cancelable ?? false,
      onDismiss: opciones?.onDismiss,
    });
  };
}

export function AlertaWebHost(): React.ReactElement | null {
  const [alerta, setAlerta] = useState<AlertaPendiente | null>(actual);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    oyente = setAlerta;
    setAlerta(actual);
    return () => {
      oyente = null;
    };
  }, []);

  if (Platform.OS !== 'web' || !alerta) return null;

  function cerrar(boton?: AlertButton): void {
    mostrarSiguiente();
    boton?.onPress?.();
  }

  const conVariosBotones = alerta.botones.length > 1;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => { alerta.onDismiss?.(); cerrar(); }}>
      <View style={estilos.fondo} accessibilityViewIsModal>
        <View style={estilos.tarjeta} accessibilityRole="alert">
          <Text style={estilos.titulo}>{alerta.titulo}</Text>
          {!!alerta.mensaje && <Text style={estilos.mensaje}>{alerta.mensaje}</Text>}
          <View style={estilos.botones}>
            {alerta.botones.map((boton, i) => {
              const esCancelar = boton.style === 'cancel';
              const esDestructivo = boton.style === 'destructive';
              return (
                <TouchableOpacity
                  key={`${boton.text ?? 'boton'}-${i}`}
                  style={[
                    estilos.boton,
                    esCancelar ? estilos.botonSecundario : esDestructivo ? estilos.botonDestructivo : estilos.botonPrimario,
                    !conVariosBotones && estilos.botonUnico,
                  ]}
                  onPress={() => cerrar(boton)}
                  accessibilityRole="button"
                >
                  <Text style={[estilos.botonTexto, esCancelar && estilos.botonTextoSecundario]}>{boton.text ?? 'Aceptar'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.screen.horizontal,
  },
  tarjeta: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: Spacing.radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  titulo: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  mensaje: { fontSize: Typography.size.md, color: Colors.text.primary, lineHeight: 26 },
  botones: { gap: Spacing.sm, marginTop: Spacing.md },
  boton: {
    minHeight: Spacing.touch.comfortable,
    borderRadius: Spacing.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  botonUnico: { alignSelf: 'stretch' },
  botonPrimario: { backgroundColor: Colors.brand.greenDark },
  botonSecundario: { backgroundColor: Colors.ui.border },
  botonDestructivo: { backgroundColor: '#B3261E' },
  botonTexto: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: '#FFFFFF' },
  botonTextoSecundario: { color: Colors.text.primary },
});
