import React from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/glass-card';
import { Text } from '@/components/ui/text';
import { SkeletonLoader } from '@/components/ui/skeleton-loader';
import { colors, colorUtils } from '@/src/theme/colors';
import ProgressRing from './ProgressRing';

interface BadgeProgressWidgetProps {
  badge?: {
    id_badges: number;
    title: string;
    description: string;
    icon_name: string;
    color: string;
    metric_key?: string;
    threshold?: number;
    earned?: boolean;
    current_value?: number;
    progress?: number;
    awarded_at?: string;
  };
  onPress?: () => void;
}

const METRIC_LABELS: Record<string, string> = {
  workouts_completed: 'Workouts',
  streak_days: 'Days',
  club_sessions: 'Club Sessions',
  clubs_joined: 'Clubs Joined',
  interactions_count: 'Interactions',
  posts_created: 'Posts',
  friends_count: 'Friends',
  score: 'Points',
  total_hours: 'Hours',
};

const METRIC_UNITS: Record<string, string> = {
  workouts_completed: 'workouts',
  streak_days: 'days',
  club_sessions: 'sessions',
  clubs_joined: 'clubs',
  interactions_count: 'interactions',
  posts_created: 'posts',
  friends_count: 'friends',
  score: 'points',
  total_hours: 'hours',
};

const formatAwardedDate = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const BadgeProgressWidgetBase: React.FC<BadgeProgressWidgetProps> = ({ badge, onPress }) => {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;

  if (!badge) {
    return (
      <GlassCard variant="medium" radius={14} padding={12} style={styles.loadingCard}>
        <SkeletonLoader width={90} height={12} borderRadius={6} />
        <View style={styles.loadingRow}>
          <SkeletonLoader width={80} height={12} borderRadius={6} />
          <SkeletonLoader width={48} height={48} borderRadius={24} />
        </View>
        <SkeletonLoader width={100} height={10} borderRadius={6} />
      </GlassCard>
    );
  }

  const badgeColor = badge.color || colors.primary.main;
  const earned = !!badge.earned;
  const progressValue = Math.max(0, Math.min(1, Number(badge.progress ?? 0)));
  const percent = Math.round(progressValue * 100);
  const threshold = Number(badge.threshold ?? 0);
  const currentValue = Number(badge.current_value ?? 0);
  const metricLabel = badge.metric_key ? METRIC_LABELS[badge.metric_key] ?? 'Sessions' : 'Sessions';
  const unitLabel = badge.metric_key ? METRIC_UNITS[badge.metric_key] ?? 'sessions' : 'sessions';
  const remaining = threshold ? Math.max(0, threshold - currentValue) : null;
  const remainingText =
    remaining !== null ? `Unlock in ${remaining} ${remaining === 1 ? unitLabel.slice(0, -1) : unitLabel}` : '';
  const awardedDate = formatAwardedDate(badge.awarded_at);
  const progressText = threshold
    ? `${currentValue} / ${threshold} ${metricLabel} Completed`
    : badge.description || 'Progress in motion';

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${badge.title} badge progress ${percent}%`}
      accessibilityState={{ disabled: !onPress }}
      accessibilityHint={onPress ? 'Opens badge details' : undefined}
      testID={`BadgeProgressWidget_${badge.id_badges}`}
    >
      <GlassCard variant="medium" radius={14} padding={12} style={styles.card}>
        <View style={styles.header}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: colorUtils.hexToRgba(badgeColor, 0.2) },
            ]}
          >
            <Ionicons name={(badge.icon_name as any) || 'ribbon-outline'} size={16} color={badgeColor} />
          </View>
          <Text style={[styles.title, isSmallScreen && styles.titleSmall]} numberOfLines={1}>
            {badge.title}
          </Text>
        </View>

        <View style={styles.body}>
          <View style={styles.textBlock}>
            {earned ? (
              <Text style={styles.unlockedText}>
                ✅ UNLOCKED{awardedDate ? ` · ${awardedDate}` : ''}
              </Text>
            ) : (
              <>
                <Text style={[styles.progressText, isSmallScreen && styles.progressTextSmall]} numberOfLines={2}>
                  {progressText}
                </Text>
                {remainingText ? (
                  <Text style={[styles.estimateText, isSmallScreen && styles.estimateTextSmall]}>
                    {remainingText}
                  </Text>
                ) : null}
              </>
            )}
          </View>
          <ProgressRing
            percent={earned ? 100 : percent}
            size={60}
            strokeWidth={6}
            backgroundColor={colors.border.light}
            foregroundColor={badgeColor}
            animateDuration={700}
            accessibilityLabel={`${badge.title} progress ${earned ? 100 : percent}%`}
            centerContent={<Text style={styles.ringText}>{earned ? '✓' : `${percent}%`}</Text>}
          />
        </View>
      </GlassCard>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    width: 170,
    minHeight: 120,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  card: {
    gap: 10,
  },
  loadingCard: {
    width: 170,
    minHeight: 120,
    gap: 10,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  titleSmall: {
    fontSize: 13,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  progressText: {
    color: colors.text.secondary,
    fontSize: 12,
    lineHeight: 16,
  },
  progressTextSmall: {
    fontSize: 11,
  },
  estimateText: {
    color: colors.text.tertiary,
    fontSize: 11,
  },
  estimateTextSmall: {
    fontSize: 10,
  },
  unlockedText: {
    color: colors.success.main,
    fontSize: 12,
    fontWeight: '700',
  },
  ringText: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: '700',
  },
});

export const BadgeProgressWidget = React.memo(BadgeProgressWidgetBase);

export default BadgeProgressWidget;
