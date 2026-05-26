import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
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
  const isRest = slot.type === 'rest';

  return (
    <View style={styles.container}>
      <View style={styles.dayBadge}>
        <Text style={styles.dayBadgeText}>{index + 1}</Text>
      </View>

      <View style={styles.content}>
        {isRest ? (
          <View style={styles.restSlot}>
            <Ionicons name="bed-outline" size={16} color={colors.text.tertiary} />
            <Text style={styles.restSlotText}>Rest Day</Text>
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
                    style={styles.removeTrainingBtn}
                    onPress={() => onRemoveTraining(slot.order, tIdx)}
                  >
                    <Ionicons name="close" size={12} color={colors.primary.main} />
                  </Pressable>
                )}
              </View>
            ))}
            <Pressable style={styles.addMoreBtn} onPress={() => onAddTraining(slot.order)}>
              <Ionicons name="add" size={14} color={colors.text.secondary} />
              <Text style={styles.addMoreText}>Add another training</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.moveBtn, index === 0 && styles.moveBtnDisabled]}
          onPress={() => onMoveSlot(index, 'up')}
          disabled={index === 0}
        >
          <Text style={styles.moveBtnText}>▲</Text>
        </Pressable>
        <Pressable
          style={[styles.moveBtn, index === total - 1 && styles.moveBtnDisabled]}
          onPress={() => onMoveSlot(index, 'down')}
          disabled={index === total - 1}
        >
          <Text style={styles.moveBtnText}>▼</Text>
        </Pressable>
        <Pressable style={styles.removeBtnFull} onPress={() => onRemoveSlot(index)}>
          <Ionicons name="close" size={14} color={colors.primary.main} />
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
    borderBottomColor: colors.glass.border,
  },
  dayBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  dayBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  content: { flex: 1 },
  restSlot: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  restSlotText: { color: colors.text.tertiary, fontSize: 13, fontStyle: 'italic' },
  trainings: { gap: 4 },
  trainingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trainingInfo: { flex: 1, gap: 4 },
  removeTrainingBtn: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass.redSurface,
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  addMoreText: { color: colors.text.tertiary, fontSize: 11 },
  actions: { gap: 3, paddingTop: 4 },
  moveBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass.medium,
  },
  moveBtnDisabled: { opacity: 0.35 },
  moveBtnText: { color: colors.text.secondary, fontSize: 10 },
  removeBtnFull: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass.redSurface,
  },
});
