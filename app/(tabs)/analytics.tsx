import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { useSQLiteContext } from 'expo-sqlite';

import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Field, Segmented } from '../../src/components/Form';
import { Screen } from '../../src/components/Screen';
import { StatCard } from '../../src/components/StatCard';
import { AppText } from '../../src/components/Text';
import { rangeStart, shortDateLabel } from '../../src/lib/dates';
import { formatWeightKg } from '../../src/lib/format';
import { addWeightLog, getDailyCalories, getWeightLogs } from '../../src/lib/repository';
import { colors, spacing } from '../../src/lib/theme';
import type { WeightLog } from '../../src/lib/types';

type Range = '7D' | '30D' | '90D' | 'All';

const rangeOptions: Array<{ label: string; value: Range }> = [
  { label: '7D', value: '7D' },
  { label: '30D', value: '30D' },
  { label: '90D', value: '90D' },
  { label: 'All', value: 'All' },
];

type DailyCalories = {
  day: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export default function AnalyticsScreen() {
  const db = useSQLiteContext();
  const { width } = useWindowDimensions();
  const [range, setRange] = useState<Range>('30D');
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [dailyCalories, setDailyCalories] = useState<DailyCalories[]>([]);
  const [weightKg, setWeightKg] = useState('');

  const load = useCallback(async () => {
    const startIso = rangeStart(range);
    const [weightRows, calorieRows] = await Promise.all([
      getWeightLogs(db, startIso),
      getDailyCalories(db, startIso),
    ]);
    setWeights(weightRows);
    setDailyCalories(calorieRows);
  }, [db, range]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const chartWidth = Math.max(260, width - 86);
  const averageCalories = dailyCalories.length
    ? Math.round(dailyCalories.reduce((sum, item) => sum + item.kcal, 0) / dailyCalories.length)
    : 0;
  const latestWeight = weights[weights.length - 1];
  const firstWeight = weights[0];
  const weightChange = latestWeight && firstWeight ? latestWeight.weightKg - firstWeight.weightKg : 0;

  const weightData = useMemo(
    () =>
      weights.map((item, index) => ({
        value: Number(item.weightKg.toFixed(2)),
        label: index === 0 || index === weights.length - 1 ? shortDateLabel(item.loggedAt) : '',
      })),
    [weights],
  );

  const calorieData = useMemo(
    () =>
      dailyCalories.map((item, index) => ({
        value: Math.round(item.kcal),
        label: index === 0 || index === dailyCalories.length - 1 ? shortDateLabel(item.day) : '',
        frontColor: colors.blue,
      })),
    [dailyCalories],
  );

  async function saveWeight() {
    const parsed = Number(weightKg);
    if (!parsed || parsed <= 0) {
      Alert.alert('Check weight', 'Enter a valid weight in kg.');
      return;
    }

    await addWeightLog(db, parsed, '');
    setWeightKg('');
    load();
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="eyebrow">Fae</AppText>
        <AppText variant="title">Progress</AppText>
      </View>

      <Segmented value={range} options={rangeOptions} onChange={setRange} />

      <View style={styles.statsGrid}>
        <StatCard label="Current weight" value={latestWeight ? formatWeightKg(latestWeight.weightKg) : '-'} tone="blue" />
        <StatCard
          label="Weight change"
          value={weights.length > 1 ? `${weightChange >= 0 ? '+' : ''}${formatWeightKg(weightChange)}` : '-'}
          tone={weightChange <= 0 ? 'green' : 'yellow'}
        />
        <StatCard label="Avg calories" value={averageCalories ? `${averageCalories}` : '-'} tone="purple" />
      </View>

      <Card style={styles.logCard}>
        <View style={styles.logCopy}>
          <AppText variant="subtitle">Log weight</AppText>
          <AppText variant="muted">One number, saved locally.</AppText>
        </View>
        <Field label="Weight kg" value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" placeholder="86.5" />
        <Button title="Save weight" onPress={saveWeight} icon={<Plus color={colors.white} size={18} />} />
      </Card>

      <Card style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <AppText variant="subtitle">Weight trend</AppText>
          <AppText variant="caption">{range}</AppText>
        </View>
        {weightData.length < 2 ? (
          <EmptyState title="More weigh-ins needed" body="Log at least two weights to see the trend line." />
        ) : (
          <LineChart
            data={weightData}
            width={chartWidth}
            height={190}
            areaChart
            curved
            thickness={3}
            color={colors.blue}
            startFillColor="rgba(56, 189, 248, 0.32)"
            endFillColor="rgba(56, 189, 248, 0.02)"
            hideDataPoints={false}
            dataPointsColor={colors.yellow}
            yAxisColor={colors.border}
            xAxisColor={colors.border}
            rulesColor={colors.border}
            yAxisTextStyle={styles.axisText}
            xAxisLabelTextStyle={styles.axisText}
            yAxisOffset={70}
            maxValue={30}
            stepValue={10}
            noOfSections={3}
          />
        )}
      </Card>

      <Card style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <AppText variant="subtitle">Daily calories</AppText>
          <AppText variant="caption">{range}</AppText>
        </View>
        {calorieData.length === 0 ? (
          <EmptyState title="No calories yet" body="Meal logs will create daily bars here." />
        ) : (
          <BarChart
            data={calorieData}
            width={chartWidth}
            height={190}
            barWidth={18}
            spacing={18}
            roundedTop
            roundedBottom
            yAxisColor={colors.border}
            xAxisColor={colors.border}
            rulesColor={colors.border}
            yAxisTextStyle={styles.axisText}
            xAxisLabelTextStyle={styles.axisText}
            noOfSections={4}
            maxValue={Math.max(100, ...dailyCalories.map((item) => item.kcal)) * 1.15}
          />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  logCard: {
    marginBottom: spacing.md,
  },
  logCopy: {
    marginBottom: spacing.md,
  },
  chartCard: {
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  chartHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  axisText: {
    color: colors.faint,
    fontSize: 10,
  },
});
