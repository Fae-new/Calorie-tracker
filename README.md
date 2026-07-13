# Fae

A simple, local-first calorie and weight tracker built around common Nigerian foods.

## What It Does

- Builds meals from a searchable catalogue of 115 foods.
- Calculates calories and macros from the weight of each food in grams.
- Provides minimal oil, visible oil, and very oily estimates for recipe-sensitive foods.
- Groups foods into editable daily meals.
- Supports logging and editing meals on previous dates.
- Tracks weight and displays a focused 70-100 kg trend chart.
- Lets you set your own daily calorie target.
- Imports meal and weight history from a Fae JSON file.
- Stores everything locally on the device with SQLite.

Nutrition values are editable estimates. Prepared meals can vary significantly by recipe,
water content, meat cut, and oil quantity.

## Tech Stack

- Expo React Native
- TypeScript
- Expo Router
- Expo SQLite
- React Native Gifted Charts
- Lucide React Native icons

## Run Locally

```bash
npm install
npm start
```

For Android preview:

```bash
npm run android
```

For web smoke testing:

```bash
npm run web
```

The app uses metric units: kilograms, centimetres, grams, and kilocalories.

## Build an APK

Install EAS CLI if needed:

```bash
npm install -g eas-cli
```

Then create an Android preview build:

```bash
eas build -p android --profile preview
```

The Android package id is `com.fae.app`.

## Local Data

Fae has no account system or backend. Profile details, food edits, meals, and weight logs
remain in the device's SQLite database. Personal import files and generated APKs are
intentionally excluded from this repository.
