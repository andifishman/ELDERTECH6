import React from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pickImage, takePhoto } from '@/services/authService';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

interface AvatarPickerProps {
  uri: string | null;
  onChange: (uri: string) => void;
}

export function AvatarPicker({ uri, onChange }: AvatarPickerProps) {
  function handlePress() {
    Alert.alert(
      'Foto de perfil',
      'Elegí cómo querés agregar tu foto',
      [
        {
          text: 'Tomar foto',
          onPress: async () => {
            const result = await takePhoto();
            if (result) onChange(result);
          },
        },
        {
          text: 'Elegir de galería',
          onPress: async () => {
            const result = await pickImage();
            if (result) onChange(result);
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ],
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handlePress}
        style={styles.avatarButton}
        accessibilityLabel="Agregar foto de perfil"
        accessibilityRole="button"
      >
        {uri ? (
          <Image source={{ uri }} style={styles.avatar} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="person" size={48} color={Colors.ui.disabled} />
          </View>
        )}
        <View style={styles.badge}>
          <Ionicons name="camera" size={18} color={Colors.text.onDark} />
        </View>
      </TouchableOpacity>
      <Text style={styles.hint}>
        {uri ? 'Tocá para cambiar la foto' : 'Tocá para agregar tu foto'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  avatarButton: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Colors.brand.greenDark,
  },
  placeholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.ui.background,
    borderWidth: 2,
    borderColor: Colors.ui.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.brand.greenDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.ui.surface,
  },
  hint: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});
