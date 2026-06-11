import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { GlassCard } from '@/components/ui/glass-card';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import TrainingPreviewCard from './TrainingPreviewCard';
import TimePicker from './TimePicker';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface DaySlot {
  id_trainings: number;
  title: string;
  component_count: number;
  estimated_duration_seconds: number;
  start_time: string | null;
  // local-only key for list rendering
  _key?: string;
}

interface WeekDayGridProps {
  numWeeks: number;
  /** week_number (1-based) → day_of_week (0-6) → DaySlot[] */
  schedule: Record<number, Record<number, DaySlot[]>>;
  activeWeek: number;
  onWeekChange: (week: number) => void;
  onAddTraining: (weekNumber: number, dayOfWeek: number) => void;
  onRemoveSlot: (weekNumber: number, dayOfWeek: number, slotIndex: number) => void;
  onTimeChange: (weekNumber: number, dayOfWeek: number, slotIndex: number, time: string | null) => void;
}

export default function WeekDayGrid({
  numWeeks,
  schedule,
  activeWeek,
  onWeekChange,
  onAddTraining,
  onRemoveSlot,
  onTimeChange,
}: WeekDayGridProps) {
  const c = useThemeColors();
  return (
    <GlassCard variant="medium" radius={14} padding={16}>
      <Text style={[styles.label, { color: c.text.primary }]}>Weekly Schedule</Text>
      <Text style={[styles.hint, { color: c.text.tertiary }]}>Tap a day to add trainings. Unassigned days are rest days.</Text>

      {/* Week tabs */}
      {numWeeks > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekTabs}>
          {Array.from({ length: numWeeks }, (_, i) => i + 1).map((w) => (
            <Pressable
              key={w}
              style={[
                styles.weekTab,
                { backgroundColor: c.glass.surface, borderColor: c.glass.border },
                activeWeek === w && { borderColor: c.primary.main, backgroundColor: c.glass.redSurface },
              ]}
              onPress={() => onWeekChange(w)}
            >
              <Text style={[styles.weekTabText, { color: c.text.secondary }, activeWeek === w && { color: c.primary.main }]}>
                Week {w}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Day rows */}
      {DAY_LABELS.map((dayLabel, dayIndex) => {
        const daySlots = schedule[activeWeek]?.[dayIndex] ?? [];
        const hasTrainings = daySlots.length > 0;
        return (
          <View key={dayIndex} style={[styles.dayRow, { borderBottomColor: c.glass.border }]}>
            <View style={styles.dayLabelWrap}>
              <Text style={[styles.dayLabel, { color: c.text.tertiary }, hasTrainings && { color: c.text.primary }]}>{dayLabel}</Text>
            </View>
            <View style={styles.dayContent}>
              {daySlots.map((slot, slotIdx) => (
                <View key={slot._key || `${slot.id_trainings}-${slotIdx}`} style={styles.slotRow}>
                  <View style={styles.slotInfo}>
                    <TrainingPreviewCard
                      title={slot.title}
                      componentCount={slot.component_count}
                      estimatedDurationSeconds={slot.estimated_duration_seconds}
                      compact
                    />
                    <TimePicker
                      value={slot.start_time}
                      onChange={(time) => onTimeChange(activeWeek, dayIndex, slotIdx, time)}
                    />
                  </View>
                  <Pressable
                    style={[styles.removeBtn, { backgroundColor: c.glass.redSurface }]}
                    onPress={() => onRemoveSlot(activeWeek, dayIndex, slotIdx)}
                  >
                    <Ionicons name="close" size={14} color={c.primary.main} />
                  </Pressable>
                </View>
              ))}
              <Pressable
                style={styles.addDayBtn}
                onPress={() => onAddTraining(activeWeek, dayIndex)}
              >
                <Ionicons name="add" size={14} color={c.text.secondary} />
                <Text style={[styles.addDayText, { color: c.text.tertiary }]}>
                  {hasTrainings ? 'Add another' : 'Add training'}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  hint: { fontSize: 12, marginBottom: 12 },
  weekTabs: { flexDirection: 'row', marginBottom: 12 },
  weekTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  weekTabText: { fontSize: 12, fontWeight: '600' },
  dayRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  dayLabelWrap: { width: 40, paddingTop: 10 },
  dayLabel: { fontSize: 12, fontWeight: '700' },
  dayContent: { flex: 1, gap: 4 },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  slotInfo: { flex: 1, gap: 4 },
  removeBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  addDayText: { fontSize: 11 },
});
