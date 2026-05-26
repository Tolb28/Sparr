import React, { useMemo } from 'react';
import { ScrollView, View, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/glass-card';
import { Text } from '@/components/ui/text';
import { SkeletonLoader } from '@/components/ui/skeleton-loader';
import { colors } from '@/src/theme/colors';
import { useProgress } from '@/src/context/ProgressContext';
import { calculateMetricDelta, ProgressDelta, Snapshot } from '@/src/api/progress';

interface MetricCardsRowProps {
  onMetricTap?: (metricKey: string) => void;
}

interface MetricCardConfig {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  valueDisplay: string;
  delta?: ProgressDelta | null;
  isPlaceholder?: boolean;
}

const placeholderValue = '—';

const snapshotMetricMap: Partial<Record<string, keyof Snapshot>> = {
  workouts_completed: 'workouts_completed',
  streak_days: 'streak_days',
  club_sessions: 'club_sessions',
  interactions_count: 'interactions_count',
  score: 'score',
};

const formatNumber = (value: number) => {
  if (!Number.isFinite(value)) return '0';
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
};

const formatHours = (value: number) => {
  if (!Number.isFinite(value)) return '0';
  return value % 1 === 0 ? value.toString() : value.toFixed(1);
};

const getDelta = (snapshots: Snapshot[], metricKey?: keyof Snapshot): ProgressDelta | null => {
  if (!metricKey || snapshots.length < 2) return null;
  const latest = snapshots[snapshots.length - 1];
  const previous = snapshots[snapshots.length - 2];
  if (!latest || !previous) return null;
  const currentVal = Number(latest[metricKey] ?? 0);
  const previousVal = Number(previous[metricKey] ?? 0);
  return calculateMetricDelta(currentVal, previousVal);
};

const getDeltaDisplay = (delta: ProgressDelta | null) => {
  if (!delta) {
    return { label: placeholderValue, color: colors.text.tertiary };
  }
  const arrow = delta.trend === 'up' ? '↑' : delta.trend === 'down' ? '↓' : '→';
  const deltaValue = Number.isInteger(delta.delta) ? delta.delta : Number(delta.delta.toFixed(1));
  const sign = deltaValue > 0 ? '+' : '';
  const label = `${arrow} ${sign}${deltaValue}`;
  const color =
    delta.trend === 'up'
      ? colors.success.main
      : delta.trend === 'down'
        ? colors.error.main
        : colors.text.tertiary;
  return { label, color };
};

const MetricCardsRowBase: React.FC<MetricCardsRowProps> = ({ onMetricTap }) => {
  const { metrics, snapshots, loading } = useProgress();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;
  const cardWidth = isSmallScreen ? 128 : 140;

  const metricCards = useMemo<MetricCardConfig[]>(() => {
    const workoutValue = metrics?.workouts_completed ?? 0;
    const streakValue = metrics?.streak_days ?? 0;
    const hoursValue = metrics?.total_hours ?? 0;

    return [
      {
        key: 'workouts_completed',
        label: 'SESSIONS',
        icon: 'barbell-outline',
        valueDisplay: formatNumber(workoutValue),
        delta: getDelta(snapshots, snapshotMetricMap.workouts_completed),
      },
      {
        key: 'total_hours',
        label: 'HOURS',
        icon: 'time-outline',
        valueDisplay: formatHours(hoursValue),
        delta: null,
      },
      {
        key: 'streak_days',
        label: 'STREAK',
        icon: 'flame-outline',
        valueDisplay: formatNumber(streakValue),
        delta: getDelta(snapshots, snapshotMetricMap.streak_days),
      },
      {
        key: 'skill_level',
        label: 'SKILL',
        icon: 'trending-up-outline',
        valueDisplay: placeholderValue,
        delta: null,
        isPlaceholder: true,
      },
      {
        key: 'intensity',
        label: 'INTENSITY',
        icon: 'speedometer-outline',
        valueDisplay: placeholderValue,
        delta: null,
        isPlaceholder: true,
      },
    ];
  }, [metrics, snapshots]);

  if (loading) {
    return (
      <ScrollView
        horizontal
        bounces={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContainer, isSmallScreen && styles.scrollContainerCompact]}
        testID="MetricCardsRow_Scroll"
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <GlassCard
            key={`metric-skeleton-${index}`}
            variant="default"
            radius={16}
            padding={14}
            style={[styles.card, { width: cardWidth }]}
          >
            <SkeletonLoader width={22} height={22} borderRadius={11} />
            <SkeletonLoader width={70} height={12} borderRadius={6} style={styles.skeletonGap} />
            <SkeletonLoader width={60} height={22} borderRadius={8} />
            <SkeletonLoader width={50} height={12} borderRadius={6} style={styles.skeletonGap} />
          </GlassCard>
        ))}
      </ScrollView>
    );
  }

  if (!metrics) {
    return (
      <GlassCard variant="medium" radius={16} padding={16} style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>No metrics tracked yet</Text>
        <Text style={styles.emptySub}>Complete a workout to get started.</Text>
      </GlassCard>
    );
  }

  return (
    <ScrollView
      horizontal
      bounces={false}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContainer, isSmallScreen && styles.scrollContainerCompact]}
      testID="MetricCardsRow_Scroll"
    >
      {metricCards.map((metric) => {
        const deltaDisplay = getDeltaDisplay(metric.delta ?? null);
        const isTouchable = Boolean(onMetricTap) && !metric.isPlaceholder;

        return (
          <Pressable
            key={metric.key}
            onPress={() => onMetricTap?.(metric.key)}
            disabled={!isTouchable}
            accessibilityRole={isTouchable ? 'button' : undefined}
            accessibilityLabel={`${metric.label} metric ${metric.valueDisplay}`}
            accessibilityState={{ disabled: !isTouchable }}
            testID={`MetricCardsRow_${metric.key}`}
            style={({ pressed }) => [
              styles.cardPressable,
              pressed && isTouchable ? styles.cardPressed : null,
            ]}
          >
            <GlassCard variant="default" radius={16} padding={14} style={[styles.card, { width: cardWidth }]}>
              <View style={styles.cardHeader}>
                <View style={styles.iconWrap}>
                  <Ionicons name={metric.icon} size={16} color={colors.primary.main} />
                </View>
                <Text style={styles.metricLabel}>{metric.label}</Text>
              </View>
              <Text
                style={[
                  styles.metricValue,
                  isSmallScreen && styles.metricValueSmall,
                  metric.isPlaceholder && styles.metricPlaceholder,
                ]}
              >
                {metric.valueDisplay}
              </Text>
              <Text style={[styles.metricDelta, { color: deltaDisplay.color }]}>
                {deltaDisplay.label}
              </Text>
            </GlassCard>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingVertical: 4,
    gap: 12,
    paddingRight: 8,
  },
  scrollContainerCompact: {
    paddingRight: 4,
  },
  cardPressable: {
    borderRadius: 16,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
  card: {
    minHeight: 110,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.glass.redBorder,
    backgroundColor: colors.glass.redSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  metricValue: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '800',
  },
  metricValueSmall: {
    fontSize: 20,
  },
  metricPlaceholder: {
    color: colors.text.tertiary,
  },
  metricDelta: {
    fontSize: 12,
    fontWeight: '600',
  },
  skeletonGap: {
    marginTop: 8,
  },
  emptyCard: {
    marginTop: 4,
  },
  emptyTitle: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  emptySub: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginTop: 4,
  },
});

export const MetricCardsRow = React.memo(MetricCardsRowBase);

export default MetricCardsRow;
