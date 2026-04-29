import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { GlassCard } from '@/components/ui/glass-card';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
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
  return (
    <GlassCard variant="medium" radius={14} padding={16}>
      <Text style={styles.label}>Weekly Schedule</Text>
      <Text style={styles.hint}>Tap a day to add trainings. Unassigned days are rest days.</Text>

      {/* Week tabs */}
      {numWeeks > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekTabs}>
          {Array.from({ length: numWeeks }, (_, i) => i + 1).map((w) => (
            <Pressable
              key={w}
              style={[styles.weekTab, activeWeek === w && styles.weekTabActive]}
              onPress={() => onWeekChange(w)}
            >
              <Text style={[styles.weekTabText, activeWeek === w && styles.weekTabTextActive]}>
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
          <View key={dayIndex} style={styles.dayRow}>
            <View style={styles.dayLabelWrap}>
              <Text style={[styles.dayLabel, hasTrainings && styles.dayLabelActive]}>{dayLabel}</Text>
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
                    style={styles.removeBtn}
                    onPress={() => onRemoveSlot(activeWeek, dayIndex, slotIdx)}
                  >
                    <Ionicons name="close" size={14} color={colors.primary.main} />
                  </Pressable>
                </View>
              ))}
              <Pressable
                style={styles.addDayBtn}
                onPress={() => onAddTraining(activeWeek, dayIndex)}
              >
                <Ionicons name="add" size={14} color={colors.text.secondary} />
                <Text style={styles.addDayText}>
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
  label: { color: colors.text.primary, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  hint: { color: colors.text.tertiary, fontSize: 12, marginBottom: 12 },
  weekTabs: { flexDirection: 'row', marginBottom: 12 },
  weekTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.glass.surface,
    borderWidth: 1,
    borderColor: colors.glass.border,
    marginRight: 6,
  },
  weekTabActive: { borderColor: colors.primary.main, backgroundColor: colors.glass.redSurface },
  weekTabText: { color: colors.text.secondary, fontSize: 12, fontWeight: '600' },
  weekTabTextActive: { color: colors.primary.main },
  dayRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
    paddingVertical: 8,
  },
  dayLabelWrap: { width: 40, paddingTop: 10 },
  dayLabel: { color: colors.text.tertiary, fontSize: 12, fontWeight: '700' },
  dayLabelActive: { color: colors.text.primary },
  dayContent: { flex: 1, gap: 4 },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  slotInfo: { flex: 1, gap: 4 },
  removeBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass.redSurface,
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
  addDayText: { color: colors.text.tertiary, fontSize: 11 },
});
