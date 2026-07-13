export type Sex = 'male' | 'female';
export type Goal = 'maintain' | 'cut' | 'bulk';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
export type MealType = 'Meal' | 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export type Food = {
  id: number;
  name: string;
  category: string;
  defaultVariantId: number | null;
  isCustom: number;
};

export type FoodVariant = {
  id: number;
  foodId: number;
  label: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  isDefault: number;
};

export type FoodWithVariants = Food & {
  variants: FoodVariant[];
};

export type MealLog = {
  id: number;
  foodId: number | null;
  variantId: number | null;
  foodNameSnapshot: string;
  variantLabelSnapshot: string;
  grams: number;
  mealType: MealType;
  mealGroupId: string | null;
  loggedAt: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type WeightLog = {
  id: number;
  weightKg: number;
  loggedAt: string;
  note: string | null;
};

export type Profile = {
  id: number;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  targetCalories: number;
  maintenanceCalories: number;
  createdAt: string;
  updatedAt: string;
};
