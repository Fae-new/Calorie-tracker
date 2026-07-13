import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ChevronDown, ChevronLeft, ChevronRight, Flame, Pencil, Trash2 } from 'lucide-react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/Text';
import { addDays, dateFromLocalKey, endOfDayIso, localDateKey, mediumDateLabel, startOfDayIso } from '../../src/lib/dates';
import { colors, spacing } from '../../src/lib/theme';
import { deleteMealLog, getMealLogsForRange, getProfile } from '../../src/lib/repository';
import type { MealLog, MealType, Profile } from '../../src/lib/types';

type MealGroup = {
  id: string;
  label: string;
  mealType: MealType;
  logs: MealLog[];
  firstLoggedAt: string;
  totals: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  };
};

type TodayParams = {
  date?: string | string[];
};

function groupMealLogs(logs: MealLog[]) {
  const groups = new Map<string, Omit<MealGroup, 'label'>>();

  for (const log of logs) {
    const id = log.mealGroupId ?? `legacy-${log.mealType}`;
    const current = groups.get(id);

    if (current) {
      current.logs.push(log);
      current.firstLoggedAt = log.loggedAt < current.firstLoggedAt ? log.loggedAt : current.firstLoggedAt;
      current.totals.kcal += log.kcal;
      current.totals.protein += log.protein;
      current.totals.carbs += log.carbs;
      current.totals.fat += log.fat;
    } else {
      groups.set(id, {
        id,
        mealType: log.mealType,
        logs: [log],
        firstLoggedAt: log.loggedAt,
        totals: {
          kcal: log.kcal,
          protein: log.protein,
          carbs: log.carbs,
          fat: log.fat,
        },
      });
    }
  }

  return Array.from(groups.values())
    .sort((first, second) => first.firstLoggedAt.localeCompare(second.firstLoggedAt))
    .map<MealGroup>((group, index) => ({
      ...group,
      logs: group.logs.sort((first, second) => first.loggedAt.localeCompare(second.loggedAt)),
      label: `Meal ${index + 1}`,
    }));
}

export default function TodayScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<TodayParams>();
  const routeDate = Array.isArray(params.date) ? params.date[0] : params.date;
  const [selectedDate, setSelectedDate] = useState(() => (routeDate ? dateFromLocalKey(routeDate) : new Date()));
  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [collapsedMeals, setCollapsedMeals] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    const [profileRow, mealRows] = await Promise.all([
      getProfile(db),
      getMealLogsForRange(db, startOfDayIso(selectedDate), endOfDayIso(selectedDate)),
    ]);
    setProfile(profileRow ?? null);
    setLogs(mealRows);
  }, [db, selectedDate]);

  useEffect(() => {
    if (!routeDate) {
      return;
    }

    const nextDate = dateFromLocalKey(routeDate);
    if (localDateKey(nextDate) !== localDateKey(selectedDate)) {
      setSelectedDate(nextDate);
      setCollapsedMeals({});
    }
  }, [routeDate, selectedDate]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const totals = logs.reduce(
    (sum, log) => ({
      kcal: sum.kcal + log.kcal,
      protein: sum.protein + log.protein,
      carbs: sum.carbs + log.carbs,
      fat: sum.fat + log.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const target = profile?.targetCalories ?? 0;
  const remaining = target - totals.kcal;
  const progress = target > 0 ? Math.min(totals.kcal / target, 1) : 0;
  const mealGroups = groupMealLogs(logs);
  const selectedDateKey = localDateKey(selectedDate);
  const todayKey = localDateKey();
  const isToday = selectedDateKey === todayKey;
  const isFuture = selectedDateKey > todayKey;
  const selectedDateLabel = isToday ? 'Today' : mediumDateLabel(selectedDate);

  async function removeLog(id: number) {
    await deleteMealLog(db, id);
    load();
  }

  function selectDate(date: Date) {
    setSelectedDate(date);
    setCollapsedMeals({});
    router.setParams({ date: localDateKey(date) });
  }

  function toggleMeal(id: string) {
    setCollapsedMeals((current) => ({ ...current, [id]: !(current[id] ?? true) }));
  }

  function editMeal(group: MealGroup) {
    router.push({
      pathname: '/add',
      params: {
        loggedDate: selectedDateKey,
        mealGroupId: group.id,
        mealType: group.mealType,
      },
    });
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <AppText variant="eyebrow">Fae</AppText>
          <AppText variant="title">{selectedDateLabel}</AppText>
        </View>
      </View>

      <View style={styles.dateBar}>
        <Pressable onPress={() => selectDate(addDays(selectedDate, -1))} style={styles.dateButton}>
          <ChevronLeft color={colors.text} size={18} />
        </Pressable>
        <Pressable onPress={() => selectDate(new Date())} style={styles.dateCenter}>
          <AppText style={styles.dateLabel}>{selectedDateLabel}</AppText>
          <AppText variant="caption">{selectedDateKey}</AppText>
        </Pressable>
        <Pressable
          onPress={() => selectDate(addDays(selectedDate, 1))}
          disabled={isToday || isFuture}
          style={[styles.dateButton, (isToday || isFuture) && styles.dateButtonDisabled]}
        >
          <ChevronRight color={isToday || isFuture ? colors.faint : colors.text} size={18} />
        </Pressable>
      </View>

      <Card style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <AppText variant="caption">Calories eaten</AppText>
            <AppText variant="metric">{Math.round(totals.kcal).toLocaleString()} kcal</AppText>
          </View>
          <View style={styles.flameCircle}>
            <Flame color={colors.yellow} size={24} />
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.heroFooter}>
          <AppText variant="muted">Target {target ? target.toLocaleString() : 'not set'} kcal</AppText>
          <AppText style={{ color: remaining >= 0 ? colors.green : colors.red, fontWeight: '800' }}>
            {target ? `${Math.abs(Math.round(remaining)).toLocaleString()} ${remaining >= 0 ? 'left' : 'over'}` : 'Set profile'}
          </AppText>
        </View>
      </Card>

      {!profile ? (
        <Card>
          <AppText variant="subtitle">Set a daily target</AppText>
          <AppText variant="muted" style={styles.cardCopy}>
            Pick the calorie number you want to follow. You can change it anytime.
          </AppText>
          <Button title="Open settings" onPress={() => router.push('/profile')} />
        </Card>
      ) : null}

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">{isToday ? "Today's meals" : 'Meals logged'}</AppText>
        <AppText variant="caption">
          {mealGroups.length} meal{mealGroups.length === 1 ? '' : 's'} · {logs.length} food{logs.length === 1 ? '' : 's'}
        </AppText>
      </View>

      {logs.length === 0 ? (
        <EmptyState
          title="No meals yet"
          actionTitle="Log meal"
          onAction={() => router.push({ pathname: '/add', params: { loggedDate: selectedDateKey } })}
        />
      ) : (
        <View style={styles.list}>
          {mealGroups.map((group) => {
            const isCollapsed = collapsedMeals[group.id] ?? true;
            return (
              <Card key={group.id} style={styles.mealCard}>
                <View style={styles.mealHeaderRow}>
                  <Pressable onPress={() => toggleMeal(group.id)} style={styles.mealHeaderButton}>
                    <View style={styles.mealHeaderLeft}>
                      <View style={styles.chevronBox}>
                        {isCollapsed ? <ChevronRight color={colors.faint} size={18} /> : <ChevronDown color={colors.blue} size={18} />}
                      </View>
                      <View style={styles.mealTitleBlock}>
                        <View style={styles.mealLabelRow}>
                          <AppText variant="subtitle">{group.label}</AppText>
                        </View>
                        <AppText variant="muted">
                          {group.logs.length} item{group.logs.length === 1 ? '' : 's'} · tap to view
                        </AppText>
                      </View>
                    </View>
                    <AppText style={styles.kcal}>{Math.round(group.totals.kcal)} kcal</AppText>
                  </Pressable>
                  <Pressable onPress={() => editMeal(group)} hitSlop={10} style={styles.editButton}>
                    <Pencil color={colors.blue} size={17} />
                  </Pressable>
                </View>

                {!isCollapsed ? (
                  <View style={styles.foodList}>
                    {group.logs.map((log, index) => (
                      <View key={log.id} style={[styles.foodRow, index > 0 && styles.foodRowBorder]}>
                        <View style={styles.logMain}>
                          <AppText style={styles.foodName}>{log.foodNameSnapshot}</AppText>
                          <AppText variant="caption">
                            {log.variantLabelSnapshot === 'Manual' ? 'Manual estimate' : `${log.grams}g · ${log.variantLabelSnapshot}`}
                          </AppText>
                        </View>
                        <View style={styles.logRight}>
                          <AppText style={styles.foodKcal}>{Math.round(log.kcal)} kcal</AppText>
                          <Pressable onPress={() => removeLog(log.id)} hitSlop={10} style={styles.deleteButton}>
                            <Trash2 color={colors.faint} size={17} />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  dateBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dateButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  dateButtonDisabled: {
    opacity: 0.42,
  },
  dateCenter: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  dateLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  hero: {
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  heroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  flameCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(250, 204, 21, 0.12)',
  },
  progressTrack: {
    overflow: 'hidden',
    height: 12,
    borderRadius: 999,
    backgroundColor: colors.panelSoft,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.blue,
  },
  heroFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardCopy: {
    marginVertical: spacing.md,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  list: {
    gap: spacing.md,
  },
  mealCard: {
    gap: spacing.md,
    padding: spacing.md,
  },
  mealHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mealHeaderButton: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    minHeight: 48,
  },
  mealHeaderLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chevronBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.panelSoft,
  },
  mealTitleBlock: {
    flex: 1,
  },
  mealLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  editButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  foodList: {
    borderRadius: 12,
    backgroundColor: 'rgba(21, 24, 39, 0.72)',
    overflow: 'hidden',
  },
  foodRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  foodRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  logMain: {
    flex: 1,
  },
  logRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  foodName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  foodKcal: {
    color: colors.yellow,
    fontSize: 14,
    fontWeight: '900',
  },
  deleteButton: {
    minHeight: 36,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kcal: {
    color: colors.yellow,
    fontWeight: '900',
  },
});
