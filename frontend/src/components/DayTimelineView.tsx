import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/src/hooks/useThemeColors';
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
  const c = useThemeColors();

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
              <Text style={[styles.timeText, { color: c.primary.main }]}>{formatTime(training.start_time)}</Text>
            ) : (
              <View style={styles.timePlaceholder} />
            )}
            <View style={styles.dotWrap}>
              <View style={[
                styles.dot,
                { backgroundColor: c.glass.surfaceStrong, borderColor: c.border.light },
                idx === 0 && { backgroundColor: c.primary.main, borderColor: c.primary.main },
              ]} />
              {idx < ordered.length - 1 && <View style={[styles.line, { backgroundColor: c.border.light }]} />}
            </View>
          </View>

          {/* Training card */}
          <Pressable
            style={styles.card}
            onPress={() => onTrainingPress?.(training)}
          >
            <GlassCard variant="medium" radius={12} padding={12}>
              <Text style={[styles.title, { color: c.text.primary }]} numberOfLines={1}>{training.title}</Text>
              {training.duration && (
                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={12} color={c.text.tertiary} />
                  <Text style={[styles.metaText, { color: c.text.tertiary }]}>{training.duration}</Text>
                </View>
              )}
              {training.components && training.components.length > 0 && (
                <View style={styles.componentList}>
                  {training.components.slice(0, 2).map((comp, i) => (
                    <Text key={i} style={[styles.componentText, { color: c.text.secondary }]} numberOfLines={1}>• {comp}</Text>
                  ))}
                  {training.components.length > 2 && (
                    <Text style={[styles.moreText, { color: c.text.tertiary }]}>+{training.components.length - 2} more</Text>
                  )}
                </View>
              )}
              <View style={styles.btnRow}>
                <Pressable
                  style={[styles.startBtn, { backgroundColor: c.primary.main }]}
                  onPress={() => onStartPress?.(training)}
                >
                  <Text style={styles.startBtnText}>Start</Text>
                </Pressable>
                <Pressable
                  style={[styles.editBtn, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]}
                  onPress={() => onEditPress?.(training)}
                >
                  <Text style={[styles.editBtnText, { color: c.text.secondary }]}>Edit</Text>
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
    borderWidth: 2,
  },
  line: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  card: { flex: 1, paddingBottom: 8 },
  title: { fontSize: 14, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 11 },
  componentList: { marginTop: 6, gap: 2 },
  componentText: { fontSize: 11 },
  moreText: { fontSize: 11, fontStyle: 'italic' },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  startBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  startBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  editBtnText: { fontSize: 12, fontWeight: '600' },
});
