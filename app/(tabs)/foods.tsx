import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Search, Save, Utensils } from 'lucide-react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Field } from '../../src/components/Form';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/Text';
import { createFood, getFoodsWithVariants, updateFoodAndVariant } from '../../src/lib/repository';
import { colors, spacing } from '../../src/lib/theme';
import type { FoodVariant, FoodWithVariants } from '../../src/lib/types';

export default function FoodsScreen() {
  const db = useSQLiteContext();
  const [foods, setFoods] = useState<FoodWithVariants[]>([]);
  const [query, setQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodWithVariants | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<FoodVariant | null>(null);
  const [form, setForm] = useState({
    name: '',
    category: '',
    label: 'Standard',
    kcalPer100g: '',
    proteinPer100g: '',
    carbsPer100g: '',
    fatPer100g: '',
  });

  const load = useCallback(async () => {
    setFoods(await getFoodsWithVariants(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filteredFoods = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized.length < 2) {
      return [];
    }

    return foods
      .filter((food) => `${food.name} ${food.category}`.toLowerCase().includes(normalized))
      .slice(0, 20);
  }, [foods, query]);

  function select(food: FoodWithVariants, variant = food.variants.find((item) => item.id === food.defaultVariantId) ?? food.variants[0]) {
    setSelectedFood(food);
    setSelectedVariant(variant);
    setForm({
      name: food.name,
      category: food.category,
      label: variant.label,
      kcalPer100g: String(variant.kcalPer100g),
      proteinPer100g: String(variant.proteinPer100g),
      carbsPer100g: String(variant.carbsPer100g),
      fatPer100g: String(variant.fatPer100g),
    });
  }

  function newFoodForm() {
    setSelectedFood(null);
    setSelectedVariant(null);
    setForm({
      name: '',
      category: '',
      label: 'Standard',
      kcalPer100g: '',
      proteinPer100g: '',
      carbsPer100g: '',
      fatPer100g: '',
    });
  }

  async function save() {
    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || 'Custom',
      label: form.label.trim() || 'Standard',
      kcalPer100g: Number(form.kcalPer100g),
      proteinPer100g: Number(form.proteinPer100g),
      carbsPer100g: Number(form.carbsPer100g),
      fatPer100g: Number(form.fatPer100g),
    };

    if (!payload.name || payload.kcalPer100g <= 0) {
      Alert.alert('Check food', 'Food name and calories per 100g are required.');
      return;
    }

    if (selectedFood && selectedVariant) {
      await updateFoodAndVariant(db, {
        foodId: selectedFood.id,
        variantId: selectedVariant.id,
        ...payload,
      });
      Alert.alert('Food updated', 'The selected food values were saved locally.');
    } else {
      await createFood(db, payload);
      Alert.alert('Food added', 'Your custom food is now available in meal logging.');
    }

    await load();
    newFoodForm();
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <AppText variant="eyebrow">Local database</AppText>
          <AppText variant="title">Foods</AppText>
        </View>
        <Button title="New" onPress={newFoodForm} variant="secondary" icon={<Utensils color={colors.blue} size={18} />} style={styles.newButton} />
      </View>

      <Card style={styles.editor}>
        <AppText variant="subtitle">{selectedFood ? 'Edit food values' : 'Add custom food'}</AppText>
        {selectedFood && selectedFood.variants.length > 1 ? (
          <View style={styles.variantPicker}>
            {selectedFood.variants.map((variant) => (
              <AppText
                key={variant.id}
                onPress={() => select(selectedFood, variant)}
                style={[styles.variantChip, selectedVariant?.id === variant.id && styles.variantChipSelected]}
              >
                {variant.label}
              </AppText>
            ))}
          </View>
        ) : null}
        <Field label="Food name" value={form.name} onChangeText={(name) => setForm((old) => ({ ...old, name }))} placeholder="Homemade jollof" />
        <Field label="Category" value={form.category} onChangeText={(category) => setForm((old) => ({ ...old, category }))} placeholder="Rice and grains" />
        <Field label="Variant label" value={form.label} onChangeText={(label) => setForm((old) => ({ ...old, label }))} placeholder="Visible oil" />
        <View style={styles.twoCols}>
          <Field label="Kcal / 100g" value={form.kcalPer100g} onChangeText={(kcalPer100g) => setForm((old) => ({ ...old, kcalPer100g }))} keyboardType="decimal-pad" />
          <Field label="Protein / 100g" value={form.proteinPer100g} onChangeText={(proteinPer100g) => setForm((old) => ({ ...old, proteinPer100g }))} keyboardType="decimal-pad" />
        </View>
        <View style={styles.twoCols}>
          <Field label="Carbs / 100g" value={form.carbsPer100g} onChangeText={(carbsPer100g) => setForm((old) => ({ ...old, carbsPer100g }))} keyboardType="decimal-pad" />
          <Field label="Fat / 100g" value={form.fatPer100g} onChangeText={(fatPer100g) => setForm((old) => ({ ...old, fatPer100g }))} keyboardType="decimal-pad" />
        </View>
        <Button title={selectedFood ? 'Save changes' : 'Add food'} onPress={save} icon={<Save color={colors.white} size={18} />} />
      </Card>

      <Card style={styles.searchCard}>
        <View style={styles.searchIcon}>
          <Search color={colors.faint} size={18} />
        </View>
        <Field label="Search foods to edit" value={query} onChangeText={setQuery} placeholder="Type at least 2 letters" />
        <AppText variant="muted">
          This page is for editing nutrition values. Use Add to build meals.
        </AppText>
      </Card>

      {query.trim().length < 2 ? (
        <EmptyState title="Search when you need it" body="The full database stays hidden so this screen does not become a long, noisy list." />
      ) : filteredFoods.length === 0 ? (
        <EmptyState title="No food found" body="Use the custom food form above to add your own per-100g values." />
      ) : (
        <View style={styles.list}>
          {filteredFoods.map((food) => {
            const defaultVariant = food.variants.find((item) => item.id === food.defaultVariantId) ?? food.variants[0];
            return (
              <Pressable key={food.id} onPress={() => select(food)}>
                <Card style={[styles.foodCard, selectedFood?.id === food.id && styles.selectedFood]}>
                  <View style={styles.foodMain}>
                    <AppText variant="subtitle">{food.name}</AppText>
                    <AppText variant="muted">
                      {food.category} · {food.isCustom ? 'Custom' : 'Seeded'} · {food.variants.length > 1 ? 'Oil options' : 'Standard'}
                    </AppText>
                  </View>
                  <AppText style={styles.kcal}>{Math.round(defaultVariant?.kcalPer100g ?? 0)} kcal/100g</AppText>
                </Card>
              </Pressable>
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
  newButton: {
    minWidth: 92,
  },
  editor: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  variantPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  twoCols: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  searchCard: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
  },
  searchIcon: {
    position: 'absolute',
    right: spacing.lg,
    top: spacing.lg,
    zIndex: 1,
  },
  list: {
    gap: spacing.md,
  },
  foodCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  selectedFood: {
    borderColor: colors.blue,
  },
  foodMain: {
    flex: 1,
  },
  kcal: {
    color: colors.yellow,
    fontWeight: '900',
  },
  variantChip: {
    overflow: 'hidden',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.muted,
    backgroundColor: colors.panelSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 11,
    fontWeight: '800',
  },
  variantChipSelected: {
    borderColor: colors.purple,
    color: colors.white,
    backgroundColor: 'rgba(168, 85, 247, 0.18)',
  },
});
