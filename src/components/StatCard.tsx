import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../lib/theme';
import { Card } from './Card';
import { AppText } from './Text';

type StatCardProps = {
  label: string;
  value: string;
  tone?: 'blue' | 'purple' | 'yellow' | 'green' | 'red';
};

export function StatCard({ label, value, tone = 'blue' }: StatCardProps) {
  return (
    <Card style={styles.card}>
      <View style={[styles.dot, { backgroundColor: colors[tone] }]} />
      <AppText variant="caption">{label}</AppText>
      <AppText variant="metric">{value}</AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginBottom: spacing.xs,
  },
});
