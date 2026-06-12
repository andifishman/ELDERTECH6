// Modal para buscar y seleccionar un contacto del teléfono e importarlo a ElderTech
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { normalizarTelefono } from '@/services/contactosService';

// Contacto simplificado del dispositivo para mostrar en lista
interface ContactoDispositivo {
  id: string;
  nombre: string;
  telefono: string;        // número ya normalizado
  telefonoOriginal: string; // número como viene del sistema
  foto?: string;
}

interface SeleccionarContactoModalProps {
  visible: boolean;
  onClose: () => void;
  onSeleccionar: (contacto: {
    nombre: string;
    apellido?: string;
    telefono: string;
    foto_url?: string;
    contacto_device_id: string;
  }) => void;
}

export function SeleccionarContactoModal({
  visible,
  onClose,
  onSeleccionar,
}: SeleccionarContactoModalProps) {
  const insets = useSafeAreaInsets();
  const [cargando, setCargando] = useState(false);
  const [contactos, setContactos] = useState<ContactoDispositivo[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [permisoDenegado, setPermisoDenegado] = useState(false);
  const [cargado, setCargado] = useState(false);

  const cargarContactos = useCallback(async () => {
    setCargando(true);
    setPermisoDenegado(false);

    try {
      const { status } = await Contacts.requestPermissionsAsync();

      if (status !== 'granted') {
        setPermisoDenegado(true);
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Image,
        ],
        sort: Contacts.SortTypes.FirstName,
      });

      // Filtrar solo los que tienen nombre y al menos un teléfono
      const procesados: ContactoDispositivo[] = [];

      for (const c of data) {
        if (!c.name || !c.phoneNumbers?.length) continue;

        // Usar el primer número de teléfono disponible
        const tel = c.phoneNumbers[0];
        if (!tel?.number) continue;

        procesados.push({
          id: c.id ?? `${c.name}-${tel.number}`,
          nombre: c.name,
          telefono: normalizarTelefono(tel.number),
          telefonoOriginal: tel.number,
          foto: c.imageAvailable ? c.image?.uri : undefined,
        });
      }

      setContactos(procesados);
      setCargado(true);
    } catch (err) {
      Alert.alert(
        'Error',
        'No se pudieron cargar los contactos. Intentá de nuevo.',
        [{ text: 'Aceptar' }],
      );
    } finally {
      setCargando(false);
    }
  }, []);

  // Cargar contactos cuando el modal se abre
  useEffect(() => {
    if (visible && !cargado) {
      cargarContactos();
    }
    if (!visible) {
      setBusqueda('');
    }
  }, [visible, cargado, cargarContactos]);

  // Filtrado por búsqueda
  const contactosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return contactos;
    const q = busqueda.toLowerCase().trim();
    return contactos.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.telefonoOriginal.includes(q),
    );
  }, [contactos, busqueda]);

  function handleSeleccionar(c: ContactoDispositivo) {
    // Separar nombre y apellido si es posible
    const partes = c.nombre.trim().split(' ');
    const nombre = partes[0];
    const apellido = partes.length > 1 ? partes.slice(1).join(' ') : undefined;

    onSeleccionar({
      nombre,
      apellido,
      telefono: c.telefono,
      foto_url: c.foto,
      contacto_device_id: c.id,
    });
    onClose();
  }

  function renderContacto({ item }: { item: ContactoDispositivo }) {
    const iniciales = item.nombre.charAt(0).toUpperCase();

    return (
      <TouchableOpacity
        style={styles.itemContacto}
        onPress={() => handleSeleccionar(item)}
        activeOpacity={0.7}
        accessibilityLabel={`Seleccionar a ${item.nombre}`}
        accessibilityRole="button"
      >
        {item.foto ? (
          <Image source={{ uri: item.foto }} style={styles.itemFoto} />
        ) : (
          <View style={styles.itemFotoFallback}>
            <Text style={styles.itemInicial}>{iniciales}</Text>
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemNombre} numberOfLines={1}>{item.nombre}</Text>
          <Text style={styles.itemTel} numberOfLines={1}>{item.telefonoOriginal}</Text>
        </View>
        <Ionicons name="add-circle" size={32} color="#66BB6A" />
      </TouchableOpacity>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top + Spacing.md }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.titulo}>Agregar contacto</Text>
          <TouchableOpacity
            style={styles.cerrarBtn}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Cerrar"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={28} color={Colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Buscador */}
        {!permisoDenegado && !cargando && (
          <View style={styles.buscadorWrapper}>
            <Ionicons
              name="search"
              size={22}
              color={Colors.text.secondary}
              style={styles.buscadorIcon}
            />
            <TextInput
              style={styles.buscador}
              placeholder="Buscar por nombre..."
              placeholderTextColor={Colors.text.hint}
              value={busqueda}
              onChangeText={setBusqueda}
              autoCorrect={false}
              clearButtonMode="while-editing"
              returnKeyType="search"
              accessibilityLabel="Buscar contacto"
            />
          </View>
        )}

        {/* Contenido */}
        {cargando ? (
          <View style={styles.estadoCentro}>
            <ActivityIndicator size="large" color="#66BB6A" />
            <Text style={styles.estadoTexto}>Cargando contactos...</Text>
          </View>
        ) : permisoDenegado ? (
          <View style={styles.estadoCentro}>
            <Text style={styles.estadoEmoji}>🔒</Text>
            <Text style={styles.estadoTitulo}>Permiso requerido</Text>
            <Text style={styles.estadoTexto}>
              Para agregar contactos de tu teléfono, ElderTech necesita acceso a tu libreta de contactos.
            </Text>
            <TouchableOpacity
              style={styles.btnPermiso}
              onPress={cargarContactos}
              accessibilityRole="button"
            >
              <Text style={styles.btnPermisoTexto}>Permitir acceso</Text>
            </TouchableOpacity>
          </View>
        ) : contactosFiltrados.length === 0 ? (
          <View style={styles.estadoCentro}>
            <Text style={styles.estadoEmoji}>🔍</Text>
            <Text style={styles.estadoTexto}>
              {busqueda ? 'No se encontraron contactos con ese nombre.' : 'No hay contactos en el teléfono.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={contactosFiltrados}
            keyExtractor={(item) => item.id}
            renderItem={renderContacto}
            contentContainerStyle={styles.lista}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            maxToRenderPerBatch={20}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screen.horizontal,
    paddingBottom: Spacing.lg,
  },
  titulo: {
    flex: 1,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  cerrarBtn: {
    width: Spacing.touch.min,
    height: Spacing.touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.radius.full,
    backgroundColor: Colors.ui.border,
  },
  buscadorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.lg,
    marginHorizontal: Spacing.screen.horizontal,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    minHeight: Spacing.touch.comfortable,
  },
  buscadorIcon: {
    marginRight: Spacing.sm,
  },
  buscador: {
    flex: 1,
    fontSize: Typography.size.md,
    color: Colors.text.primary,
    paddingVertical: Spacing.md,
  },
  lista: {
    paddingHorizontal: Spacing.screen.horizontal,
    paddingBottom: Spacing.xxxl,
  },
  itemContacto: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: Spacing.radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    minHeight: Spacing.touch.large,
  },
  itemFoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.ui.border,
  },
  itemFotoFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#66BB6A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInicial: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemNombre: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  itemTel: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
  },
  estadoCentro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    gap: Spacing.lg,
  },
  estadoEmoji: {
    fontSize: 64,
  },
  estadoTitulo: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  estadoTexto: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  btnPermiso: {
    backgroundColor: '#66BB6A',
    borderRadius: Spacing.radius.lg,
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.md,
    minHeight: Spacing.touch.comfortable,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPermisoTexto: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },
});
