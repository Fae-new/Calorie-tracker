import { StyleSheet, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';

import { colors, radii, spacing } from '../lib/theme';
import { Button } from './Button';
import { AppText } from './Text';

type EmptyStateProps = {
  title: string;
  body?: string;
  actionTitle?: string;
  onAction?: () => void;
};

export function EmptyState({ title, body, actionTitle, onAction }: EmptyStateProps) {
  return (
    <View style={styles.empty}>
      <Sparkles color={colors.yellow} size={22} />
      <AppText variant="subtitle">{title}</AppText>
      {body ? <AppText variant="muted" style={styles.body}>{body}</AppText> : null}
      {actionTitle && onAction ? <Button title={actionTitle} onPress={onAction} style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 180,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: spacing.lg,
  },
  body: {
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.xs,
    minWidth: 136,
  },
});
