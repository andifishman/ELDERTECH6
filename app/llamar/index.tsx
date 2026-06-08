// Pantalla principal del módulo Llamar — lista de contactos del residente
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/common/AppHeader';
import { ContactoCard } from '@/components/llamar/ContactoCard';
import { SeleccionarContactoModal } from '@/components/llamar/SeleccionarContactoModal';
import { useAuth } from '@/context/AuthContext';
import {
  useContactos,
  useAgregarContacto,
  useEliminarContacto,
  useToggleFavorito,
} from '@/hooks/useContactos';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import type { ContactoResumen } from '@/types/database.types';

export default function LlamarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const residenteId = profile?.residente?.id ?? null;

  const [modalVisible, setModalVisible] = useState(false);

  // Queries y mutaciones
  const { data: contactos = [], isLoading, isError, error, refetch } = useContactos(residenteId);
  const agregarMutation = useAgregarContacto(residenteId ?? '');
  const eliminarMutation = useEliminarContacto(residenteId ?? '');
  const favoritoMutation = useToggleFavorito(residenteId ?? '');

  // Navegar al detalle del contacto
  const handleContactoPress = useCallback((contacto: ContactoResumen) => {
    router.push({
      pathname: '/llamar/[id]',
      params: {
        id: contacto.id,
        nombre: contacto.nombre,
        apellido: contacto.apellido ?? '',
        telefono: contacto.telefono,
        whatsapp: contacto.whatsapp_disponible ? '1' : '0',
        foto_url: contacto.foto_url ?? '',
      },
    });
  }, [router]);

  // Agregar contacto importado del dispositivo
  const handleSeleccionarContacto = useCallback(async (datos: {
    nombre: string;
    apellido?: string;
    telefono: string;
    foto_url?: string;
    contacto_device_id: string;
  }) => {
    if (!residenteId) return;

    try {
      await agregarMutation.mutateAsync({
        residente_id: residenteId,
        nombre: datos.nombre,
        apellido: datos.apellido ?? null,
        telefono: datos.telefono,
        foto_url: datos.foto_url ?? null,
        whatsapp_disponible: true,
        origen_contacto: 'dispositivo',
        contacto_device_id: datos.contacto_device_id,
        favorito: false,
        orden: contactos.length,
      });
    } catch (err: any) {
      if (err?.message?.includes('ya está en tu lista')) {
        Alert.alert('Contacto duplicado', 'Este contacto ya está en tu lista.');
      } else {
        Alert.alert('Error', 'No se pudo agregar el contacto. Intentá de nuevo.');
      }
    }
  }, [residenteId, contactos.length, agregarMutation]);

  // Confirmar y eliminar contacto
  const handleEliminar = useCallback((contacto: ContactoResumen) => {
    const nombre = contacto.apellido
      ? `${contacto.nombre} ${contacto.apellido}`
      : contacto.nombre;

    Alert.alert(
      'Eliminar contacto',
      `¿Querés eliminar a ${nombre} de tu lista?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => eliminarMutation.mutate(contacto.id),
        },
      ],
    );
  }, [eliminarMutation]);

  // Toggle favorito
  const handleToggleFavorito = useCallback((id: string, nuevoValor: boolean) => {
    favoritoMutation.mutate({ id, favorito: nuevoValor });
  }, [favoritoMutation]);

  // Render de cada tarjeta
  const renderContacto = useCallback(({ item }: { item: ContactoResumen }) => (
    <ContactoCard
      contacto={item}
      onPress={() => handleContactoPress(item)}
      onToggleFavorito={handleToggleFavorito}
    />
  ), [handleContactoPress, handleToggleFavorito]);

  // Separador visual entre favoritos y el resto
  const renderSeparador = useCallback(({ leadingItem }: { leadingItem: ContactoResumen }) => {
    const idx = contactos.indexOf(leadingItem);
    const siguiente = contactos[idx + 1];
    if (leadingItem.favorito && siguiente && !siguiente.favorito) {
      return <View style={styles.separador} />;
    }
    return null;
  }, [contactos]);

  // ─── Estados de UI ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader
          titulo="Llamar"
          mostrarVolver
          backgroundColor="#66BB6A"
          textoHablar="Llamar. Acá podés ver tus contactos y comunicarte con ellos."
        />
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color="#66BB6A" />
          <Text style={styles.cargandoTexto}>Cargando contactos...</Text>
        </View>
      </View>
    );
  }

  if (isError) {
    // Detectar causa probable del error para mostrar mensaje útil
    const errorMsg = (error as Error)?.message ?? '';
    const esTablaMissing = errorMsg.includes('does not exist') || errorMsg.includes('relation') || errorMsg.includes('42P01');
    const esSinResidente = !residenteId;

    return (
      <View style={styles.flex}>
        <AppHeader
          titulo="Llamar"
          mostrarVolver
          backgroundColor="#66BB6A"
        />
        <View style={styles.centrado}>
          <Text style={styles.estadoEmoji}>⚠️</Text>
          <Text style={styles.estadoTitulo}>
            {esSinResidente
              ? 'No se encontró tu perfil'
              : esTablaMissing
              ? 'Configuración pendiente'
              : 'No pudimos cargar tus contactos'}
          </Text>
          <Text style={styles.estadoDetalle}>
            {esSinResidente
              ? 'Tu usuario no tiene un residente asociado. Contactá al administrador.'
              : esTablaMissing
              ? 'La tabla de contactos no existe aún en la base de datos. Ejecutá la migración SQL en Supabase.'
              : errorMsg || 'Error de conexión. Verificá tu internet.'}
          </Text>
          {!esSinResidente && (
            <TouchableOpacity style={styles.btnReintentar} onPress={() => refetch()}>
              <Text style={styles.btnReintentarTexto}>Reintentar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <AppHeader
        titulo="Llamar"
        mostrarVolver
        backgroundColor="#66BB6A"
        textoHablar={
          contactos.length === 0
            ? 'Llamar. Todavía no tenés contactos guardados. Tocá el botón verde para agregar uno.'
            : `Llamar. Tenés ${contactos.length} contacto${contactos.length !== 1 ? 's' : ''} guardado${contactos.length !== 1 ? 's' : ''}. Tocá cualquiera para llamar o enviar un mensaje.`
        }
      />

      {/* Botón Agregar contacto — fijo debajo del header, siempre visible */}
      <View style={styles.barraAgregar}>
        <TouchableOpacity
          style={styles.btnAgregar}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
          accessibilityLabel="Agregar contacto"
          accessibilityRole="button"
        >
          <Ionicons name="person-add" size={24} color={Colors.text.onDark} />
          <Text style={styles.btnAgregarTexto}>Agregar contacto</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={contactos}
        keyExtractor={(item) => item.id}
        renderItem={renderContacto}
        ItemSeparatorComponent={renderSeparador}
        contentContainerStyle={[
          styles.lista,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={styles.vacioEmoji}>📞</Text>
            <Text style={styles.vacioTitulo}>No tenés contactos aún</Text>
            <Text style={styles.vacioSubtitulo}>
              Tocá el botón de arriba para agregar a tu familia o amigos.
            </Text>
          </View>
        }
        ListHeaderComponent={
          contactos.length > 0 ? (
            <Text style={styles.encabezadoLista}>
              {contactos.filter((c) => c.favorito).length > 0
                ? '⭐ Favoritos primero'
                : `${contactos.length} contacto${contactos.length !== 1 ? 's' : ''}`}
            </Text>
          ) : null
        }
      />

      {/* Modal de selección de contactos del dispositivo */}
      <SeleccionarContactoModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSeleccionar={handleSeleccionarContacto}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xxxl,
  },
  lista: {
    paddingHorizontal: Spacing.screen.horizontal,
    paddingTop: Spacing.lg,
  },
  encabezadoLista: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
    paddingLeft: Spacing.xs,
  },
  separador: {
    height: 1,
    backgroundColor: Colors.ui.border,
    marginVertical: Spacing.md,
    marginHorizontal: Spacing.xs,
  },
  // Estado vacío
  vacio: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: Spacing.xxxl,
    gap: Spacing.lg,
  },
  vacioEmoji: {
    fontSize: 80,
  },
  vacioTitulo: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  vacioSubtitulo: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  // Estado error
  estadoEmoji: {
    fontSize: 64,
  },
  estadoDetalle: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.xl,
  },
  estadoTitulo: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  btnReintentar: {
    backgroundColor: '#66BB6A',
    borderRadius: Spacing.radius.lg,
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.lg,
    minHeight: Spacing.touch.comfortable,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnReintentarTexto: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },
  cargandoTexto: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
  },
  // Barra y botón de agregar — fijo debajo del header
  barraAgregar: {
    backgroundColor: Colors.ui.surface,
    paddingHorizontal: Spacing.screen.horizontal,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
  },
  btnAgregar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#66BB6A',
    borderRadius: Spacing.radius.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    minHeight: Spacing.touch.comfortable,
  },
  btnAgregarTexto: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },
});
