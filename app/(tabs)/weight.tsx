import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Field } from '../../src/components/Form';
import { Screen } from '../../src/components/Screen';
import { StatCard } from '../../src/components/StatCard';
import { AppText } from '../../src/components/Text';
import { addWeightLog, deleteWeightLog, getWeightLogs } from '../../src/lib/repository';
import { formatWeightKg } from '../../src/lib/format';
import { colors, spacing } from '../../src/lib/theme';
import type { WeightLog } from '../../src/lib/types';

export default function WeightScreen() {
  const db = useSQLiteContext();
  const [weightKg, setWeightKg] = useState('');
  const [note, setNote] = useState('');
  const [logs, setLogs] = useState<WeightLog[]>([]);

  const load = useCallback(async () => {
    const rows = await getWeightLogs(db);
    setLogs(rows.reverse());
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const latest = logs[0];
  const oldest = logs[logs.length - 1];
  const change = latest && oldest ? latest.weightKg - oldest.weightKg : 0;

  async function save() {
    const parsed = Number(weightKg);
    if (parsed <= 0) {
      Alert.alert('Check weight', 'Enter a valid weight in kg.');
      return;
    }

    await addWeightLog(db, parsed, note);
    setWeightKg('');
    setNote('');
    load();
  }

  async function remove(id: number) {
    await deleteWeightLog(db, id);
    load();
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="eyebrow">Body trend</AppText>
        <AppText variant="title">Weight</AppText>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Current" value={latest ? formatWeightKg(latest.weightKg) : '-'} tone="blue" />
        <StatCard
          label="All-time change"
          value={logs.length > 1 ? `${change >= 0 ? '+' : ''}${formatWeightKg(change)}` : '-'}
          tone={change <= 0 ? 'green' : 'yellow'}
        />
      </View>

      <Card>
        <Field label="Weight kg" value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" placeholder="75.5" />
        <Field label="Note" value={note} onChangeText={setNote} placeholder="Morning weigh-in" />
        <Button title="Log weight" onPress={save} icon={<Plus color={colors.white} size={18} />} />
      </Card>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">History</AppText>
        <AppText variant="caption">{logs.length} entries</AppText>
      </View>

      {logs.length === 0 ? (
        <EmptyState title="No weights logged" body="Add a few weigh-ins and the Analytics tab will draw your trend." />
      ) : (
        <View style={styles.list}>
          {logs.map((log) => (
            <Card key={log.id} style={styles.row}>
              <View style={styles.rowMain}>
                <AppText variant="subtitle">{formatWeightKg(log.weightKg)}</AppText>
                <AppText variant="muted">
                  {new Date(log.loggedAt).toLocaleDateString()} {log.note ? `· ${log.note}` : ''}
                </AppText>
              </View>
              <Pressable onPress={() => remove(log.id)} hitSlop={10}>
                <Trash2 color={colors.faint} size={18} />
              </Pressable>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  list: {
    gap: spacing.md,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  rowMain: {
    flex: 1,
  },
});
