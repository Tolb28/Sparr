import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/glass-card';
import { Text } from '@/components/ui/text';
import { SkeletonLoader } from '@/components/ui/skeleton-loader';
import { colors } from '@/src/theme/colors';
import { useProgress } from '@/src/context/ProgressContext';
import { TimeframeToggle } from './TimeframeToggle';

interface ProgressHeaderCardProps {
  onRefresh?: () => void;
}

const TIMEFRAME_LABELS: Record<string, string> = {
  week: 'THIS WEEK',
  month: 'THIS MONTH',
  year: 'THIS YEAR',
  lifetime: 'ALL-TIME',
};

const formatHours = (value: number) => {
  if (!Number.isFinite(value)) return '0';
  return value % 1 === 0 ? value.toString() : value.toFixed(1);
};

const ProgressHeaderCardBase: React.FC<ProgressHeaderCardProps> = ({ onRefresh }) => {
  const { timeframe, metrics, loading, error, setTimeframe, refresh } = useProgress();
  const handleRefresh = onRefresh ?? refresh;
  const triggerRefresh = () => {
    void handleRefresh();
  };
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [loading, timeframe]);

  const label = TIMEFRAME_LABELS[timeframe] ?? 'THIS WEEK';
  const streakValue = metrics?.streak_days ?? 0;
  const workoutValue = metrics?.workouts_completed ?? 0;
  const hoursValue = metrics?.total_hours ?? 0;

  return (
    <View testID="ProgressHeaderCard">
      <GlassCard
        variant="medium"
        radius={18}
        padding={isSmallScreen ? 12 : 16}
        style={styles.card}
      >
      <View style={styles.headerRow}>
        <Text style={[styles.title, isSmallScreen && styles.titleSmall]}>PROGRESS DASHBOARD</Text>
        <Pressable
          style={({ pressed }) => [styles.refreshButton, pressed && styles.refreshPressed]}
          onPress={triggerRefresh}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Refresh progress"
          accessibilityState={{ disabled: loading }}
          accessibilityHint="Reload progress metrics"
          testID="ProgressHeaderCard_RefreshButton"
        >
          <Ionicons name="refresh-outline" size={16} color={colors.text.primary} />
        </Pressable>
      </View>

      <TimeframeToggle
        activeTimeframe={timeframe}
        onTimeframeChange={setTimeframe}
        disabled={loading}
      />

      {error ? (
        <View style={styles.errorContainer}>
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.error.main} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.retryButton, pressed && styles.retryPressed]}
            onPress={triggerRefresh}
            accessibilityRole="button"
            accessibilityLabel="Retry loading progress"
          >
            <Ionicons name="reload" size={14} color={colors.primary.main} />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.metricsContainer}>
          <Text style={[styles.metricsLabel, isSmallScreen && styles.metricsLabelSmall]}>{label}</Text>
          {loading ? (
            <View style={styles.metricsLoading}>
              <SkeletonLoader width="40%" height={12} borderRadius={6} />
              <SkeletonLoader width="100%" height={14} borderRadius={6} style={styles.metricsSkeletonGap} />
            </View>
          ) : (
            <Text style={[styles.metricsLine, isSmallScreen && styles.metricsLineSmall]}>
              <Text style={styles.metricsKey}>Streak:</Text> {streakValue} days
              <Text style={styles.metricsSeparator}> | </Text>
              <Text style={styles.metricsKey}>Workouts:</Text> {workoutValue}
              <Text style={styles.metricsSeparator}> | </Text>
              <Text style={styles.metricsKey}>Hours:</Text> {formatHours(hoursValue)}
            </Text>
          )}
        </View>
      )}
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  titleSmall: {
    fontSize: 16,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass.surface,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  refreshPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  metricsContainer: {
    gap: 6,
  },
  metricsLabel: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  metricsLabelSmall: {
    fontSize: 11,
  },
  metricsLine: {
    color: colors.text.secondary,
    fontSize: 13,
    lineHeight: 18,
  },
  metricsLineSmall: {
    fontSize: 12,
  },
  metricsKey: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  metricsSeparator: {
    color: colors.text.tertiary,
  },
  metricsLoading: {
    gap: 8,
  },
  metricsSkeletonGap: {
    marginTop: 6,
  },
  errorContainer: {
    gap: 10,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: colors.text.secondary,
    fontSize: 12,
    flex: 1,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.glass.redBorder,
    backgroundColor: colors.glass.redSurface,
  },
  retryPressed: {
    opacity: 0.8,
  },
  retryText: {
    color: colors.primary.main,
    fontSize: 12,
    fontWeight: '700',
  },
});

export const ProgressHeaderCard = React.memo(ProgressHeaderCardBase);

export default ProgressHeaderCard;
