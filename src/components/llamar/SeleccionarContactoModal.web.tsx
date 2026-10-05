// Versión WEB del modal "Agregar contacto".
//
// En web no existe acceso a la libreta de contactos del teléfono:
//  - expo-contacts no tiene implementación web.
//  - La Contact Picker API (navigator.contacts.select) solo existe en Chrome para
//    Android — NO en Safari/iOS ni en escritorio.
// Por eso acá el flujo principal es cargar nombre + teléfono a mano (los mismos
// datos que el flujo nativo termina guardando), y si el navegador soporta la
// Contact Picker API se ofrece además "Elegir de mis contactos".
// Metro elige este archivo en web y SeleccionarContactoModal.tsx en Android/iOS.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { normalizarTelefono } from '@/services/contactosService';

interface SeleccionarContactoModalProps {
  visible: boolean;
  onClose: () => void;
  onSeleccionar: (contacto: {
    nombre: string;
    apellido?: string;
    telefono: string;
    foto_url?: string;
    contacto_device_id?: string;
  }) => void;
}

interface ContactoPicker { name?: string[]; tel?: string[] }
interface ContactsManagerWeb {
  select(props: Array<'name' | 'tel'>, opts?: { multiple?: boolean }): Promise<ContactoPicker[]>;
}

function contactPicker(): ContactsManagerWeb | null {
  const nav = navigator as Navigator & { contacts?: ContactsManagerWeb };
  return nav.contacts && typeof nav.contacts.select === 'function' ? nav.contacts : null;
}

function separarNombre(completo: string): { nombre: string; apellido?: string } {
  const partes = completo.trim().split(/\s+/);
  return { nombre: partes[0] ?? '', apellido: partes.length > 1 ? partes.slice(1).join(' ') : undefined };
}

export function SeleccionarContactoModal({ visible, onClose, onSeleccionar }: SeleccionarContactoModalProps) {
  const insets = useSafeAreaInsets();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [puedeElegirDeContactos, setPuedeElegirDeContactos] = useState(false);

  useEffect(() => {
    setPuedeElegirDeContactos(contactPicker() !== null);
  }, []);

  useEffect(() => {
    if (!visible) {
      setNombre('');
      setApellido('');
      setTelefono('');
      setError(null);
    }
  }, [visible]);

  const elegirDeContactos = useCallback(async () => {
    const picker = contactPicker();
    if (!picker) return;
    try {
      const [elegido] = await picker.select(['name', 'tel'], { multiple: false });
      if (!elegido) return; // canceló
      const { nombre: n, apellido: a } = separarNombre(elegido.name?.[0] ?? '');
      setNombre(n);
      setApellido(a ?? '');
      setTelefono(elegido.tel?.[0] ?? '');
      setError(null);
    } catch {
      setError('No se pudo abrir tus contactos. Podés escribir los datos a mano.');
    }
  }, []);

  function guardar() {
    if (!nombre.trim()) {
      setError('Escribí el nombre del contacto.');
      return;
    }
    const digitos = telefono.replace(/\D/g, '');
    if (digitos.length < 8) {
      setError('Escribí el número de teléfono completo, con el código de área.');
      return;
    }
    onSeleccionar({
      nombre: nombre.trim(),
      apellido: apellido.trim() || undefined,
      telefono: normalizarTelefono(telefono.trim()),
    });
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.container, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.md }]}>
          <View style={styles.header}>
            <Text style={styles.titulo}>Agregar contacto</Text>
            <TouchableOpacity
              style={styles.cerrarBtn}
              onPress={onClose}
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={28} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            {puedeElegirDeContactos && (
              <TouchableOpacity style={styles.btnSecundario} onPress={elegirDeContactos} accessibilityRole="button">
                <Ionicons name="people" size={24} color={Colors.brand.greenDark} />
                <Text style={styles.btnSecundarioTexto}>Elegir de mis contactos</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej: María"
              placeholderTextColor={Colors.text.hint}
              autoCapitalize="words"
              autoComplete="off"
              accessibilityLabel="Nombre del contacto"
            />

            <Text style={styles.label}>Apellido (opcional)</Text>
            <TextInput
              style={styles.input}
              value={apellido}
              onChangeText={setApellido}
              placeholder="Ej: García"
              placeholderTextColor={Colors.text.hint}
              autoCapitalize="words"
              autoComplete="off"
              accessibilityLabel="Apellido del contacto"
            />

            <Text style={styles.label}>Teléfono</Text>
            <TextInput
              style={styles.input}
              value={telefono}
              onChangeText={setTelefono}
              placeholder="Ej: 11 5555 1234"
              placeholderTextColor={Colors.text.hint}
              keyboardType="phone-pad"
              autoComplete="off"
              accessibilityLabel="Teléfono del contacto"
            />

            {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}

            <TouchableOpacity style={styles.btnGuardar} onPress={guardar} accessibilityRole="button">
              <Text style={styles.btnGuardarTexto}>Guardar contacto</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.ui.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.screen.horizontal, paddingBottom: Spacing.lg },
  titulo: { flex: 1, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  cerrarBtn: {
    width: Spacing.touch.min,
    height: Spacing.touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.radius.full,
    backgroundColor: Colors.ui.border,
  },
  form: { paddingHorizontal: Spacing.screen.horizontal, paddingBottom: Spacing.xxxl, gap: Spacing.sm },
  label: { fontSize: Typography.size.md, fontWeight: Typography.weight.semibold, color: Colors.text.primary, marginTop: Spacing.md },
  input: {
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.lg,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    paddingHorizontal: Spacing.md,
    minHeight: Spacing.touch.comfortable,
    fontSize: Typography.size.md,
    color: Colors.text.primary,
  },
  error: { fontSize: Typography.size.md, color: '#B3261E', marginTop: Spacing.md, lineHeight: 24 },
  btnGuardar: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.brand.greenDark,
    borderRadius: Spacing.radius.lg,
    minHeight: Spacing.touch.comfortable,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGuardarTexto: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: '#FFFFFF' },
  btnSecundario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Spacing.radius.lg,
    borderWidth: 2,
    borderColor: Colors.brand.greenDark,
    minHeight: Spacing.touch.comfortable,
  },
  btnSecundarioTexto: { fontSize: Typography.size.md, fontWeight: Typography.weight.semibold, color: Colors.brand.greenDark },
});
