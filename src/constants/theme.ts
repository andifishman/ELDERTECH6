// Compatibility shim for game screens — maps old theme tokens to current project design tokens
import { Colors as AppColors } from './Colors';
import { Typography } from './Typography';
import { Spacing as AppSpacing } from './Spacing';

export const Colors = {
  background:    AppColors.ui.background,
  white:         AppColors.ui.surface,
  border:        AppColors.ui.border,
  shadow:        '#000000',

  primary:       AppColors.brand.greenDark,
  primaryDark:   '#0A3D20',

  danger:        AppColors.brand.red,
  dangerLight:   '#FFEBEE',
  success:       AppColors.brand.greenMedium,
  successLight:  '#E8F5E9',
  info:          '#1565C0',
  infoLight:     '#E3F2FD',

  textPrimary:   AppColors.text.primary,
  textSecondary: AppColors.text.secondary,
};

export const FontSizes = {
  xs:  Typography.size.xs,
  sm:  Typography.size.sm,
  md:  Typography.size.md,
  lg:  Typography.size.lg,
  xl:  Typography.size.xl,
  xxl: Typography.size.xxl,
};

export const Radius = {
  sm:   AppSpacing.radius.sm,
  md:   AppSpacing.radius.md,
  lg:   AppSpacing.radius.lg,
  full: AppSpacing.radius.full,
};

export const Spacing = {
  xs:  AppSpacing.xs,
  sm:  AppSpacing.sm,
  md:  AppSpacing.md,
  lg:  AppSpacing.lg,
  xl:  AppSpacing.xl,
  xxl: AppSpacing.xxl,
};
