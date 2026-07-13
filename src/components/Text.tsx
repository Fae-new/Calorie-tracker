import type { ReactNode } from 'react';
import { StyleSheet, Text, type GestureResponderEvent, type StyleProp, type TextStyle } from 'react-native';

import { colors } from '../lib/theme';

type AppTextProps = {
  children: ReactNode;
  variant?: 'eyebrow' | 'title' | 'subtitle' | 'body' | 'muted' | 'metric' | 'caption';
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<TextStyle>;
};

export function AppText({ children, variant = 'body', onPress, style }: AppTextProps) {
  return (
    <Text maxFontSizeMultiplier={1.12} onPress={onPress} style={[styles.base, styles[variant], style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.text,
    letterSpacing: 0,
  },
  eyebrow: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    lineHeight: 38,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  metric: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '800',
  },
  caption: {
    color: colors.faint,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
});
