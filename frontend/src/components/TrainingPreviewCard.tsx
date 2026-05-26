import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/glass-card';
import { colors } from '@/src/theme/colors';

interface TrainingPreviewCardProps {
  title: string;
  description?: string;
  componentCount?: number;
  estimatedDurationSeconds?: number;
  onPress?: () => void;
  selected?: boolean;
  compact?: boolean;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '—';
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    return `${m}m`;
  }
  return `${seconds}s`;
}

export default function TrainingPreviewCard({
  title,
  description,
  componentCount = 0,
  estimatedDurationSeconds = 0,
  onPress,
  selected = false,
  compact = false,
}: TrainingPreviewCardProps) {
  const duration = formatDuration(estimatedDurationSeconds);

  const content = (
    <GlassCard
      variant={selected ? 'red' : 'medium'}
      radius={12}
      padding={compact ? 10 : 14}
      style={[styles.card, ...(selected ? [styles.cardSelected] : [])]}
    >
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons
            name="barbell-outline"
            size={compact ? 18 : 22}
            color={selected ? colors.primary.main : colors.text.secondary}
          />
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.meta}>
            {componentCount > 0 && (
              <View style={styles.badge}>
                <Ionicons name="layers-outline" size={11} color={colors.text.tertiary} />
                <Text style={styles.badgeText}>
                  {componentCount} exercise{componentCount !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
            {estimatedDurationSeconds > 0 && (
              <View style={styles.badge}>
                <Ionicons name="time-outline" size={11} color={colors.text.tertiary} />
                <Text style={styles.badgeText}>{duration}</Text>
              </View>
            )}
          </View>
          {!compact && !!description && (
            <Text style={styles.desc} numberOfLines={2}>{description}</Text>
          )}
        </View>
        {onPress && (
          <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
        )}
      </View>
    </GlassCard>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

const styles = StyleSheet.create({
  card: { marginBottom: 0 },
  cardSelected: {
    borderWidth: 1,
    borderColor: colors.primary.main,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.glass.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1 },
  title: { color: colors.text.primary, fontSize: 14, fontWeight: '700' },
  titleCompact: { fontSize: 13 },
  meta: { flexDirection: 'row', gap: 10, marginTop: 3 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  badgeText: { color: colors.text.tertiary, fontSize: 11 },
  desc: { color: colors.text.secondary, fontSize: 12, marginTop: 4, lineHeight: 16 },
});
