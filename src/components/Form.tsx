import { StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, spacing } from '../lib/theme';
import { AppText } from './Text';

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  multiline?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Field({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline, style }: FieldProps) {
  return (
    <View style={[styles.field, style]}>
      <AppText variant="caption">{label}</AppText>
      <TextInput
        maxFontSizeMultiplier={1.12}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

type SegmentedProps<T extends string> = {
  label?: string;
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <View style={styles.field}>
      {label ? <AppText variant="caption">{label}</AppText> : null}
      <View style={styles.segmented}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <AppText
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.segment, selected && styles.segmentSelected]}
            >
              {option.label}
            </AppText>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  input: {
    minHeight: 48,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    fontWeight: '600',
  },
  multiline: {
    minHeight: 84,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  segmented: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  segment: {
    overflow: 'hidden',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
    color: colors.muted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 13,
    fontWeight: '800',
  },
  segmentSelected: {
    color: colors.white,
    borderColor: colors.blue,
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
  },
});
