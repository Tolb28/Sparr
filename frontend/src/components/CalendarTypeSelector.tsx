import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { GlassCard } from '@/components/ui/glass-card';
import { colors } from '@/src/theme/colors';

interface CalendarTypeSelectorProps {
  value: 'day' | 'order';
  onChange: (type: 'day' | 'order') => void;
}

const OPTIONS = [
  {
    key: 'day' as const,
    icon: '📅',
    label: 'Day-based',
    desc: 'Assign trainings to specific weekdays. Great for fixed weekly routines.',
  },
  {
    key: 'order' as const,
    icon: '🔁',
    label: 'Order-based',
    desc: 'Trainings cycle in a fixed order from a start date.',
  },
];

export default function CalendarTypeSelector({ value, onChange }: CalendarTypeSelectorProps) {
  return (
    <GlassCard variant="medium" radius={14} padding={16}>
      <Text style={styles.label}>Calendar Type</Text>
      <Text style={styles.hint}>Choose how your training schedule is organised</Text>
      <View style={styles.row}>
        {OPTIONS.map((opt) => {
          const active = value === opt.key;
          return (
            <Pressable
              key={opt.key}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => onChange(opt.key)}
            >
              <Text style={styles.icon}>{opt.icon}</Text>
              <Text style={[styles.optLabel, active && styles.optLabelActive]}>{opt.label}</Text>
              <Text style={[styles.optDesc, active && styles.optDescActive]}>{opt.desc}</Text>
            </Pressable>
          );
        })}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.text.primary, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  hint: { color: colors.text.tertiary, fontSize: 12, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  option: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glass.border,
    backgroundColor: colors.glass.surface,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  optionActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.glass.redSurface,
  },
  icon: { fontSize: 22 },
  optLabel: { color: colors.text.secondary, fontSize: 13, fontWeight: '700' },
  optLabelActive: { color: colors.primary.main },
  optDesc: { color: colors.text.tertiary, fontSize: 10, textAlign: 'center', lineHeight: 14 },
  optDescActive: { color: colors.text.secondary },
});
