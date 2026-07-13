import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight, MinusCircle, Plus, Search, Utensils } from 'lucide-react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Field } from '../../src/components/Form';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/Text';
import { scaleMacro, scaleNutrition } from '../../src/lib/calculations';
import { addDays, dateFromLocalKey, localDateKey, mediumDateLabel } from '../../src/lib/dates';
import { addMealLog, deleteMealLogsForGroup, getFoodsWithVariants, getMealLogsForGroup } from '../../src/lib/repository';
import { colors, spacing } from '../../src/lib/theme';
import type { FoodVariant, FoodWithVariants, MealLog, MealType } from '../../src/lib/types';

type MealItem = {
  localId: string;
  food: FoodWithVariants;
  variant: FoodVariant;
  grams: string;
};

type AddMealParams = {
  loggedDate?: string | string[];
  mealGroupId?: string | string[];
  mealType?: string | string[];
};

const commonPortions: Record<string, { grams: number; label: string }> = {
  'Boiled egg': { grams: 50, label: '1 large egg is about 50g' },
  'Fried egg': { grams: 55, label: '1 fried egg is about 55g before extra oil' },
  'Moi moi': { grams: 150, label: '1 small wrap is about 150g' },
  'Okpa': { grams: 150, label: '1 small wrap is about 150g' },
  Akara: { grams: 100, label: '2-3 medium balls are about 100g' },
  'Meat pie': { grams: 150, label: '1 medium pie is about 150g' },
  'Fish roll': { grams: 120, label: '1 medium roll is about 120g' },
  'Sausage roll': { grams: 90, label: '1 roll is about 90g' },
  'Puff puff': { grams: 60, label: '2 medium pieces are about 60g' },
  Buns: { grams: 70, label: '1 medium bun is about 70g' },
  'Agege bread': { grams: 80, label: '1 thick chunk is about 80g' },
  'Tea bread': { grams: 80, label: '1 thick chunk is about 80g' },
  'Plantain chips': { grams: 50, label: '1 small pack is about 50g' },
  'Groundnut, roasted': { grams: 30, label: '1 small handful is about 30g' },
  'Kuli kuli': { grams: 30, label: '1 small handful is about 30g' },
  Banana: { grams: 118, label: '1 medium banana is about 118g' },
  Apple: { grams: 180, label: '1 medium apple is about 180g' },
  Orange: { grams: 130, label: '1 medium orange is about 130g' },
  Mango: { grams: 200, label: '1 medium mango portion is about 200g' },
};

function defaultVariant(food: FoodWithVariants) {
  return food.variants.find((item) => item.id === food.defaultVariantId) ?? food.variants[0];
}

function itemNutrition(item: MealItem) {
  const grams = Number(item.grams) || 0;
  return {
    grams,
    kcal: scaleNutrition(item.variant.kcalPer100g, grams),
    protein: scaleMacro(item.variant.proteinPer100g, grams),
    carbs: scaleMacro(item.variant.carbsPer100g, grams),
    fat: scaleMacro(item.variant.fatPer100g, grams),
  };
}

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function mealTypeFromParam(value: string | undefined) {
  return value === 'Meal' || value === 'Breakfast' || value === 'Lunch' || value === 'Dinner' || value === 'Snack' ? value : undefined;
}

function mealItemsFromLogs(logs: MealLog[], foods: FoodWithVariants[]) {
  return logs
    .map<MealItem | null>((log, index) => {
      const food = foods.find((item) => item.id === log.foodId);
      if (!food) {
        return null;
      }

      const variant = food.variants.find((item) => item.id === log.variantId) ?? defaultVariant(food);
      if (!variant) {
        return null;
      }

      return {
        localId: `edit-${log.id}-${index}`,
        food,
        variant,
        grams: String(log.grams),
      };
    })
    .filter((item): item is MealItem => item !== null);
}

function createEmptyMealState() {
  return {
    items: [] as MealItem[],
    query: '',
    editLoggedAt: null as string | null,
    loadedEditGroupId: null as string | null,
    mealType: 'Meal' as MealType,
  };
}

function loggedAtForDate(key: string | undefined) {
  if (!key || key === localDateKey()) {
    return undefined;
  }

  const date = dateFromLocalKey(key);
  const now = new Date();
  date.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return date.toISOString();
}

export default function AddMealScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<AddMealParams>();
  const scrollRef = useRef<ScrollView>(null);
  const loggedDateParam = paramValue(params.loggedDate);
  const editMealGroupId = paramValue(params.mealGroupId);
  const editMealType = mealTypeFromParam(paramValue(params.mealType));
  const [foods, setFoods] = useState<FoodWithVariants[]>([]);
  const [query, setQuery] = useState('');
  const [mealType, setMealType] = useState<MealType>('Meal');
  const [items, setItems] = useState<MealItem[]>([]);
  const [editLoggedAt, setEditLoggedAt] = useState<string | null>(null);
  const [loadedEditGroupId, setLoadedEditGroupId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => (loggedDateParam ? dateFromLocalKey(loggedDateParam) : new Date()));
  const isEditing = Boolean(editMealGroupId);
  const selectedDateKey = localDateKey(selectedDate);
  const todayKey = localDateKey();
  const isToday = selectedDateKey === todayKey;
  const isFuture = selectedDateKey > todayKey;
  const loggedDateLabel = isToday ? 'Today' : mediumDateLabel(selectedDate);

  const load = useCallback(async () => {
    setFoods(await getFoodsWithVariants(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
      if (!editMealGroupId) {
        requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
      }
    }, [editMealGroupId, load]),
  );

  useEffect(() => {
    if (!loggedDateParam) {
      return;
    }

    const nextDate = dateFromLocalKey(loggedDateParam);
    if (localDateKey(nextDate) !== selectedDateKey) {
      setSelectedDate(nextDate);
    }
  }, [loggedDateParam, selectedDateKey]);

  useEffect(() => {
    if (!editMealGroupId) {
      if (loadedEditGroupId) {
        setItems([]);
        setQuery('');
        setEditLoggedAt(null);
        setLoadedEditGroupId(null);
        setMealType('Meal');
        requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
      }
      return;
    }

    if (foods.length === 0 || loadedEditGroupId === editMealGroupId) {
      return;
    }

    const groupId = editMealGroupId;
    async function loadMealForEdit() {
      const logs = await getMealLogsForGroup(db, groupId, editMealType);
      if (logs.length === 0) {
        Alert.alert('Meal not found', 'This meal may have already been deleted.');
        router.replace('/add');
        return;
      }

      setMealType(logs[0].mealType);
      setEditLoggedAt(logs[0].loggedAt);
      setItems(mealItemsFromLogs(logs, foods));
      setQuery('');
      setLoadedEditGroupId(groupId);
    }

    loadMealForEdit();
  }, [db, editMealGroupId, editMealType, foods, loadedEditGroupId]);

  const normalizedQuery = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (normalizedQuery.length < 2) {
      return [];
    }

    return foods
      .filter((food) => `${food.name} ${food.category}`.toLowerCase().includes(normalizedQuery))
      .slice(0, 8);
  }, [foods, normalizedQuery]);

  const totals = items.reduce(
    (sum, item) => {
      const nutrition = itemNutrition(item);
      return {
        kcal: sum.kcal + nutrition.kcal,
        protein: sum.protein + nutrition.protein,
        carbs: sum.carbs + nutrition.carbs,
        fat: sum.fat + nutrition.fat,
      };
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  function addFood(food: FoodWithVariants) {
    const variant = defaultVariant(food);
    if (!variant) {
      return;
    }
    const portion = commonPortions[food.name];

    setItems((current) => [
      ...current,
      {
        localId: `${food.id}-${variant.id}-${Date.now()}-${current.length}`,
        food,
        variant,
        grams: String(portion?.grams ?? 100),
      },
    ]);
    setQuery('');
  }

  function updateItem(localId: string, updater: (item: MealItem) => MealItem) {
    setItems((current) => current.map((item) => (item.localId === localId ? updater(item) : item)));
  }

  function removeItem(localId: string) {
    setItems((current) => current.filter((item) => item.localId !== localId));
  }

  function selectDate(date: Date) {
    const key = localDateKey(date);
    setSelectedDate(date);
    router.setParams({ loggedDate: key });
  }

  async function saveMeal() {
    if (items.length === 0) {
      Alert.alert('Add food first', 'Search and add at least one food to this meal.');
      return;
    }

    const invalid = items.find((item) => itemNutrition(item).grams <= 0);
    if (invalid) {
      Alert.alert('Check grams', `${invalid.food.name} needs a valid gram amount.`);
      return;
    }

    const savedDateKey = selectedDateKey;
    const mealGroupId = editMealGroupId && !editMealGroupId.startsWith('legacy-')
      ? editMealGroupId
      : `meal-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    if (editMealGroupId) {
      await deleteMealLogsForGroup(db, editMealGroupId, editMealType);
    }

    for (const item of items) {
      const nutrition = itemNutrition(item);
      await addMealLog(db, {
        foodId: item.food.id,
        variantId: item.variant.id,
        foodNameSnapshot: item.food.name,
        variantLabelSnapshot: item.variant.label,
        grams: nutrition.grams,
        mealType,
        mealGroupId,
        loggedAt: editLoggedAt ?? loggedAtForDate(selectedDateKey),
        kcal: nutrition.kcal,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
      });
    }

    const emptyState = createEmptyMealState();
    setItems(emptyState.items);
    setQuery(emptyState.query);
    setEditLoggedAt(emptyState.editLoggedAt);
    setLoadedEditGroupId(emptyState.loadedEditGroupId);
    setMealType(emptyState.mealType);
    setSelectedDate(new Date());
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    router.setParams({ loggedDate: '', mealGroupId: '', mealType: '' });
    router.replace({ pathname: '/', params: { date: savedDateKey } });
  }

  return (
    <Screen scrollRef={scrollRef}>
      <View style={styles.header}>
        <AppText variant="eyebrow">Meal builder</AppText>
        <AppText variant="title">{isEditing ? 'Edit meal' : 'Create meal'}</AppText>
        <AppText variant="caption">{loggedDateLabel}</AppText>
      </View>

      {!isEditing ? (
        <View style={styles.dateBar}>
          <Pressable onPress={() => selectDate(addDays(selectedDate, -1))} style={styles.dateButton}>
            <ChevronLeft color={colors.text} size={18} />
          </Pressable>
          <Pressable onPress={() => selectDate(new Date())} style={styles.dateCenter}>
            <AppText style={styles.dateLabel}>{loggedDateLabel}</AppText>
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
      ) : null}

      <Card style={styles.topCard}>
        <View style={styles.searchIcon}>
          <Search color={colors.faint} size={18} />
        </View>
        <Field label="Search and add foods" value={query} onChangeText={setQuery} placeholder="Type at least 2 letters" />

        {normalizedQuery.length < 2 ? (
          <View style={styles.helperRow}>
            <Utensils color={colors.yellow} size={18} />
            <AppText variant="muted" style={styles.helperText}>
              Search a food, add it to this meal, then adjust grams or oil level.
            </AppText>
          </View>
        ) : null}
      </Card>

      {normalizedQuery.length >= 2 ? (
        <View style={styles.results}>
          {results.length === 0 ? (
            <Card>
              <AppText variant="subtitle">No match</AppText>
              <AppText variant="muted" style={styles.resultCopy}>
                Add this as a custom food from the Foods tab, then come back here to log it.
              </AppText>
              <Button title="Open Foods" onPress={() => router.push('/foods')} variant="secondary" />
            </Card>
          ) : (
            results.map((food) => {
              const variant = defaultVariant(food);
              return (
                <Pressable key={food.id} onPress={() => addFood(food)}>
                  <Card style={styles.resultRow}>
                    <View style={styles.resultText}>
                      <AppText variant="subtitle">{food.name}</AppText>
                      <AppText variant="muted">
                        {food.category} · {food.variants.length > 1 ? 'Oil options' : 'Standard'}
                      </AppText>
                    </View>
                    <View style={styles.addPill}>
                      <Plus color={colors.ink} size={16} />
                      <AppText style={styles.addPillText}>{Math.round(variant?.kcalPer100g ?? 0)} /100g</AppText>
                    </View>
                  </Card>
                </Pressable>
              );
            })
          )}
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">This meal</AppText>
        <AppText variant="caption">{items.length} food{items.length === 1 ? '' : 's'}</AppText>
      </View>

      {items.length === 0 ? (
        <EmptyState title="Start with search" body="Add rice, soup, protein, snacks, or drinks into one meal before saving." />
      ) : (
        <View style={styles.itemList}>
          {items.map((item) => {
            const nutrition = itemNutrition(item);
            return (
              <Card key={item.localId} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemTitle}>
                    <AppText variant="subtitle">{item.food.name}</AppText>
                    <AppText variant="muted">
                      {item.food.category} · {Math.round(item.variant.kcalPer100g)} kcal/100g
                    </AppText>
                  </View>
                  <Pressable onPress={() => removeItem(item.localId)} hitSlop={10}>
                    <MinusCircle color={colors.red} size={20} />
                  </Pressable>
                </View>

                {item.food.variants.length > 1 ? (
                  <View style={styles.compactChips}>
                    {item.food.variants.map((variant) => (
                      <AppText
                        key={variant.id}
                        onPress={() => updateItem(item.localId, (old) => ({ ...old, variant }))}
                        style={[styles.compactChip, item.variant.id === variant.id && styles.compactChipSelected]}
                      >
                        {variant.label}
                      </AppText>
                    ))}
                  </View>
                ) : null}

                <View style={styles.itemBottom}>
                  <View style={styles.gramsBox}>
                    <Field
                      label="Grams"
                      value={item.grams}
                      onChangeText={(grams) => updateItem(item.localId, (old) => ({ ...old, grams }))}
                      keyboardType="decimal-pad"
                    />
                    {commonPortions[item.food.name] ? (
                      <AppText variant="caption">{commonPortions[item.food.name].label}</AppText>
                    ) : null}
                  </View>
                  <View style={styles.itemMacros}>
                    <AppText style={styles.itemKcal}>{nutrition.kcal} kcal</AppText>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      )}

      <Card style={styles.totalCard}>
        <View>
          <AppText variant="caption">Meal total</AppText>
          <AppText variant="metric">{totals.kcal} kcal</AppText>
        </View>
        <Button title={isEditing ? 'Update meal' : 'Save meal'} onPress={saveMeal} disabled={items.length === 0} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.md,
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
  topCard: {
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
  },
  searchIcon: {
    position: 'absolute',
    right: spacing.lg,
    top: 42,
    zIndex: 1,
  },
  helperRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  helperText: {
    flex: 1,
  },
  results: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  resultRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  resultText: {
    flex: 1,
  },
  resultCopy: {
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  addPill: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.yellow,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  addPillText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  itemList: {
    gap: spacing.md,
  },
  itemCard: {
    gap: spacing.md,
    padding: spacing.md,
  },
  itemHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  itemTitle: {
    flex: 1,
  },
  compactChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  compactChip: {
    overflow: 'hidden',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
    color: colors.muted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 11,
    fontWeight: '800',
  },
  compactChipSelected: {
    borderColor: colors.purple,
    color: colors.white,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  itemBottom: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.md,
  },
  gramsBox: {
    flex: 1,
  },
  itemMacros: {
    alignItems: 'flex-end',
    flex: 1,
    paddingBottom: spacing.md,
  },
  itemKcal: {
    color: colors.yellow,
    fontSize: 18,
    fontWeight: '900',
  },
  totalCard: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
