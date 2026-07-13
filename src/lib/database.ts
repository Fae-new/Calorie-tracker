import type { SQLiteDatabase } from 'expo-sqlite';

import { seedFoods } from '../data/foods';

const DATABASE_VERSION = 2;

export async function migrateDatabase(db: SQLiteDatabase) {
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = versionRow?.user_version ?? 0;

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      defaultVariantId INTEGER,
      isCustom INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS food_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      foodId INTEGER NOT NULL,
      label TEXT NOT NULL,
      kcalPer100g REAL NOT NULL,
      proteinPer100g REAL NOT NULL,
      carbsPer100g REAL NOT NULL,
      fatPer100g REAL NOT NULL,
      isDefault INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (foodId) REFERENCES foods(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS meal_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      foodId INTEGER,
      variantId INTEGER,
      foodNameSnapshot TEXT NOT NULL,
      variantLabelSnapshot TEXT NOT NULL,
      grams REAL NOT NULL,
      mealType TEXT NOT NULL,
      mealGroupId TEXT,
      loggedAt TEXT NOT NULL,
      kcal REAL NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fat REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS weight_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      weightKg REAL NOT NULL,
      loggedAt TEXT NOT NULL,
      note TEXT
    );
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      age INTEGER NOT NULL,
      sex TEXT NOT NULL,
      heightCm REAL NOT NULL,
      weightKg REAL NOT NULL,
      activityLevel TEXT NOT NULL,
      goal TEXT NOT NULL,
      targetCalories INTEGER NOT NULL,
      maintenanceCalories INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  await ensureColumn(db, 'meal_logs', 'mealGroupId', 'ALTER TABLE meal_logs ADD COLUMN mealGroupId TEXT');

  const countRow = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM foods');
  if ((countRow?.count ?? 0) === 0) {
    await seedFoodDatabase(db);
  }

  if (currentVersion < DATABASE_VERSION) {
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  }
}

async function ensureColumn(db: SQLiteDatabase, tableName: string, columnName: string, alterSql: string) {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);
  if (!columns.some((column) => column.name === columnName)) {
    await db.execAsync(alterSql);
  }
}

async function seedFoodDatabase(db: SQLiteDatabase) {
  for (const food of seedFoods) {
    const foodResult = await db.runAsync(
      'INSERT INTO foods (name, category, isCustom) VALUES (?, ?, 0)',
      food.name,
      food.category,
    );

    let defaultVariantId: number | null = null;
    for (const variant of food.variants) {
      const variantResult = await db.runAsync(
        `INSERT INTO food_variants
          (foodId, label, kcalPer100g, proteinPer100g, carbsPer100g, fatPer100g, isDefault)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
        foodResult.lastInsertRowId,
        variant.label,
        variant.kcalPer100g,
        variant.proteinPer100g,
        variant.carbsPer100g,
        variant.fatPer100g,
        variant.isDefault ? 1 : 0,
      );

      if (variant.isDefault || defaultVariantId === null) {
        defaultVariantId = variantResult.lastInsertRowId;
      }
    }

    await db.runAsync(
      'UPDATE foods SET defaultVariantId = ? WHERE id = ?',
      defaultVariantId,
      foodResult.lastInsertRowId,
    );
  }
}
