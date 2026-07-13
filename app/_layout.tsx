import { Suspense } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { migrateDatabase } from '../src/lib/database';
import { colors } from '../src/lib/theme';

const databaseName =
  Platform.OS === 'web' ? `fae-web-${Date.now()}-${Math.random().toString(36).slice(2)}.db` : 'fae.db';

function LoadingFallback() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink }}>
      <ActivityIndicator color={colors.blue} size="large" />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Suspense fallback={<LoadingFallback />}>
        <SQLiteProvider databaseName={databaseName} onInit={migrateDatabase} useSuspense>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ink } }} />
        </SQLiteProvider>
      </Suspense>
    </SafeAreaProvider>
  );
}
