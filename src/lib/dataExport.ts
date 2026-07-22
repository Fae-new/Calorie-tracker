import type { SQLiteDatabase } from 'expo-sqlite';

import type { Food, FoodVariant, MealLog, Profile, WeightLog } from './types';

export const FAE_EXPORT_FORMAT = 'fae-data-export';
export const FAE_EXPORT_VERSION = 1;

export type FaeDataExport = {
  format: typeof FAE_EXPORT_FORMAT;
  version: typeof FAE_EXPORT_VERSION;
  exportedAt: string;
  foods: Array<Food & { variants: FoodVariant[] }>;
  mealLogs: MealLog[];
  weightLogs: WeightLog[];
  profile: Profile | null;
};

export async function createFaeDataExport(db: SQLiteDatabase): Promise<FaeDataExport> {
  const [foods, variants, mealLogs, weightLogs, profile] = await Promise.all([
    db.getAllAsync<Food>('SELECT * FROM foods ORDER BY category, name'),
    db.getAllAsync<FoodVariant>('SELECT * FROM food_variants ORDER BY foodId, isDefault DESC, label'),
    db.getAllAsync<MealLog>('SELECT * FROM meal_logs ORDER BY loggedAt ASC, id ASC'),
    db.getAllAsync<WeightLog>('SELECT * FROM weight_logs ORDER BY loggedAt ASC, id ASC'),
    db.getFirstAsync<Profile>('SELECT * FROM profile WHERE id = 1'),
  ]);

  return {
    format: FAE_EXPORT_FORMAT,
    version: FAE_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    foods: foods.map((food) => ({
      ...food,
      variants: variants.filter((variant) => variant.foodId === food.id),
    })),
    mealLogs,
    weightLogs,
    profile: profile ?? null,
  };
}
