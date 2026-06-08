import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { LoadingButton } from '@/components/auth/LoadingButton';
import {
  logout,
  updateProfile,
  pickImage,
  takePhoto,
  uploadAndGetPhotoUrl,
  getIntereses,
  getCiudadesFamiliares,
} from '@/services/authService';
import { supabase } from '@/services/supabase';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import type { Interes, CiudadFamiliar } from '@/types/auth.types';

const FLAG: Record<string, string> = { AR: '🇦🇷', IL: '🇮🇱', US: '🇺🇸' };

export default function ProfileScreen() {
  const { profile, refreshProfile, session } = useAuth();
  const residente = profile?.residente;
  const perfil = profile?.perfil;

  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [intereses, setIntereses] = useState<Interes[]>([]);
  const [ciudades, setCiudades] = useState<CiudadFamiliar[]>([]);
  const [residenteIntereses, setResidenteIntereses] = useState<string[]>([]);
  const [residenteCiudades, setResidenteCiudades] = useState<string[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(true);

  useEffect(() => {
    if (!residente) return;
    Promise.all([
      getIntereses(),
      getCiudadesFamiliares(),
      supabase
        .from('residente_intereses')
        .select('interes_id')
        .eq('residente_id', residente.id),
      supabase
        .from('residente_ciudades_familiares')
        .select('ciudad_familiar_id')
        .eq('residente_id', residente.id),
    ]).then(([ints, ciud, { data: riData }, { data: rcData }]) => {
      setIntereses(ints);
      setCiudades(ciud);
      setResidenteIntereses(riData?.map((r) => r.interes_id) ?? []);
      setResidenteCiudades(rcData?.map((r) => r.ciudad_familiar_id) ?? []);
    }).finally(() => setLoadingExtra(false));
  }, [residente]);

  async function handleChangePhoto() {
    if (!residente || !session?.user.id) return;
    Alert.alert('Foto de perfil', 'Elegí cómo querés actualizar tu foto', [
      {
        text: 'Tomar foto',
        onPress: async () => {
          const uri = await takePhoto();
          if (uri) uploadPhoto(uri);
        },
      },
      {
        text: 'Elegir de galería',
        onPress: async () => {
          const uri = await pickImage();
          if (uri) uploadPhoto(uri);
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function uploadPhoto(uri: string) {
    if (!residente || !session?.user.id) return;
    setSaving(true);
    try {
      const url = await uploadAndGetPhotoUrl(session.user.id, uri);
      await updateProfile(residente.id, { foto_url: url });
      await refreshProfile();
    } catch {
      Alert.alert('Error', 'No se pudo actualizar la foto.');
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    setShowLogoutModal(true);
  }

  async function confirmarLogout() {
    setShowLogoutModal(false);
    setLoggingOut(true);
    try { await logout(); } catch {}
    // NavigationGuard handles redirect once session is null
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.brand.greenDark} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={26} color={Colors.text.onDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi perfil</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handleChangePhoto} disabled={saving}>
            {residente?.foto_url ? (
              <Image source={{ uri: residente.foto_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={48} color={Colors.ui.disabled} />
              </View>
            )}
            <View style={styles.cameraBadge}>
              {saving ? (
                <ActivityIndicator size={14} color={Colors.text.onDark} />
              ) : (
                <Ionicons name="camera" size={16} color={Colors.text.onDark} />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.fullName}>
            {residente ? `${residente.nombre} ${residente.apellido}` : perfil?.username}
          </Text>
          <Text style={styles.username}>@{perfil?.username}</Text>
          {residente?.piso && (
            <Text style={styles.location}>
              {residente.piso}
              {residente.habitacion ? ` · Hab. ${residente.habitacion}` : ''}
            </Text>
          )}
        </View>

        {/* Info cards */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Datos personales</Text>
          <InfoRow icon="mail-outline" label="Email" value={residente?.email ?? '—'} />
          {residente?.fecha_nacimiento && (
            <InfoRow
              icon="calendar-outline"
              label="Nacimiento"
              value={formatDate(residente.fecha_nacimiento)}
            />
          )}
          <InfoRow
            icon="accessibility-outline"
            label="Nivel"
            value={NIVEL_LABEL[residente?.nivel_dificultad ?? 'independiente']}
          />
        </View>

        {/* Interests */}
        {!loadingExtra && residenteIntereses.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mis intereses</Text>
            <View style={styles.chips}>
              {intereses
                .filter((i) => residenteIntereses.includes(i.id))
                .map((i) => (
                  <View key={i.id} style={styles.chip}>
                    {i.emoji && <Text style={styles.chipEmoji}>{i.emoji}</Text>}
                    <Text style={styles.chipLabel}>{i.nombre}</Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Family cities */}
        {!loadingExtra && residenteCiudades.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ciudades de familiares</Text>
            <View style={styles.cityList}>
              {ciudades
                .filter((c) => residenteCiudades.includes(c.id))
                .map((c) => (
                  <View key={c.id} style={styles.cityRow}>
                    <Text style={styles.cityFlag}>{FLAG[c.pais_codigo] ?? '🌍'}</Text>
                    <Text style={styles.cityName}>{c.nombre}</Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        <LoadingButton
          title="Cerrar sesión"
          onPress={handleLogout}
          loading={loggingOut}
          variant="outline"
          style={styles.logoutButton}
          textStyle={{ color: Colors.brand.red }}
        />
      </ScrollView>

      {/* Modal de confirmación de cierre de sesión */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalEmoji}>🚪</Text>
            <Text style={styles.modalTitle}>Cerrar sesión</Text>
            <Text style={styles.modalMessage}>
              ¿Seguro que querés salir?{'\n'}Si tenés dudas, consultá con un asistente o familiar antes de cerrar sesión.
            </Text>
            <TouchableOpacity style={styles.modalBtnSalir} onPress={confirmarLogout}>
              <Text style={styles.modalBtnSalirTexto}>Sí, salir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnCancelar} onPress={() => setShowLogoutModal(false)}>
              <Text style={styles.modalBtnCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={20} color={Colors.text.secondary} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const NIVEL_LABEL: Record<string, string> = {
  independiente: 'Independiente',
  necesita_ayuda: 'Necesita ayuda',
  dependiente: 'Dependiente',
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingBottom: Spacing.section,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    backgroundColor: Colors.brand.greenDark,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Colors.text.onDark,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.text.onDark,
  },
  fullName: {
    marginTop: Spacing.md,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },
  username: {
    fontSize: Typography.size.md,
    color: Colors.text.onDarkSecondary,
    marginTop: Spacing.xs,
  },
  location: {
    fontSize: Typography.size.sm,
    color: Colors.text.onDarkSecondary,
    marginTop: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.ui.surface,
    marginHorizontal: Spacing.screen.horizontal,
    marginTop: Spacing.lg,
    borderRadius: Spacing.radius.lg,
    padding: Spacing.lg,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 40,
  },
  infoLabel: {
    flex: 1,
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
  },
  infoValue: {
    fontSize: Typography.size.md,
    color: Colors.text.primary,
    fontWeight: Typography.weight.medium,
    textAlign: 'right',
    maxWidth: '60%',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#E8F5E9',
    borderRadius: Spacing.radius.full,
    gap: Spacing.xs,
  },
  chipEmoji: {
    fontSize: Typography.size.md,
  },
  chipLabel: {
    fontSize: Typography.size.sm,
    color: Colors.brand.greenDark,
    fontWeight: Typography.weight.medium,
  },
  cityList: {
    gap: Spacing.sm,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cityFlag: {
    fontSize: Typography.size.xl,
  },
  cityName: {
    fontSize: Typography.size.md,
    color: Colors.text.primary,
    fontWeight: Typography.weight.medium,
  },
  logoutButton: {
    marginHorizontal: Spacing.screen.horizontal,
    marginTop: Spacing.xxl,
    borderColor: Colors.brand.red,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.screen.horizontal,
  },
  modalBox: {
    backgroundColor: Colors.ui.surface,
    borderRadius: 20,
    padding: Spacing.xxl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: Spacing.md,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  modalEmoji: {
    fontSize: 52,
  },
  modalTitle: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  modalBtnSalir: {
    backgroundColor: Colors.brand.red,
    borderRadius: Spacing.radius.lg,
    paddingVertical: Spacing.lg,
    width: '100%',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  modalBtnSalirTexto: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onDark,
  },
  modalBtnCancelar: {
    backgroundColor: Colors.ui.background,
    borderRadius: Spacing.radius.lg,
    paddingVertical: Spacing.lg,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.ui.border,
  },
  modalBtnCancelarTexto: {
    fontSize: Typography.size.lg,
    color: Colors.text.secondary,
  },
});
