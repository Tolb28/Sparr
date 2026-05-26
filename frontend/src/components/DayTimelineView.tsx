import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { GlassCard } from '@/components/ui/glass-card';

export interface TimelineTraining {
  id: number | string;
  title: string;
  description?: string;
  duration?: string;
  start_time?: string | null;
  components?: string[];
  trainingComponents?: any[];
  trainingName?: string;
}

interface DayTimelineViewProps {
  trainings: TimelineTraining[];
  onTrainingPress?: (training: TimelineTraining) => void;
  onStartPress?: (training: TimelineTraining) => void;
  onEditPress?: (training: TimelineTraining) => void;
}

function formatTime(t: string | null | undefined): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:${m} ${ampm}`;
}

export default function DayTimelineView({
  trainings,
  onTrainingPress,
  onStartPress,
  onEditPress,
}: DayTimelineViewProps) {
  if (trainings.length === 0) return null;

  // Separate timed vs untimed
  const timed = trainings.filter((t) => t.start_time).sort((a, b) => (a.start_time! < b.start_time! ? -1 : 1));
  const untimed = trainings.filter((t) => !t.start_time);
  const ordered = [...timed, ...untimed];

  return (
    <View style={styles.container}>
      {ordered.map((training, idx) => (
        <View key={training.id} style={styles.row}>
          {/* Timeline line + dot */}
          <View style={styles.timelineCol}>
            {training.start_time ? (
              <Text style={styles.timeText}>{formatTime(training.start_time)}</Text>
            ) : (
              <View style={styles.timePlaceholder} />
            )}
            <View style={styles.dotWrap}>
              <View style={[styles.dot, idx === 0 && styles.dotActive]} />
              {idx < ordered.length - 1 && <View style={styles.line} />}
            </View>
          </View>

          {/* Training card */}
          <Pressable
            style={styles.card}
            onPress={() => onTrainingPress?.(training)}
          >
            <GlassCard variant="medium" radius={12} padding={12}>
              <Text style={styles.title} numberOfLines={1}>{training.title}</Text>
              {training.duration && (
                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={12} color={colors.text.tertiary} />
                  <Text style={styles.metaText}>{training.duration}</Text>
                </View>
              )}
              {training.components && training.components.length > 0 && (
                <View style={styles.componentList}>
                  {training.components.slice(0, 2).map((c, i) => (
                    <Text key={i} style={styles.componentText} numberOfLines={1}>• {c}</Text>
                  ))}
                  {training.components.length > 2 && (
                    <Text style={styles.moreText}>+{training.components.length - 2} more</Text>
                  )}
                </View>
              )}
              <View style={styles.btnRow}>
                <Pressable
                  style={styles.startBtn}
                  onPress={() => onStartPress?.(training)}
                >
                  <Text style={styles.startBtnText}>Start</Text>
                </Pressable>
                <Pressable
                  style={styles.editBtn}
                  onPress={() => onEditPress?.(training)}
                >
                  <Text style={styles.editBtnText}>Edit</Text>
                </Pressable>
              </View>
            </GlassCard>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 0 },
  row: { flexDirection: 'row', minHeight: 80 },
  timelineCol: {
    width: 70,
    alignItems: 'center',
    paddingTop: 4,
  },
  timeText: {
    color: colors.primary.main,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  timePlaceholder: { height: 14 },
  dotWrap: { alignItems: 'center', flex: 1 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.glass.surfaceStrong,
    borderWidth: 2,
    borderColor: colors.border.light,
  },
  dotActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border.light,
    marginVertical: 2,
  },
  card: { flex: 1, paddingBottom: 8 },
  title: { color: colors.text.primary, fontSize: 14, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { color: colors.text.tertiary, fontSize: 11 },
  componentList: { marginTop: 6, gap: 2 },
  componentText: { color: colors.text.secondary, fontSize: 11 },
  moreText: { color: colors.text.tertiary, fontSize: 11, fontStyle: 'italic' },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  startBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primary.main,
  },
  startBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.glass.surface,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  editBtnText: { color: colors.text.secondary, fontSize: 12, fontWeight: '600' },
});
