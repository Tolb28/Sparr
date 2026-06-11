import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { GlassCard } from '@/components/ui/glass-card';
import { useThemeColors } from '@/src/hooks/useThemeColors';

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
  const c = useThemeColors();

  return (
    <GlassCard variant="medium" radius={14} padding={16}>
      <Text style={[styles.label, { color: c.text.primary }]}>Calendar Type</Text>
      <Text style={[styles.hint, { color: c.text.tertiary }]}>Choose how your training schedule is organised</Text>
      <View style={styles.row}>
        {OPTIONS.map((opt) => {
          const active = value === opt.key;
          return (
            <Pressable
              key={opt.key}
              style={[
                styles.option,
                { borderColor: c.glass.border, backgroundColor: c.glass.surface },
                active && { borderColor: c.primary.main, backgroundColor: c.glass.redSurface },
              ]}
              onPress={() => onChange(opt.key)}
            >
              <Text style={styles.icon}>{opt.icon}</Text>
              <Text style={[
                styles.optLabel,
                { color: active ? c.primary.main : c.text.secondary },
              ]}>
                {opt.label}
              </Text>
              <Text style={[
                styles.optDesc,
                { color: active ? c.text.secondary : c.text.tertiary },
              ]}>
                {opt.desc}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  hint: { fontSize: 12, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  option: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  icon: { fontSize: 22 },
  optLabel: { fontSize: 13, fontWeight: '700' },
  optDesc: { fontSize: 10, textAlign: 'center', lineHeight: 14 },
});
