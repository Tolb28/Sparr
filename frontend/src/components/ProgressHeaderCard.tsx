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
import { useThemeColors } from '@/src/hooks/useThemeColors';
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
  const c = useThemeColors();
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
        <Text style={[styles.title, { color: c.text.primary }, isSmallScreen && styles.titleSmall]}>PROGRESS DASHBOARD</Text>
        <Pressable
          style={({ pressed }) => [
            styles.refreshButton,
            { backgroundColor: c.glass.surface, borderColor: c.glass.border },
            pressed && styles.refreshPressed,
          ]}
          onPress={triggerRefresh}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Refresh progress"
          accessibilityState={{ disabled: loading }}
          accessibilityHint="Reload progress metrics"
          testID="ProgressHeaderCard_RefreshButton"
        >
          <Ionicons name="refresh-outline" size={16} color={c.text.primary} />
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
            <Ionicons name="alert-circle-outline" size={16} color={c.error.main} />
            <Text style={[styles.errorText, { color: c.text.secondary }]}>{error}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.retryButton,
              { borderColor: c.glass.redBorder, backgroundColor: c.glass.redSurface },
              pressed && styles.retryPressed,
            ]}
            onPress={triggerRefresh}
            accessibilityRole="button"
            accessibilityLabel="Retry loading progress"
          >
            <Ionicons name="reload" size={14} color={c.primary.main} />
            <Text style={[styles.retryText, { color: c.primary.main }]}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.metricsContainer}>
          <Text style={[styles.metricsLabel, { color: c.text.tertiary }, isSmallScreen && styles.metricsLabelSmall]}>{label}</Text>
          {loading ? (
            <View style={styles.metricsLoading}>
              <SkeletonLoader width="40%" height={12} borderRadius={6} />
              <SkeletonLoader width="100%" height={14} borderRadius={6} style={styles.metricsSkeletonGap} />
            </View>
          ) : (
            <Text style={[styles.metricsLine, { color: c.text.secondary }, isSmallScreen && styles.metricsLineSmall]}>
              <Text style={[styles.metricsKey, { color: c.text.primary }]}>Streak:</Text> {streakValue} {streakValue === 1 ? 'day' : 'days'}
              <Text style={[styles.metricsSeparator, { color: c.text.tertiary }]}> | </Text>
              <Text style={[styles.metricsKey, { color: c.text.primary }]}>Workouts:</Text> {workoutValue}
              <Text style={[styles.metricsSeparator, { color: c.text.tertiary }]}> | </Text>
              <Text style={[styles.metricsKey, { color: c.text.primary }]}>Hours:</Text> {formatHours(hoursValue)}
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
    borderWidth: 1,
  },
  refreshPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  metricsContainer: {
    gap: 6,
  },
  metricsLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  metricsLabelSmall: {
    fontSize: 11,
  },
  metricsLine: {
    fontSize: 13,
    lineHeight: 18,
  },
  metricsLineSmall: {
    fontSize: 12,
  },
  metricsKey: {
    fontWeight: '700',
  },
  metricsSeparator: {},
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
  },
  retryPressed: {
    opacity: 0.8,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export const ProgressHeaderCard = React.memo(ProgressHeaderCardBase);

export default ProgressHeaderCard;
