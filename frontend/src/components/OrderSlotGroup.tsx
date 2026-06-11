import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import TrainingPreviewCard from './TrainingPreviewCard';
import TimePicker from './TimePicker';

export interface OrderSlotTraining {
  id_trainings: number;
  title: string;
  component_count: number;
  estimated_duration_seconds: number;
  start_time: string | null;
  _key?: string;
}

export interface OrderSlotData {
  type: 'training' | 'rest';
  order: number;
  trainings: OrderSlotTraining[];
}

interface OrderSlotGroupProps {
  slot: OrderSlotData;
  index: number;
  total: number;
  onAddTraining: (order: number) => void;
  onRemoveTraining: (order: number, trainingIdx: number) => void;
  onTimeChange: (order: number, trainingIdx: number, time: string | null) => void;
  onMoveSlot: (index: number, direction: 'up' | 'down') => void;
  onRemoveSlot: (index: number) => void;
}

export default function OrderSlotGroup({
  slot,
  index,
  total,
  onAddTraining,
  onRemoveTraining,
  onTimeChange,
  onMoveSlot,
  onRemoveSlot,
}: OrderSlotGroupProps) {
  const c = useThemeColors();
  const isRest = slot.type === 'rest';

  return (
    <View style={[styles.container, { borderBottomColor: c.glass.border }]}>
      <View style={[styles.dayBadge, { backgroundColor: c.primary.main }]}>
        <Text style={styles.dayBadgeText}>{index + 1}</Text>
      </View>

      <View style={styles.content}>
        {isRest ? (
          <View style={styles.restSlot}>
            <Ionicons name="bed-outline" size={16} color={c.text.tertiary} />
            <Text style={[styles.restSlotText, { color: c.text.tertiary }]}>Rest Day</Text>
          </View>
        ) : (
          <View style={styles.trainings}>
            {slot.trainings.map((t, tIdx) => (
              <View key={t._key || `${t.id_trainings}-${tIdx}`} style={styles.trainingRow}>
                <View style={styles.trainingInfo}>
                  <TrainingPreviewCard
                    title={t.title}
                    componentCount={t.component_count}
                    estimatedDurationSeconds={t.estimated_duration_seconds}
                    compact
                  />
                  <TimePicker
                    value={t.start_time}
                    onChange={(time) => onTimeChange(slot.order, tIdx, time)}
                  />
                </View>
                {slot.trainings.length > 1 && (
                  <Pressable
                    style={[styles.removeTrainingBtn, { backgroundColor: c.glass.redSurface }]}
                    onPress={() => onRemoveTraining(slot.order, tIdx)}
                  >
                    <Ionicons name="close" size={12} color={c.primary.main} />
                  </Pressable>
                )}
              </View>
            ))}
            <Pressable style={styles.addMoreBtn} onPress={() => onAddTraining(slot.order)}>
              <Ionicons name="add" size={14} color={c.text.secondary} />
              <Text style={[styles.addMoreText, { color: c.text.tertiary }]}>Add another training</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.moveBtn, { backgroundColor: c.glass.medium }, index === 0 && styles.moveBtnDisabled]}
          onPress={() => onMoveSlot(index, 'up')}
          disabled={index === 0}
        >
          <Text style={[styles.moveBtnText, { color: c.text.secondary }]}>▲</Text>
        </Pressable>
        <Pressable
          style={[styles.moveBtn, { backgroundColor: c.glass.medium }, index === total - 1 && styles.moveBtnDisabled]}
          onPress={() => onMoveSlot(index, 'down')}
          disabled={index === total - 1}
        >
          <Text style={[styles.moveBtnText, { color: c.text.secondary }]}>▼</Text>
        </Pressable>
        <Pressable style={[styles.removeBtnFull, { backgroundColor: c.glass.redSurface }]} onPress={() => onRemoveSlot(index)}>
          <Ionicons name="close" size={14} color={c.primary.main} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  dayBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  dayBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  content: { flex: 1 },
  restSlot: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  restSlotText: { fontSize: 13, fontStyle: 'italic' },
  trainings: { gap: 4 },
  trainingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trainingInfo: { flex: 1, gap: 4 },
  removeTrainingBtn: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  addMoreText: { fontSize: 11 },
  actions: { gap: 3, paddingTop: 4 },
  moveBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveBtnDisabled: { opacity: 0.35 },
  moveBtnText: { fontSize: 10 },
  removeBtnFull: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
