import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import Animated, { Easing, SharedValue, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { SkeletonLoader } from '@/components/ui/skeleton-loader';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import {
  animatePathStroke,
  generateDataPoints,
  generateGridLines,
  generateLinePath,
  normalizeData,
} from './ChartUtils';

interface LineChartProps {
  data: number[];
  labels: string[];
  width?: number;
  height?: number;
  padding?: number;
  color?: string;
  animateDuration?: number;
  showDots?: boolean;
  dotRadius?: number;
  onPointTap?: (index: number) => void;
  showGrid?: boolean;
  gridColor?: string;
  isLoading?: boolean;
  emptyMessage?: string;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ChartDotProps {
  index: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  strokeColor: string;
  activeIndex: SharedValue<number>;
  onPress?: (index: number) => void;
}

const ChartDot: React.FC<ChartDotProps> = ({ index, x, y, radius, color, strokeColor, activeIndex, onPress }) => {
  const animatedProps = useAnimatedProps(() => {
    const isActive = activeIndex.value === index;
    const animatedRadius = withTiming(isActive ? radius * 1.35 : radius, { duration: 160 });
    return { r: animatedRadius };
  });

  return (
    <AnimatedCircle
      cx={x}
      cy={y}
      fill={color}
      stroke={strokeColor}
      strokeWidth={1}
      onPress={() => onPress?.(index)}
      animatedProps={animatedProps}
    />
  );
};

const LineChartBase: React.FC<LineChartProps> = ({
  data,
  labels,
  width = 320,
  height = 200,
  padding = 40,
  color,
  animateDuration = 800,
  showDots = true,
  dotRadius = 4,
  onPointTap,
  showGrid = true,
  gridColor,
  isLoading = false,
  emptyMessage,
}) => {
  const c = useThemeColors();
  const resolvedColor = color ?? c.primary.main;
  const resolvedGridColor = gridColor ?? c.border.light;
  const safeData = useMemo(() => data.map((val) => (Number.isFinite(val) ? val : 0)), [data]);
  const maxValue = useMemo(() => (safeData.length ? Math.max(...safeData) : 0), [safeData]);
  const normalized = useMemo(() => normalizeData(safeData, 0, maxValue), [safeData, maxValue]);
  const points = useMemo(
    () => generateDataPoints(normalized, labels, width, height, padding),
    [normalized, labels, width, height, padding]
  );
  const path = useMemo(() => generateLinePath(normalized, width, height, padding), [normalized, width, height, padding]);
  const gridLines = useMemo(
    () => (showGrid ? generateGridLines(maxValue, 5) : []),
    [maxValue, showGrid]
  );
  const labelStep = useMemo(
    () => Math.max(1, labels.length > 10 ? Math.ceil(labels.length / 8) : 1),
    [labels.length]
  );
  const dotStep = useMemo(
    () => Math.max(1, points.length > 12 ? Math.ceil(points.length / 10) : 1),
    [points.length]
  );
  const gridMax = gridLines.length ? gridLines[gridLines.length - 1]?.y ?? maxValue : maxValue;

  const pathProgress = animatePathStroke(animateDuration);
  const activeIndex = useSharedValue(-1);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; value: number; label: string } | null>(null);

  useEffect(() => {
    activeIndex.value = -1;
    setTooltip(null);
  }, [data, activeIndex]);

  useEffect(() => {
    pathProgress.value = 0;
    pathProgress.value = withTiming(1, { duration: animateDuration, easing: Easing.out(Easing.cubic) });
  }, [animateDuration, path, pathProgress]);

  const animatedPathProps = useAnimatedProps(() => ({
    strokeDashoffset: 1 - pathProgress.value,
  }));

  const handlePointPress = (index: number) => {
    const point = points[index];
    if (!point) return;
    activeIndex.value = index;
    const value = safeData[index] ?? 0;
    setTooltip({ x: point.x, y: point.y, value, label: point.label });
    onPointTap?.(index);
  };

  if (isLoading) {
    return (
      <View style={[styles.placeholder, { width, height, backgroundColor: c.glass.surface, borderColor: c.glass.border }]}>
        <SkeletonLoader width={width - 32} height={12} borderRadius={6} />
        <SkeletonLoader width={width - 48} height={12} borderRadius={6} style={styles.placeholderGap} />
        <SkeletonLoader width={width - 24} height={12} borderRadius={6} style={styles.placeholderGap} />
      </View>
    );
  }

  if (!data.length || !labels.length) {
    return (
      <View style={[styles.emptyState, { width, height, backgroundColor: c.glass.surface, borderColor: c.glass.border }]}>
        <Text style={[styles.emptyText, { color: c.text.tertiary }]}>{emptyMessage ?? 'No data available for this timeframe.'}</Text>
      </View>
    );
  }

  const chartHeight = height - padding * 2;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {gridLines.map((line, index) => {
          const y = padding + chartHeight - (gridMax ? (line.y / gridMax) * chartHeight : 0);
          return (
            <React.Fragment key={`grid-${index}`}>
              <Line x1={padding} x2={width - padding} y1={y} y2={y} stroke={resolvedGridColor} strokeWidth={1} opacity={0.35} />
              <SvgText x={padding - 8} y={y + 4} fontSize={10} fill={c.text.tertiary} textAnchor="end">
                {line.label}
              </SvgText>
            </React.Fragment>
          );
        })}

        {path && (
          <AnimatedPath
            d={path}
            stroke={resolvedColor}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeDasharray="1"
            animatedProps={animatedPathProps}
          />
        )}

        {showDots &&
          points.map((point, index) =>
            index % dotStep === 0 ? (
              <ChartDot
                key={`dot-${index}`}
                index={index}
                x={point.x}
                y={point.y}
                radius={dotRadius}
                color={resolvedColor}
                strokeColor={c.text.primary}
                activeIndex={activeIndex}
                onPress={handlePointPress}
              />
            ) : null
          )}

        {points.map((point, index) =>
          index % labelStep === 0 ? (
            <SvgText
              key={`label-${index}`}
              x={point.x}
              y={height - padding + 18}
              fontSize={10}
              fill={c.text.tertiary}
              textAnchor="middle"
            >
              {point.label}
            </SvgText>
          ) : null
        )}
      </Svg>

      {tooltip && (
        <View
          style={[
            styles.tooltip,
            {
              left: Math.max(8, Math.min(tooltip.x - 28, width - 64)),
              top: Math.max(8, tooltip.y - 38),
            },
          ]}
        >
          <View style={[styles.tooltipBubble, { backgroundColor: c.secondary.light, borderColor: c.glass.border }]}>
            <View style={styles.tooltipRow}>
              <View style={[styles.tooltipDot, { backgroundColor: resolvedColor }]} />
              <View>
                <Text style={[styles.tooltipLabel, { color: c.text.tertiary }]}>{tooltip.label}</Text>
                <Text style={[styles.tooltipValue, { color: c.text.primary }]}>{tooltip.value}</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  placeholderGap: {
    marginTop: 6,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 12,
  },
  tooltip: {
    position: 'absolute',
    zIndex: 10,
  },
  tooltipBubble: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tooltipLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  tooltipValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  tooltipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

export const LineChart = React.memo(LineChartBase);

export default LineChart;
