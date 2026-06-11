import React, { useMemo } from 'react';
import { ScrollView, View, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/glass-card';
import { Text } from '@/components/ui/text';
import { SkeletonLoader } from '@/components/ui/skeleton-loader';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { MAX_FONT_SCALE } from '@/src/utils/typography';
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
  
  try {
    // Get today's snapshot (most recent)
    const latest = snapshots[snapshots.length - 1];
    if (!latest || !latest.snapshot_date) return null;
    
    // snapshot_date is YYYY-MM-DD format
    const dateStr = latest.snapshot_date;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    
    // Create a UTC date and safely subtract 7 days
    const today = new Date(dateStr + 'T00:00:00Z');
    if (isNaN(today.getTime())) return null;
    
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
    
    // Format back to YYYY-MM-DD
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    
    // Find snapshot from 7 days ago
    const previousSnapshot = snapshots.find(s => s.snapshot_date === sevenDaysAgoStr);
    
    if (!previousSnapshot) return null;
    
    const currentVal = Number(latest[metricKey] ?? 0);
    const previousVal = Number(previousSnapshot[metricKey] ?? 0);
    return calculateMetricDelta(currentVal, previousVal);
  } catch {
    return null;
  }
};

type ThemeColors = ReturnType<typeof useThemeColors>;
const getDeltaDisplay = (delta: ProgressDelta | null, c: ThemeColors) => {
  if (!delta) {
    return { label: placeholderValue, color: c.text.tertiary };
  }
  const deltaValue = Number.isInteger(delta.delta) ? delta.delta : Number(delta.delta.toFixed(1));
  const sign = deltaValue >= 0 ? '+' : '';
  const label = `${sign}${deltaValue}`;
  const color =
    delta.delta > 0
      ? c.success.main
      : delta.delta < 0
        ? c.error.main
        : c.text.tertiary;
  return { label, color };
};

const MetricCardsRowBase: React.FC<MetricCardsRowProps> = ({ onMetricTap }) => {
  const c = useThemeColors();
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
        delta: null,
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
        {Array.from({ length: 3 }).map((_, index) => (
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
        <Text style={[styles.emptyTitle, { color: c.text.primary }]}>No metrics tracked yet</Text>
        <Text style={[styles.emptySub, { color: c.text.tertiary }]}>Complete a workout to get started.</Text>
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
        const deltaDisplay = getDeltaDisplay(metric.delta ?? null, c);
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
                <View style={[styles.iconWrap, { borderColor: c.glass.redBorder, backgroundColor: c.glass.redSurface }]}>
                  <Ionicons name={metric.icon} size={16} color={c.primary.main} />
                </View>
                <Text style={[styles.metricLabel, { color: c.text.tertiary }]}>{metric.label}</Text>
              </View>
              <Text
                style={[
                  styles.metricValue,
                  { color: c.text.primary },
                  isSmallScreen && styles.metricValueSmall,
                  metric.isPlaceholder && { color: c.text.tertiary },
                ]}
                maxFontSizeMultiplier={MAX_FONT_SCALE}
              >
                {metric.valueDisplay}
              </Text>
              <View style={styles.deltaContainer}>
                {deltaDisplay.label !== placeholderValue && (
                  <Text
                    style={[styles.metricDelta, { color: deltaDisplay.color }]}
                    accessibilityLabel={`${metric.label} change: ${deltaDisplay.label}`}
                  >
                    {deltaDisplay.label}
                  </Text>
                )}
              </View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  metricValueSmall: {
    fontSize: 20,
  },
  metricDelta: {
    fontSize: 12,
    fontWeight: '600',
  },
  deltaContainer: {
    marginTop: 2,
  },
  skeletonGap: {
    marginTop: 8,
  },
  emptyCard: {
    marginTop: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 12,
    marginTop: 4,
  },
});

export const MetricCardsRow = React.memo(MetricCardsRowBase);

export default MetricCardsRow;
