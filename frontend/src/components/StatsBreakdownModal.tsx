import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { Motion, MotionComponentProps } from '@legendapp/motion';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { GlassCard } from '@/components/ui/glass-card';
import { colors } from '@/src/theme/colors';
import { useProgress } from '@/src/context/ProgressContext';
import type { ProgressTimeframe, Snapshot } from '@/src/api/progress';
import { BarChart } from './charts/BarChart';
import { LineChart } from './charts/LineChart';

interface StatsBreakdownModalProps {
  isVisible: boolean;
  onClose: () => void;
  metricKey: string;
  metricLabel: string;
}

const CHART_TYPE_MAP: Record<string, 'line' | 'bar'> = {
  workouts_completed: 'line',
  streak_days: 'line',
  club_sessions: 'bar',
  interactions_count: 'line',
  score: 'line',
  skill_level: 'line',
  intensity: 'bar',
};

type SnapshotMetricKey = Exclude<keyof Snapshot, 'snapshot_date'>;

const SNAPSHOT_KEYS: SnapshotMetricKey[] = [
  'workouts_completed',
  'streak_days',
  'club_sessions',
  'interactions_count',
  'score',
];

const isSnapshotMetricKey = (key: string): key is SnapshotMetricKey =>
  SNAPSHOT_KEYS.includes(key as SnapshotMetricKey);

type MotionViewProps = React.ComponentProps<typeof View> &
  MotionComponentProps<typeof View, ViewStyle, unknown, unknown, unknown>;

const MotionView = Motion.View as React.ComponentType<MotionViewProps>;

const formatSnapshotLabel = (dateStr: string, timeframe: ProgressTimeframe) => {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  if (timeframe === 'week') {
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  }
  if (timeframe === 'month') {
    return date.toLocaleDateString(undefined, { day: 'numeric' });
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const getComparisonLabel = (timeframe: ProgressTimeframe) => {
  switch (timeframe) {
    case 'week':
      return 'THIS WEEK vs LAST WEEK';
    case 'month':
      return 'THIS MONTH vs LAST MONTH';
    case 'year':
      return 'THIS YEAR vs LAST YEAR';
    default:
      return 'ALL TIME vs PREVIOUS';
  }
};

export const StatsBreakdownModal: React.FC<StatsBreakdownModalProps> = ({
  isVisible,
  onClose,
  metricKey,
  metricLabel,
}) => {
  const { timeframe, snapshots, loading, error, refresh } = useProgress();
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [rendered, setRendered] = useState(isVisible);
  const [animateIn, setAnimateIn] = useState(isVisible);
  const exitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSmallScreen = width < 375;
  const isTablet = width >= 768;

  useEffect(() => {
    if (isVisible) {
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
      setRendered(true);
      requestAnimationFrame(() => setAnimateIn(true));
    } else {
      setAnimateIn(false);
      exitTimeoutRef.current = setTimeout(() => {
        setRendered(false);
      }, 220);
    }
    return () => {
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    };
  }, [isVisible]);

  const snapshotMetricKey = isSnapshotMetricKey(metricKey) ? metricKey : null;
  const data = useMemo(
    () => (snapshotMetricKey
      ? snapshots.map((snapshot) => Number(snapshot[snapshotMetricKey] ?? 0))
      : []),
    [snapshotMetricKey, snapshots]
  );
  const labels = useMemo(
    () => snapshots.map((snapshot) => formatSnapshotLabel(snapshot.snapshot_date, timeframe)),
    [snapshots, timeframe]
  );
  const chartData = data;
  const chartLabels = snapshotMetricKey ? labels : [];

  const total = useMemo(() => chartData.reduce((sum, value) => sum + value, 0), [chartData]);
  const average = useMemo(() => (chartData.length ? total / chartData.length : 0), [chartData, total]);
  const peakValue = useMemo(() => (chartData.length ? Math.max(...chartData) : 0), [chartData]);
  const peakIndex = useMemo(
    () => chartData.findIndex((value) => value === peakValue),
    [chartData, peakValue]
  );

  if (!rendered) return null;

  const chartType = CHART_TYPE_MAP[metricKey] ?? 'line';
  const chartWidth = Math.min(width - (isSmallScreen ? 24 : 32), isTablet ? 520 : 360);
  const chartHeight = isSmallScreen ? 200 : 240;
  const chartPadding = isSmallScreen ? 32 : 40;

  const isChartLoading = loading;
  const hasChartData = chartData.length > 0 && chartLabels.length > 0;
  const emptyMessage = snapshotMetricKey
    ? 'No data available for this timeframe.'
    : 'Detailed breakdown is coming soon for this metric.';
  const handleRetry = () => {
    refresh(true).catch(() => {});
  };

  return (
    <Modal visible={rendered} transparent animationType="none" onRequestClose={onClose}>
      <View style={[styles.overlay, isSmallScreen && styles.overlayCompact]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <MotionView
          style={[
            styles.modalCard,
            isSmallScreen ? styles.modalCardFull : styles.modalCardCentered,
          ]}
          animate={{
            opacity: animateIn ? 1 : 0,
            translateY: animateIn ? 0 : 24,
          }}
          transition={{ type: 'timing', duration: animateIn ? 300 : 200 }}
        >
          <View style={styles.header}>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close stats breakdown"
              testID="StatsBreakdownModal_Close"
            >
              <Ionicons name="chevron-back" size={20} color={colors.text.primary} />
            </Pressable>
            <Text style={styles.headerTitle} testID="StatsBreakdownModal_Title">
              {metricLabel.toUpperCase()}
            </Text>
            <View style={styles.closeSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.content,
              isSmallScreen && styles.contentCompact,
              { paddingBottom: (insets.bottom || 0) + 24 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              style={[styles.compareToggle, compareEnabled && styles.compareToggleActive]}
              onPress={() => setCompareEnabled((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel="Toggle comparison"
              accessibilityState={{ selected: compareEnabled }}
              testID="StatsBreakdownModal_CompareToggle"
            >
              <Ionicons
                name={compareEnabled ? 'swap-horizontal' : 'swap-horizontal-outline'}
                size={16}
                color={compareEnabled ? colors.text.primary : colors.text.secondary}
              />
              <Text style={compareEnabled ? styles.compareTextActive : styles.compareText}>
                {getComparisonLabel(timeframe)}
              </Text>
            </Pressable>

            {!snapshotMetricKey && (
              <GlassCard variant="medium" radius={16} padding={16} style={styles.infoCard}>
                <Text style={styles.infoText}>Detailed breakdown is coming soon for this metric.</Text>
              </GlassCard>
            )}

            <View
              style={styles.chartWrap}
              accessible
              accessibilityRole="image"
              accessibilityLabel={`${metricLabel} chart`}
              testID="StatsBreakdownModal_Chart"
            >
              {chartType === 'bar' ? (
                <BarChart
                  data={chartData}
                  labels={chartLabels}
                  width={chartWidth}
                  height={chartHeight}
                  padding={chartPadding}
                  showGrid
                  showValues={false}
                  isLoading={isChartLoading}
                  emptyMessage={hasChartData ? undefined : emptyMessage}
                />
              ) : (
                <LineChart
                  data={chartData}
                  labels={chartLabels}
                  width={chartWidth}
                  height={chartHeight}
                  padding={chartPadding}
                  showGrid
                  showDots
                  isLoading={isChartLoading}
                  emptyMessage={hasChartData ? undefined : emptyMessage}
                />
              )}
            </View>

            {error && (
              <GlassCard variant="medium" radius={16} padding={16} style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable
                  style={styles.retryButton}
                  onPress={handleRetry}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading progress data"
                  testID="StatsBreakdownModal_Retry"
                >
                  <Ionicons name="reload" size={14} color={colors.primary.main} />
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </GlassCard>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>BREAKDOWN</Text>
              {chartData.length ? (
                chartData.map((value, index) => (
                  <View key={`breakdown-${index}`} style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{chartLabels[index] || '—'}</Text>
                    <Text style={styles.breakdownValue}>{value}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No data available for this timeframe.</Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SUMMARY</Text>
              <View style={styles.summaryRow}>
                <GlassCard variant="default" radius={14} padding={14} style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Total</Text>
                  <Text style={styles.summaryValue}>{Math.round(total)}</Text>
                </GlassCard>
                <GlassCard variant="default" radius={14} padding={14} style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Avg</Text>
                  <Text style={styles.summaryValue}>{average.toFixed(2)}</Text>
                </GlassCard>
                <GlassCard variant="default" radius={14} padding={14} style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Peak</Text>
                  <Text style={styles.summaryValue}>
                    {peakValue} {peakIndex >= 0 ? `(${labels[peakIndex]})` : ''}
                  </Text>
                </GlassCard>
              </View>
            </View>
          </ScrollView>
        </MotionView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  overlayCompact: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  modalCard: {
    backgroundColor: colors.glass.surfaceStrong,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glass.border,
    overflow: 'hidden',
    maxHeight: '94%',
  },
  modalCardFull: {
    width: '100%',
    height: '100%',
    maxHeight: '100%',
    borderRadius: 0,
  },
  modalCardCentered: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 560,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeSpacer: {
    width: 44,
    height: 44,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  contentCompact: {
    padding: 12,
  },
  compareToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.glass.border,
    alignSelf: 'flex-start',
  },
  compareToggleActive: {
    backgroundColor: colors.glass.redSurface,
    borderColor: colors.glass.redBorder,
  },
  compareText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  compareTextActive: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  chartWrap: {
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: colors.glass.surface,
  },
  infoText: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  errorCard: {
    backgroundColor: colors.glass.surface,
    gap: 10,
  },
  errorText: {
    color: colors.error.main,
    fontSize: 12,
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
  retryText: {
    color: colors.primary.main,
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  breakdownLabel: {
    color: colors.text.secondary,
    fontSize: 13,
  },
  breakdownValue: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    color: colors.text.tertiary,
    fontSize: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    color: colors.text.tertiary,
    fontSize: 11,
    marginBottom: 4,
  },
  summaryValue: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default StatsBreakdownModal;
