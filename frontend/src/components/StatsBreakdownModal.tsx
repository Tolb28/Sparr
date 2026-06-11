import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { GlassCard } from '@/components/ui/glass-card';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useProgress } from '@/src/context/ProgressContext';
import type { ProgressTimeframe, Snapshot } from '@/src/api/progress';
import {
  buildDailySeries,
  fetchHoursBreakdown,
  fetchSessionsBreakdown,
  fetchStreakBreakdown,
  type DailySeriesPoint,
  type HoursBreakdownEntry,
  type SessionsBreakdownEntry,
  type StreakBreakdownEntry,
} from '@/src/api/progress';
import { getActiveProfileId } from '@/src/api/profileHandler';
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
  total_hours: 'bar',
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

const COMPARE_SHIFT_DAYS: Record<ProgressTimeframe, number> = {
  week: 7,
  month: 30,
  year: 365,
  lifetime: 3650,
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
  const c = useThemeColors();
  const { timeframe, metrics, snapshots, loading, error, refresh } = useProgress();
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [rendered, setRendered] = useState(isVisible);
  const [hoursBreakdown, setHoursBreakdown] = useState<HoursBreakdownEntry[]>([]);
  const [hoursLoading, setHoursLoading] = useState(false);
  const [sessionsBreakdown, setSessionsBreakdown] = useState<SessionsBreakdownEntry[]>([]);
  const [prevSessionsBreakdown, setPrevSessionsBreakdown] = useState<SessionsBreakdownEntry[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [streakBreakdown, setStreakBreakdown] = useState<StreakBreakdownEntry[]>([]);
  const [streakLoading, setStreakLoading] = useState(false);
  const isHoursMetric = metricKey === 'total_hours';
  const isSessionsMetric = metricKey === 'workouts_completed';
  const isStreakMetric = metricKey === 'streak_days';
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSmallScreen = width < 375;
  const isTablet = width >= 768;

  useEffect(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (isVisible) {
      setRendered(true);
    } else {
      hideTimer.current = setTimeout(() => setRendered(false), 250);
    }
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isHoursMetric || !isVisible) return;
    setHoursLoading(true);
    getActiveProfileId().then((pid) => {
      if (!pid) { setHoursLoading(false); return; }
      fetchHoursBreakdown(String(pid), timeframe)
        .then(setHoursBreakdown)
        .catch(() => setHoursBreakdown([]))
        .finally(() => setHoursLoading(false));
    });
  }, [isHoursMetric, isVisible, timeframe]);

  // Fetch current-period sessions breakdown for workouts_completed
  useEffect(() => {
    if (!isSessionsMetric || !isVisible) return;
    setSessionsLoading(true);
    getActiveProfileId().then((pid) => {
      if (!pid) { setSessionsLoading(false); return; }
      fetchSessionsBreakdown(String(pid), timeframe, false)
        .then(setSessionsBreakdown)
        .catch(() => setSessionsBreakdown([]))
        .finally(() => setSessionsLoading(false));
    });
  }, [isSessionsMetric, isVisible, timeframe]);

  // Fetch previous-period sessions breakdown when compare toggle is turned on
  useEffect(() => {
    if (!isSessionsMetric || !compareEnabled) {
      setPrevSessionsBreakdown([]);
      return;
    }
    getActiveProfileId().then((pid) => {
      if (!pid) return;
      fetchSessionsBreakdown(String(pid), timeframe, true)
        .then(setPrevSessionsBreakdown)
        .catch(() => setPrevSessionsBreakdown([]));
    });
  }, [isSessionsMetric, compareEnabled, timeframe]);

  // Fetch the per-day running streak (Mon=1, Tue=2, …) fresh each time, straight from the
  // dedicated endpoint — bypasses the snapshot path and its in-memory progress cache.
  useEffect(() => {
    if (!isStreakMetric || !isVisible) return;
    setStreakLoading(true);
    getActiveProfileId().then((pid) => {
      if (!pid) { setStreakLoading(false); return; }
      fetchStreakBreakdown(String(pid), timeframe)
        .then(setStreakBreakdown)
        .catch(() => setStreakBreakdown([]))
        .finally(() => setStreakLoading(false));
    });
  }, [isStreakMetric, isVisible, timeframe]);

  const snapshotMetricKey = isSnapshotMetricKey(metricKey) ? metricKey : null;

  // Build a continuous, zero-filled series for the selected timeframe so the chart and
  // breakdown have a gap-free axis. Sessions/hours sum per bucket; snapshot "level"
  // metrics (streak/score/…) take the latest value in each bucket.
  const series = useMemo<DailySeriesPoint[]>(() => {
    if (isSessionsMetric) {
      return buildDailySeries(timeframe, sessionsBreakdown, (e) => e.date, (e) => e.count, 'sum');
    }
    if (isHoursMetric) {
      return buildDailySeries(timeframe, hoursBreakdown, (e) => e.date, (e) => e.hours, 'sum');
    }
    if (isStreakMetric) {
      // 'last': the streak value is a running level, not additive; non-training days
      // have no entry and are zero-filled.
      return buildDailySeries(timeframe, streakBreakdown, (e) => e.date, (e) => e.streak, 'last');
    }
    if (snapshotMetricKey) {
      return buildDailySeries(
        timeframe,
        snapshots,
        (s) => s.snapshot_date,
        (s) => Number(s[snapshotMetricKey] ?? 0),
        'last'
      );
    }
    return [];
  }, [isSessionsMetric, isHoursMetric, isStreakMetric, snapshotMetricKey, timeframe, sessionsBreakdown, hoursBreakdown, streakBreakdown, snapshots]);

  const chartData = useMemo(() => series.map((p) => p.value), [series]);
  const chartLabels = useMemo(() => series.map((p) => p.label), [series]);

  // Align the previous window onto the same axis by anchoring the series one window back.
  const compareChartData = useMemo(() => {
    if (!(compareEnabled && isSessionsMetric && prevSessionsBreakdown.length > 0)) return undefined;
    const anchor = new Date();
    anchor.setDate(anchor.getDate() - (COMPARE_SHIFT_DAYS[timeframe] ?? 7));
    return buildDailySeries(
      timeframe,
      prevSessionsBreakdown,
      (e) => e.date,
      (e) => e.count,
      'sum',
      anchor
    ).map((p) => p.value);
  }, [compareEnabled, isSessionsMetric, prevSessionsBreakdown, timeframe]);

  const prevTotal = useMemo(
    () => prevSessionsBreakdown.reduce((sum, e) => sum + e.count, 0),
    [prevSessionsBreakdown]
  );

  // Use the authoritative per-timeframe metric value (same as the card). The backend now
  // scopes workouts/hours to the selected timeframe, so this matches the chart total.
  const current = isHoursMetric
    ? Math.round((metrics?.total_hours ?? 0) * 10) / 10
    : isSessionsMetric
      ? (metrics?.workouts_completed ?? 0)
      : (snapshotMetricKey && metrics
          ? Number(metrics[snapshotMetricKey as keyof typeof metrics] ?? 0)
          : 0);
  const peakValue = useMemo(() => (chartData.length ? Math.max(...chartData) : 0), [chartData]);
  const peakIndex = useMemo(
    () => chartData.findIndex((value) => value === peakValue),
    [chartData, peakValue]
  );
  const netChange = useMemo(() => {
    const raw = isSessionsMetric && compareEnabled
      ? current - prevTotal
      : chartData.length >= 2 ? chartData[chartData.length - 1] - chartData[0] : 0;
    // Round to avoid floating-point noise (e.g. 0.8 - 0.7 = 0.10000000000000009).
    return Math.round(raw * 10) / 10;
  }, [isSessionsMetric, compareEnabled, current, prevTotal, chartData]);
  const todayHours = useMemo(() => {
    if (!isHoursMetric) return null;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return hoursBreakdown.find((e) => e.date === todayStr)?.hours ?? 0;
  }, [isHoursMetric, hoursBreakdown]);

  if (!rendered) return null;

  const chartType = CHART_TYPE_MAP[metricKey] ?? 'line';
  const chartWidth = Math.min(width - (isSmallScreen ? 24 : 32), isTablet ? 520 : 360);
  const chartHeight = isSmallScreen ? 200 : 240;
  const chartPadding = isSmallScreen ? 32 : 40;

  const isChartLoading = isSessionsMetric ? sessionsLoading : isHoursMetric ? hoursLoading : isStreakMetric ? streakLoading : loading;
  const hasChartData = chartData.length > 0 && chartLabels.length > 0;
  const emptyMessage = (snapshotMetricKey || isHoursMetric || isSessionsMetric)
    ? 'No data available for this timeframe.'
    : 'Detailed breakdown is coming soon for this metric.';
  const handleRetry = () => {
    refresh(true).catch(() => {});
  };

  // Only show the compare toggle for metrics that have breakdown support
  const showCompareToggle = isSessionsMetric;

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: c.overlay.dark }, isSmallScreen && styles.overlayCompact]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.modalCard,
            { backgroundColor: c.background.secondary, borderColor: c.glass.border },
            isSmallScreen ? styles.modalCardFull : styles.modalCardCentered,
          ]}
        >
          <View style={[styles.header, { borderBottomColor: c.border.light }]}>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close stats breakdown"
              testID="StatsBreakdownModal_Close"
            >
              <Ionicons name="chevron-back" size={20} color={c.text.primary} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: c.text.primary }]} testID="StatsBreakdownModal_Title">
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
            {showCompareToggle && (
              <Pressable
                style={[styles.compareToggle, { borderColor: c.glass.border }, compareEnabled && { backgroundColor: c.glass.redSurface, borderColor: c.glass.redBorder }]}
                onPress={() => setCompareEnabled((prev) => !prev)}
                accessibilityRole="button"
                accessibilityLabel="Toggle comparison"
                accessibilityState={{ selected: compareEnabled }}
                testID="StatsBreakdownModal_CompareToggle"
              >
                <Ionicons
                  name={compareEnabled ? 'swap-horizontal' : 'swap-horizontal-outline'}
                  size={16}
                  color={compareEnabled ? c.text.primary : c.text.secondary}
                />
                <Text style={compareEnabled ? [styles.compareTextActive, { color: c.text.primary }] : [styles.compareText, { color: c.text.secondary }]}>
                  {getComparisonLabel(timeframe)}
                </Text>
              </Pressable>
            )}

            {!snapshotMetricKey && !isHoursMetric && !isSessionsMetric && (
              <GlassCard variant="medium" radius={16} padding={16} style={styles.infoCard}>
                <Text style={[styles.infoText, { color: c.text.secondary }]}>Detailed breakdown is coming soon for this metric.</Text>
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
                  compareData={compareChartData}
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
                <Text style={[styles.errorText, { color: c.error.main }]}>{error}</Text>
                <Pressable
                  style={[styles.retryButton, { borderColor: c.glass.redBorder, backgroundColor: c.glass.redSurface }]}
                  onPress={handleRetry}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading progress data"
                  testID="StatsBreakdownModal_Retry"
                >
                  <Ionicons name="reload" size={14} color={c.primary.main} />
                  <Text style={[styles.retryText, { color: c.primary.main }]}>Retry</Text>
                </Pressable>
              </GlassCard>
            )}

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: c.text.tertiary }]}>BREAKDOWN</Text>
              {chartData.length ? (
                chartData.map((value, index) => (
                  <View key={`breakdown-${index}`} style={[styles.breakdownRow, { borderBottomColor: c.border.light }]}>
                    <Text style={[styles.breakdownLabel, { color: c.text.secondary }]}>{chartLabels[index] || '—'}</Text>
                    <Text style={[styles.breakdownValue, { color: c.text.primary }]}>{value}</Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.emptyText, { color: c.text.tertiary }]}>No data available for this timeframe.</Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: c.text.tertiary }]}>SUMMARY</Text>
              <View style={styles.summaryRow}>
                <GlassCard variant="default" radius={14} padding={14} style={styles.summaryCard}>
                  <Text style={[styles.summaryLabel, { color: c.text.tertiary }]}>Total</Text>
                  <Text style={[styles.summaryValue, { color: c.text.primary }]}>{current}</Text>
                </GlassCard>
                <GlassCard variant="default" radius={14} padding={14} style={styles.summaryCard}>
                  <Text style={[styles.summaryLabel, { color: c.text.tertiary }]}>
                    {isSessionsMetric && compareEnabled ? 'vs Last' : 'Change'}
                  </Text>
                  <Text style={[styles.summaryValue, { color: c.text.primary }]}>{netChange >= 0 ? `+${netChange}` : `${netChange}`}</Text>
                </GlassCard>
                <GlassCard variant="default" radius={14} padding={14} style={styles.summaryCard}>
                  <Text style={[styles.summaryLabel, { color: c.text.tertiary }]}>{isHoursMetric ? 'Today' : 'Peak'}</Text>
                  <Text style={[styles.summaryValue, { color: c.text.primary }]}>
                    {isHoursMetric
                      ? todayHours
                      : `${peakValue}${peakIndex >= 0 ? ` (${chartLabels[peakIndex]})` : ''}`}
                  </Text>
                </GlassCard>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  overlayCompact: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1,
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
    alignSelf: 'flex-start',
  },
  compareText: {
    fontSize: 12,
    fontWeight: '600',
  },
  compareTextActive: {
    fontSize: 12,
    fontWeight: '700',
  },
  chartWrap: {
    alignItems: 'center',
  },
  infoCard: {},
  infoText: {
    fontSize: 12,
  },
  errorCard: {
    gap: 10,
  },
  errorText: {
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
  },
  retryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  breakdownLabel: {
    fontSize: 13,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
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
    fontSize: 11,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default StatsBreakdownModal;
