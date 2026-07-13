import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radii, spacing } from '../lib/theme';
import { AppText } from './Text';

type ButtonProps = {
  title: string;
  onPress: () => void;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, icon, variant = 'primary', disabled, style }: ButtonProps) {
  const content = (
    <View style={styles.inner}>
      {icon}
      <AppText style={[styles.label, variant === 'ghost' && styles.ghostLabel, disabled && styles.disabledText]}>
        {title}
      </AppText>
    </View>
  );

  if (variant === 'primary') {
    return (
      <Pressable onPress={onPress} disabled={disabled} style={[styles.pressable, disabled && styles.disabled, style]}>
        <LinearGradient colors={[colors.blueDeep, colors.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        disabled && styles.disabled,
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: radii.md,
  },
  button: {
    minHeight: 50,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  inner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  label: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  secondary: {
    backgroundColor: colors.panelSoft,
    borderColor: colors.border,
    borderWidth: 1,
  },
  ghost: {
    minHeight: 42,
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.sm,
  },
  ghostLabel: {
    color: colors.blue,
  },
  danger: {
    backgroundColor: 'rgba(251, 113, 133, 0.12)',
    borderColor: 'rgba(251, 113, 133, 0.35)',
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.48,
  },
  disabledText: {
    color: colors.muted,
  },
});
