import type { ActivityLevel, Goal, Sex } from './types';

export const activityMultipliers: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

export const activityLabels: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary',
  light: 'Light',
  moderate: 'Moderate',
  active: 'Active',
  athlete: 'Athlete',
};

export const goalLabels: Record<Goal, string> = {
  maintain: 'Maintain',
  cut: 'Cut',
  bulk: 'Bulk',
};

export function calculateMaintenanceCalories(params: {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
}) {
  const base =
    10 * params.weightKg +
    6.25 * params.heightCm -
    5 * params.age +
    (params.sex === 'male' ? 5 : -161);

  return Math.round(base * activityMultipliers[params.activityLevel]);
}

export function calculateTargetCalories(maintenanceCalories: number, goal: Goal) {
  if (goal === 'cut') {
    return Math.max(1200, maintenanceCalories - 400);
  }

  if (goal === 'bulk') {
    return maintenanceCalories + 300;
  }

  return maintenanceCalories;
}

export function scaleNutrition(per100g: number, grams: number) {
  return Math.round((per100g * grams) / 100);
}

export function scaleMacro(per100g: number, grams: number) {
  return Number(((per100g * grams) / 100).toFixed(1));
}
