import React, { useState } from 'react';
import { View, Pressable, StyleSheet, Animated } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/glass-card';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { createPressFeedback } from '@/src/utils/motion';

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
  const c = useThemeColors();
  const duration = formatDuration(estimatedDurationSeconds);
  const pressFeedback = createPressFeedback();

  const content = (
    <GlassCard
      variant={selected ? 'red' : 'medium'}
      radius={12}
      padding={compact ? 10 : 14}
      style={[styles.card, ...(selected ? [{ borderWidth: 1, borderColor: c.primary.main }] : [])]}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: c.glass.surface }]}>
          <Ionicons
            name="barbell-outline"
            size={compact ? 18 : 22}
            color={selected ? c.primary.main : c.text.secondary}
          />
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, { color: c.text.primary }, compact && styles.titleCompact]} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.meta}>
            {componentCount > 0 && (
              <View style={styles.badge}>
                <Ionicons name="layers-outline" size={11} color={c.text.tertiary} />
                <Text style={[styles.badgeText, { color: c.text.tertiary }]}>
                  {componentCount} exercise{componentCount !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
            {estimatedDurationSeconds > 0 && (
              <View style={styles.badge}>
                <Ionicons name="time-outline" size={11} color={c.text.tertiary} />
                <Text style={[styles.badgeText, { color: c.text.tertiary }]}>{duration}</Text>
              </View>
            )}
          </View>
          {!compact && !!description && (
            <Text style={[styles.desc, { color: c.text.secondary }]} numberOfLines={2}>{description}</Text>
          )}
        </View>
        {onPress && (
          <Ionicons name="chevron-forward" size={16} color={c.text.tertiary} />
        )}
      </View>
    </GlassCard>
  );

  if (onPress) {
    return (
      <Animated.View style={{ transform: [{ scale: pressFeedback.scale }] }}>
        <Pressable
          onPress={onPress}
          onPressIn={pressFeedback.onPressIn}
          onPressOut={pressFeedback.onPressOut}
        >
          {content}
        </Pressable>
      </Animated.View>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  card: { marginBottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700' },
  titleCompact: { fontSize: 13 },
  meta: { flexDirection: 'row', gap: 10, marginTop: 3 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  badgeText: { fontSize: 11 },
  desc: { fontSize: 12, marginTop: 4, lineHeight: 16 },
});
