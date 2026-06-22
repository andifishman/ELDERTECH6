import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

interface PasswordInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string | null;
  placeholder?: string;
  required?: boolean;
}

export function PasswordInput({
  label,
  value,
  onChangeText,
  error,
  placeholder = 'Contraseña',
  required,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <View
        style={[
          styles.inputRow,
          focused && styles.inputRowFocused,
          !!error && styles.inputRowError,
        ]}
      >
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          placeholder={placeholder}
          placeholderTextColor={Colors.text.hint}
          autoCorrect={false}
          autoCapitalize="none"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <TouchableOpacity
          onPress={() => setVisible((v) => !v)}
          style={styles.eyeButton}
          accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={24}
            color={Colors.text.secondary}
          />
        </TouchableOpacity>
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  required: {
    color: Colors.brand.red,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: Spacing.touch.comfortable,
    backgroundColor: Colors.ui.surface,
    borderWidth: 1.5,
    borderColor: Colors.ui.border,
    borderRadius: Spacing.radius.md,
    paddingHorizontal: Spacing.lg,
  },
  inputRowFocused: {
    borderColor: Colors.brand.greenDark,
    borderWidth: 2,
  },
  inputRowError: {
    borderColor: Colors.brand.red,
    borderWidth: 2,
  },
  input: {
    flex: 1,
    fontSize: Typography.size.md,
    color: Colors.text.primary,
    height: '100%',
  },
  eyeButton: {
    paddingLeft: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 36,
    minHeight: 36,
  },
  errorText: {
    marginTop: Spacing.xs,
    fontSize: Typography.size.sm,
    color: Colors.brand.red,
    fontWeight: Typography.weight.medium,
  },
});
