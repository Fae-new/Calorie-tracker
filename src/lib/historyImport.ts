import type { SQLiteDatabase } from 'expo-sqlite';

import { scaleMacro, scaleNutrition } from './calculations';
import { endOfDayIso, startOfDayIso } from './dates';
import { addMealLog, addWeightLog, createFood, getFoodsWithVariants } from './repository';
import type { FoodWithVariants } from './types';

type ImportVariant = {
  label: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

type ImportFood = {
  name: string;
  category?: string;
  variants?: ImportVariant[];
};

type ImportItem = {
  foodName?: string;
  variantLabel?: string;
  grams?: number;
  raw?: string;
  manualKcal?: number;
  label?: string;
  mode?: 'dayTotalOverride' | string;
};

type ImportEntry = {
  date: string;
  weightKg?: number;
  meals?: Array<{ items?: ImportItem[] }>;
};

type ImportFile = {
  customFoods?: ImportFood[];
  entries?: ImportEntry[];
};

export type HistoryImportResult = {
  daysSeen: number;
  mealDaysImported: number;
  mealDaysSkipped: number;
  mealItemsImported: number;
  weightsImported: number;
  weightsSkipped: number;
  missingFoods: string[];
};

function localNoonIso(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0).toISOString();
}

function assertDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function findFood(foods: FoodWithVariants[], name: string) {
  const normalized = normalize(name);
  return foods.find((food) => normalize(food.name) === normalized);
}

function findVariant(food: FoodWithVariants, label?: string) {
  if (label) {
    const normalized = normalize(label);
    const variant = food.variants.find((item) => normalize(item.label) === normalized);
    if (variant) {
      return variant;
    }
  }

  return food.variants.find((item) => item.id === food.defaultVariantId) ?? food.variants[0];
}

async function ensureCustomFoods(db: SQLiteDatabase, customFoods: ImportFood[] | undefined) {
  if (!customFoods?.length) {
    return;
  }

  const existing = await getFoodsWithVariants(db);
  for (const food of customFoods) {
    if (!food.name || findFood(existing, food.name)) {
      continue;
    }

    const variant = food.variants?.[0];
    if (!variant) {
      continue;
    }

    await createFood(db, {
      name: food.name,
      category: food.category ?? 'Imported',
      label: variant.label || 'Standard',
      kcalPer100g: Number(variant.kcalPer100g) || 0,
      proteinPer100g: Number(variant.proteinPer100g) || 0,
      carbsPer100g: Number(variant.carbsPer100g) || 0,
      fatPer100g: Number(variant.fatPer100g) || 0,
    });
  }
}

async function hasLogsForDate(db: SQLiteDatabase, table: 'meal_logs' | 'weight_logs', dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${table} WHERE loggedAt >= ? AND loggedAt <= ?`,
    startOfDayIso(date),
    endOfDayIso(date),
  );
  return (row?.count ?? 0) > 0;
}

function parseImport(jsonText: string): ImportFile {
  const parsed = JSON.parse(jsonText) as ImportFile;
  if (!parsed || !Array.isArray(parsed.entries)) {
    throw new Error('This file does not look like a Fae import JSON.');
  }
  return parsed;
}

export async function importHistoryFromJson(db: SQLiteDatabase, jsonText: string): Promise<HistoryImportResult> {
  const data = parseImport(jsonText);
  await ensureCustomFoods(db, data.customFoods);

  const foods = await getFoodsWithVariants(db);
  const missingFoods = new Set<string>();
  const result: HistoryImportResult = {
    daysSeen: data.entries?.length ?? 0,
    mealDaysImported: 0,
    mealDaysSkipped: 0,
    mealItemsImported: 0,
    weightsImported: 0,
    weightsSkipped: 0,
    missingFoods: [],
  };

  for (const entry of data.entries ?? []) {
    if (!assertDateKey(entry.date)) {
      continue;
    }

    const loggedAt = localNoonIso(entry.date);

    if (typeof entry.weightKg === 'number' && entry.weightKg > 0) {
      if (await hasLogsForDate(db, 'weight_logs', entry.date)) {
        result.weightsSkipped += 1;
      } else {
        await addWeightLog(db, entry.weightKg, 'Imported', loggedAt);
        result.weightsImported += 1;
      }
    }

    const mealItems = (entry.meals ?? []).flatMap((meal) => meal.items ?? []);
    if (mealItems.length === 0) {
      continue;
    }

    if (await hasLogsForDate(db, 'meal_logs', entry.date)) {
      result.mealDaysSkipped += 1;
      continue;
    }

    const override = mealItems.find((item) => item.mode === 'dayTotalOverride' && typeof item.manualKcal === 'number');
    const itemsToImport = override ? [override] : mealItems;
    const mealGroupId = `import-${entry.date}-${Date.now()}`;
    let importedForDay = 0;

    for (const item of itemsToImport) {
      if (typeof item.manualKcal === 'number' && item.manualKcal > 0) {
        await addMealLog(db, {
          foodId: null,
          variantId: null,
          foodNameSnapshot: item.label || item.raw || 'Imported calories',
          variantLabelSnapshot: 'Manual',
          grams: 0,
          mealType: 'Meal',
          mealGroupId,
          loggedAt,
          kcal: item.manualKcal,
          protein: 0,
          carbs: 0,
          fat: 0,
        });
        importedForDay += 1;
        continue;
      }

      if (!item.foodName || typeof item.grams !== 'number' || item.grams <= 0) {
        continue;
      }

      const food = findFood(foods, item.foodName);
      if (!food) {
        missingFoods.add(item.foodName);
        continue;
      }

      const variant = findVariant(food, item.variantLabel);
      if (!variant) {
        missingFoods.add(`${item.foodName} (${item.variantLabel ?? 'default'})`);
        continue;
      }

      await addMealLog(db, {
        foodId: food.id,
        variantId: variant.id,
        foodNameSnapshot: food.name,
        variantLabelSnapshot: variant.label,
        grams: item.grams,
        mealType: 'Meal',
        mealGroupId,
        loggedAt,
        kcal: scaleNutrition(variant.kcalPer100g, item.grams),
        protein: scaleMacro(variant.proteinPer100g, item.grams),
        carbs: scaleMacro(variant.carbsPer100g, item.grams),
        fat: scaleMacro(variant.fatPer100g, item.grams),
      });
      importedForDay += 1;
    }

    if (importedForDay > 0) {
      result.mealDaysImported += 1;
      result.mealItemsImported += importedForDay;
    }
  }

  result.missingFoods = Array.from(missingFoods).sort();
  return result;
}
