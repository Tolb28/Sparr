import { useEffect } from 'react';
import Animated, { Easing, SharedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors } from '@/src/theme/colors';

export interface GridLine {
  y: number;
  label: string;
}

export interface DataPoint {
  x: number;
  y: number;
  value: number;
  label: string;
}

const formatAxisLabel = (value: number) => {
  if (!Number.isFinite(value)) return '0';
  if (Number.isInteger(value)) return value.toString();
  if (Math.abs(value) >= 100) return value.toFixed(0);
  return value.toFixed(1);
};

const getNiceStep = (range: number) => {
  if (!Number.isFinite(range) || range <= 0) return 1;
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / Math.pow(10, exponent);
  let niceFraction = 1;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * Math.pow(10, exponent);
};

export function normalizeData(values: number[], min?: number, max?: number): number[] {
  if (!values.length) return [];
  const cleaned = values.map((val) => (Number.isFinite(val) ? val : 0));
  const resolvedMin = min ?? Math.min(...cleaned);
  const resolvedMax = max ?? Math.max(...cleaned);
  if (!Number.isFinite(resolvedMin) || !Number.isFinite(resolvedMax)) {
    return cleaned.map(() => 0);
  }
  const range = resolvedMax - resolvedMin;
  if (range === 0) {
    const baseline = resolvedMax === 0 ? 0 : 0.5;
    return cleaned.map(() => baseline);
  }
  return cleaned.map((val) => (val - resolvedMin) / range);
}

export function generateLinePath(
  normalizedData: number[],
  width: number,
  height: number,
  padding: number
): string {
  if (!normalizedData.length) return '';
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const step = normalizedData.length > 1 ? chartWidth / (normalizedData.length - 1) : 0;
  return normalizedData
    .map((value, index) => {
      const x = padding + (normalizedData.length > 1 ? step * index : chartWidth / 2);
      const y = padding + chartHeight - value * chartHeight;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

export function generateGridLines(maxValue: number, numLines: number = 5): GridLine[] {
  const safeLines = Math.max(2, numLines);
  if (!Number.isFinite(maxValue) || maxValue <= 0) {
    return Array.from({ length: safeLines }, (_, index) => ({
      y: 0,
      label: index === safeLines - 1 ? '0' : '',
    }));
  }
  const rawStep = maxValue / (safeLines - 1);
  const niceStep = getNiceStep(rawStep);
  const niceMax = niceStep * (safeLines - 1);
  return Array.from({ length: safeLines }, (_, index) => {
    const value = niceStep * index;
    return {
      y: value,
      label: formatAxisLabel(value),
    };
  });
}

export function generateDataPoints(
  normalizedData: number[],
  labels: string[],
  width: number,
  height: number,
  padding: number
): DataPoint[] {
  if (!normalizedData.length) return [];
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const step = normalizedData.length > 1 ? chartWidth / (normalizedData.length - 1) : 0;
  return normalizedData.map((value, index) => {
    const x = padding + (normalizedData.length > 1 ? step * index : chartWidth / 2);
    const y = padding + chartHeight - value * chartHeight;
    return {
      x,
      y,
      value,
      label: labels[index] ?? '',
    };
  });
}

export function animatePathStroke(duration: number = 800): SharedValue<number> {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) });
  }, [duration, progress]);
  return progress;
}

const metricColorMap: Record<string, string> = {
  workouts_completed: colors.primary.main,
  total_hours: colors.primary.light,
  streak_days: colors.warning.main,
  club_sessions: colors.info.main,
  interactions_count: colors.info.light,
  score: colors.success.main,
  skill_level: colors.primary.dark,
  intensity: colors.error.main,
};

export function getMetricColor(metricKey: string): string {
  return metricColorMap[metricKey] ?? colors.primary.main;
}

export function getTrendColor(trend: 'up' | 'down' | 'flat'): string {
  if (trend === 'up') return colors.success.main;
  if (trend === 'down') return colors.error.main;
  return colors.text.tertiary;
}
