import type { SQLiteDatabase } from 'expo-sqlite';

import { calculateMaintenanceCalories, calculateTargetCalories } from './calculations';
import type { ActivityLevel, Food, FoodVariant, FoodWithVariants, Goal, MealLog, MealType, Profile, Sex, WeightLog } from './types';

export async function getProfile(db: SQLiteDatabase) {
  return db.getFirstAsync<Profile>('SELECT * FROM profile WHERE id = 1');
}

export async function saveProfile(
  db: SQLiteDatabase,
  payload: {
    age: number;
    sex: Sex;
    heightCm: number;
    weightKg: number;
    activityLevel: ActivityLevel;
    goal: Goal;
    targetCalories?: number;
  },
) {
  const maintenanceCalories = calculateMaintenanceCalories(payload);
  const calculatedTargetCalories = calculateTargetCalories(maintenanceCalories, payload.goal);
  const targetCalories = payload.targetCalories && payload.targetCalories > 0 ? Math.round(payload.targetCalories) : calculatedTargetCalories;
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO profile
      (id, age, sex, heightCm, weightKg, activityLevel, goal, targetCalories, maintenanceCalories, createdAt, updatedAt)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        age = excluded.age,
        sex = excluded.sex,
        heightCm = excluded.heightCm,
        weightKg = excluded.weightKg,
        activityLevel = excluded.activityLevel,
        goal = excluded.goal,
        targetCalories = excluded.targetCalories,
        maintenanceCalories = excluded.maintenanceCalories,
        updatedAt = excluded.updatedAt`,
    payload.age,
    payload.sex,
    payload.heightCm,
    payload.weightKg,
    payload.activityLevel,
    payload.goal,
    targetCalories,
    maintenanceCalories,
    now,
    now,
  );

  return { maintenanceCalories, targetCalories };
}

export async function getFoodsWithVariants(db: SQLiteDatabase, query = '') {
  const like = `%${query.trim()}%`;
  const foods = await db.getAllAsync<Food>(
    query.trim()
      ? 'SELECT * FROM foods WHERE name LIKE ? OR category LIKE ? ORDER BY category, name'
      : 'SELECT * FROM foods ORDER BY category, name',
    ...(query.trim() ? [like, like] : []),
  );

  if (foods.length === 0) {
    return [];
  }

  const variants = await db.getAllAsync<FoodVariant>(
    `SELECT * FROM food_variants
     WHERE foodId IN (${foods.map(() => '?').join(',')})
     ORDER BY isDefault DESC, label`,
    ...foods.map((food) => food.id),
  );

  return foods.map<FoodWithVariants>((food) => ({
    ...food,
    variants: variants.filter((variant) => variant.foodId === food.id),
  }));
}

export async function createFood(db: SQLiteDatabase, payload: {
  name: string;
  category: string;
  label: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}) {
  const foodResult = await db.runAsync(
    'INSERT INTO foods (name, category, isCustom) VALUES (?, ?, 1)',
    payload.name.trim(),
    payload.category.trim() || 'Custom',
  );
  const variantResult = await db.runAsync(
    `INSERT INTO food_variants
      (foodId, label, kcalPer100g, proteinPer100g, carbsPer100g, fatPer100g, isDefault)
      VALUES (?, ?, ?, ?, ?, ?, 1)`,
    foodResult.lastInsertRowId,
    payload.label.trim() || 'Standard',
    payload.kcalPer100g,
    payload.proteinPer100g,
    payload.carbsPer100g,
    payload.fatPer100g,
  );

  await db.runAsync('UPDATE foods SET defaultVariantId = ? WHERE id = ?', variantResult.lastInsertRowId, foodResult.lastInsertRowId);
}

export async function updateFoodAndVariant(db: SQLiteDatabase, payload: {
  foodId: number;
  variantId: number;
  name: string;
  category: string;
  label: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}) {
  await db.runAsync('UPDATE foods SET name = ?, category = ? WHERE id = ?', payload.name.trim(), payload.category.trim(), payload.foodId);
  await db.runAsync(
    `UPDATE food_variants
     SET label = ?, kcalPer100g = ?, proteinPer100g = ?, carbsPer100g = ?, fatPer100g = ?
     WHERE id = ?`,
    payload.label.trim(),
    payload.kcalPer100g,
    payload.proteinPer100g,
    payload.carbsPer100g,
    payload.fatPer100g,
    payload.variantId,
  );
}

export async function addMealLog(db: SQLiteDatabase, payload: {
  foodId: number | null;
  variantId: number | null;
  foodNameSnapshot: string;
  variantLabelSnapshot: string;
  grams: number;
  mealType: MealType;
  mealGroupId?: string;
  loggedAt?: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}) {
  await db.runAsync(
    `INSERT INTO meal_logs
      (foodId, variantId, foodNameSnapshot, variantLabelSnapshot, grams, mealType, mealGroupId, loggedAt, kcal, protein, carbs, fat)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    payload.foodId,
    payload.variantId,
    payload.foodNameSnapshot,
    payload.variantLabelSnapshot,
    payload.grams,
    payload.mealType,
    payload.mealGroupId ?? null,
    payload.loggedAt ?? new Date().toISOString(),
    payload.kcal,
    payload.protein,
    payload.carbs,
    payload.fat,
  );
}

export async function getMealLogsForRange(db: SQLiteDatabase, startIso: string, endIso: string) {
  return db.getAllAsync<MealLog>(
    'SELECT * FROM meal_logs WHERE loggedAt >= ? AND loggedAt <= ? ORDER BY loggedAt DESC',
    startIso,
    endIso,
  );
}

export async function getMealLogsForGroup(db: SQLiteDatabase, mealGroupId: string, legacyMealType?: MealType) {
  if (mealGroupId.startsWith('legacy-')) {
    return db.getAllAsync<MealLog>(
      'SELECT * FROM meal_logs WHERE mealGroupId IS NULL AND mealType = ? ORDER BY loggedAt ASC',
      legacyMealType ?? mealGroupId.replace('legacy-', ''),
    );
  }

  return db.getAllAsync<MealLog>(
    'SELECT * FROM meal_logs WHERE mealGroupId = ? ORDER BY loggedAt ASC',
    mealGroupId,
  );
}

export async function deleteMealLogsForGroup(db: SQLiteDatabase, mealGroupId: string, legacyMealType?: MealType) {
  if (mealGroupId.startsWith('legacy-')) {
    await db.runAsync(
      'DELETE FROM meal_logs WHERE mealGroupId IS NULL AND mealType = ?',
      legacyMealType ?? mealGroupId.replace('legacy-', ''),
    );
    return;
  }

  await db.runAsync('DELETE FROM meal_logs WHERE mealGroupId = ?', mealGroupId);
}

export async function deleteMealLog(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM meal_logs WHERE id = ?', id);
}

export async function getDailyCalories(db: SQLiteDatabase, startIso: string | null) {
  const params = startIso ? [startIso] : [];
  return db.getAllAsync<{ day: string; kcal: number; protein: number; carbs: number; fat: number }>(
    `SELECT substr(loggedAt, 1, 10) as day,
      SUM(kcal) as kcal,
      SUM(protein) as protein,
      SUM(carbs) as carbs,
      SUM(fat) as fat
     FROM meal_logs
     ${startIso ? 'WHERE loggedAt >= ?' : ''}
     GROUP BY day
     ORDER BY day ASC`,
    ...params,
  );
}

export async function addWeightLog(db: SQLiteDatabase, weightKg: number, note: string, loggedAt?: string) {
  await db.runAsync(
    'INSERT INTO weight_logs (weightKg, loggedAt, note) VALUES (?, ?, ?)',
    weightKg,
    loggedAt ?? new Date().toISOString(),
    note.trim() || null,
  );
}

export async function getWeightLogs(db: SQLiteDatabase, startIso: string | null = null) {
  const params = startIso ? [startIso] : [];
  return db.getAllAsync<WeightLog>(
    `SELECT * FROM weight_logs ${startIso ? 'WHERE loggedAt >= ?' : ''} ORDER BY loggedAt ASC`,
    ...params,
  );
}

export async function deleteWeightLog(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM weight_logs WHERE id = ?', id);
}
