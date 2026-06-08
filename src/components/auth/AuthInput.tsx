import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

interface AuthInputProps extends TextInputProps {
  label: string;
  error?: string | null;
  containerStyle?: ViewStyle;
  required?: boolean;
}

export function AuthInput({
  label,
  error,
  containerStyle,
  required,
  ...props
}: AuthInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          focused && styles.inputFocused,
          !!error && styles.inputError,
        ]}
        placeholderTextColor={Colors.text.hint}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCorrect={false}
        {...props}
      />
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
  input: {
    height: Spacing.touch.comfortable,
    backgroundColor: Colors.ui.surface,
    borderWidth: 1.5,
    borderColor: Colors.ui.border,
    borderRadius: Spacing.radius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.size.md,
    color: Colors.text.primary,
  },
  inputFocused: {
    borderColor: Colors.brand.greenDark,
    borderWidth: 2,
  },
  inputError: {
    borderColor: Colors.brand.red,
    borderWidth: 2,
  },
  errorText: {
    marginTop: Spacing.xs,
    fontSize: Typography.size.sm,
    color: Colors.brand.red,
    fontWeight: Typography.weight.medium,
  },
});
