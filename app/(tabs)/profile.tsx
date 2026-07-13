import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useFocusEffect } from 'expo-router';
import { BookOpen, ChevronDown, ChevronRight, Download, Save, Scale } from 'lucide-react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Field } from '../../src/components/Form';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/Text';
import { activityLabels, calculateMaintenanceCalories, calculateTargetCalories, goalLabels } from '../../src/lib/calculations';
import { importHistoryFromJson } from '../../src/lib/historyImport';
import { getProfile, saveProfile } from '../../src/lib/repository';
import { colors, spacing } from '../../src/lib/theme';
import type { ActivityLevel, Goal, Sex } from '../../src/lib/types';

const sexOptions: Array<{ label: string; value: Sex }> = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
];

const activityOptions: Array<{ label: string; value: ActivityLevel }> = [
  { label: activityLabels.sedentary, value: 'sedentary' },
  { label: activityLabels.light, value: 'light' },
  { label: activityLabels.moderate, value: 'moderate' },
  { label: activityLabels.active, value: 'active' },
  { label: activityLabels.athlete, value: 'athlete' },
];

const goalOptions: Array<{ label: string; value: Goal }> = [
  { label: goalLabels.maintain, value: 'maintain' },
  { label: goalLabels.cut, value: 'cut' },
  { label: goalLabels.bulk, value: 'bulk' },
];

export default function ProfileScreen() {
  const db = useSQLiteContext();
  const [age, setAge] = useState('28');
  const [heightCm, setHeightCm] = useState('175');
  const [weightKg, setWeightKg] = useState('75');
  const [sex, setSex] = useState<Sex>('male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<Goal>('maintain');
  const [targetCalories, setTargetCalories] = useState('');
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const parsedAgePreview = Number(age);
  const parsedHeightPreview = Number(heightCm);
  const parsedWeightPreview = Number(weightKg);
  const calculatedMaintenance =
    parsedAgePreview > 0 && parsedHeightPreview > 0 && parsedWeightPreview > 0
      ? calculateMaintenanceCalories({
          age: parsedAgePreview,
          sex,
          heightCm: parsedHeightPreview,
          weightKg: parsedWeightPreview,
          activityLevel,
        })
      : null;
  const calculatedTarget = calculatedMaintenance ? calculateTargetCalories(calculatedMaintenance, goal) : null;

  const load = useCallback(async () => {
    const profile = await getProfile(db);
    if (!profile) {
      return;
    }

    setAge(String(profile.age));
    setHeightCm(String(profile.heightCm));
    setWeightKg(String(profile.weightKg));
    setSex(profile.sex);
    setActivityLevel(profile.activityLevel);
    setGoal(profile.goal);
    setTargetCalories(String(profile.targetCalories));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function save() {
    const parsedAge = Number(age);
    const parsedHeight = Number(heightCm);
    const parsedWeight = Number(weightKg);
    const parsedTarget = Number(targetCalories);

    if (!parsedTarget || parsedTarget <= 0) {
      Alert.alert('Check target', 'Enter the daily calorie target you want to use.');
      return;
    }

    if (parsedAge <= 0 || parsedHeight <= 0 || parsedWeight <= 0) {
      Alert.alert('Check calculator', 'Age, height, and weight must be positive numbers.');
      return;
    }

    await saveProfile(db, {
      age: parsedAge,
      sex,
      heightCm: parsedHeight,
      weightKg: parsedWeight,
      activityLevel,
      goal,
      targetCalories: parsedTarget,
    });
    Alert.alert('Saved', 'Your daily calorie target has been updated.');
  }

  async function importHistory() {
    if (isImporting) {
      return;
    }

    try {
      setIsImporting(true);
      const picked = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: 'application/json',
      });

      if (picked.canceled) {
        return;
      }

      const asset = picked.assets[0];
      if (!asset?.uri) {
        Alert.alert('Import failed', 'Fae could not read that file.');
        return;
      }

      const jsonText = await FileSystem.readAsStringAsync(asset.uri);
      const result = await importHistoryFromJson(db, jsonText);
      const missing = result.missingFoods.length
        ? `\n\nMissing foods: ${result.missingFoods.slice(0, 6).join(', ')}${result.missingFoods.length > 6 ? '...' : ''}`
        : '';

      Alert.alert(
        'Import complete',
        `Imported ${result.mealDaysImported} meal days and ${result.weightsImported} weights.\nSkipped ${result.mealDaysSkipped} meal days and ${result.weightsSkipped} weights that already existed.${missing}`,
      );
    } catch (error) {
      Alert.alert('Import failed', error instanceof Error ? error.message : 'Fae could not import that JSON file.');
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="eyebrow">Fae</AppText>
        <AppText variant="title">Settings</AppText>
      </View>

      <Card style={styles.targetCard}>
        <View style={styles.cardTitleRow}>
          <View style={styles.cardIcon}>
            <Scale color={colors.yellow} size={20} />
          </View>
          <View style={styles.cardTitleCopy}>
            <AppText variant="subtitle">Daily calorie target</AppText>
            <AppText variant="muted">Set the number Fae uses on Today and Progress.</AppText>
          </View>
        </View>
        <Field
          label="Calories per day"
          value={targetCalories}
          onChangeText={setTargetCalories}
          keyboardType="numeric"
          placeholder="2400"
        />
        <Button title="Save target" onPress={save} icon={<Save color={colors.white} size={18} />} />
      </Card>

      <Card style={styles.noteCard}>
        <Pressable onPress={() => setCalculatorOpen((current) => !current)} style={styles.disclosureRow}>
          <View>
            <AppText variant="subtitle">Optional estimate</AppText>
            <AppText variant="muted">Use this only when you want a suggested target.</AppText>
          </View>
          {calculatorOpen ? <ChevronDown color={colors.faint} size={20} /> : <ChevronRight color={colors.faint} size={20} />}
        </Pressable>

        {calculatorOpen ? (
          <View style={styles.calculator}>
            <ChipGroup label="Sex" value={sex} options={sexOptions} onChange={setSex} />
            <View style={styles.twoCols}>
              <Field label="Age" value={age} onChangeText={setAge} keyboardType="numeric" style={styles.colField} />
              <Field label="Weight kg" value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" style={styles.colField} />
            </View>
            <Field label="Height cm" value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" />
            <ChipGroup label="Activity" value={activityLevel} options={activityOptions} onChange={setActivityLevel} />
            <ChipGroup label="Goal" value={goal} options={goalOptions} onChange={setGoal} compact />
            {calculatedTarget ? (
              <View style={styles.calculatedRow}>
                <AppText variant="caption">Suggested target: {calculatedTarget} kcal</AppText>
                <Pressable onPress={() => setTargetCalories(String(calculatedTarget))} hitSlop={10}>
                  <AppText style={styles.useCalculated}>Use</AppText>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}
      </Card>

      <Card style={styles.noteCard}>
        <View style={styles.cardTitleRow}>
          <View style={styles.cardIcon}>
            <BookOpen color={colors.blue} size={20} />
          </View>
          <View style={styles.cardTitleCopy}>
            <AppText variant="subtitle">Tools</AppText>
            <AppText variant="muted">Edit foods or review old weigh-ins when needed.</AppText>
          </View>
        </View>
        <View style={styles.toolButtons}>
          <Button
            title={isImporting ? 'Importing...' : 'Import history JSON'}
            onPress={importHistory}
            disabled={isImporting}
            icon={<Download color={colors.white} size={18} />}
          />
          <Button title="Food database" onPress={() => router.push('/foods')} variant="secondary" />
          <Button title="Weight history" onPress={() => router.push('/weight')} variant="secondary" />
        </View>
      </Card>
    </Screen>
  );
}

type ChipGroupProps<T extends string> = {
  compact?: boolean;
  label: string;
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
};

function ChipGroup<T extends string>({ compact, label, value, options, onChange }: ChipGroupProps<T>) {
  return (
    <View style={styles.chipField}>
      <AppText variant="caption">{label}</AppText>
      <View style={styles.chipGrid}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.chip, compact && styles.chipCompact, selected && styles.chipSelected]}
            >
              <AppText style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  targetCard: {
    gap: spacing.md,
  },
  cardTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  cardIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.panelSoft,
  },
  cardTitleCopy: {
    flex: 1,
  },
  noteCard: {
    marginTop: spacing.md,
  },
  disclosureRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  calculator: {
    marginTop: spacing.lg,
  },
  twoCols: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  colField: {
    flex: 1,
  },
  chipField: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: 44,
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipCompact: {
    minWidth: 82,
  },
  chipSelected: {
    borderColor: colors.blue,
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
  },
  chipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  chipTextSelected: {
    color: colors.white,
  },
  calculatedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  useCalculated: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: '900',
  },
  toolButtons: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
