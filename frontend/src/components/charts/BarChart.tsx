import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import Animated, {
  Easing,
  Extrapolate,
  SharedValue,
  interpolate,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SkeletonLoader } from '@/components/ui/skeleton-loader';
import { Text } from '@/components/ui/text';
import { colors } from '@/src/theme/colors';
import { generateGridLines, normalizeData } from './ChartUtils';

interface BarChartProps {
  data: number[];
  labels: string[];
  width?: number;
  height?: number;
  padding?: number;
  barColor?: string;
  barRadius?: number;
  animateDuration?: number;
  showValues?: boolean;
  onBarTap?: (index: number) => void;
  showGrid?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
}

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface BarItemProps {
  index: number;
  total: number;
  baseX: number;
  baseWidth: number;
  baseHeight: number;
  bottomY: number;
  radius: number;
  color: string;
  animation: SharedValue<number>;
  activeIndex: SharedValue<number>;
  onPress?: (index: number) => void;
}

const BarItem: React.FC<BarItemProps> = ({
  index,
  total,
  baseX,
  baseWidth,
  baseHeight,
  bottomY,
  radius,
  color,
  animation,
  activeIndex,
  onPress,
}) => {
  const animatedProps = useAnimatedProps(() => {
    const start = total > 1 ? index / total : 0;
    const end = total > 1 ? (index + 1) / total : 1;
    const barProgress = interpolate(animation.value, [start, end], [0, 1], Extrapolate.CLAMP);
    const scale = withTiming(activeIndex.value === index ? 1.05 : 1, { duration: 160 });
    const height = baseHeight * barProgress * scale;
    const width = baseWidth * scale;
    const x = baseX - (width - baseWidth) / 2;
    const y = bottomY - height;
    return {
      x,
      y,
      width,
      height,
      rx: radius,
      ry: radius,
    };
  });

  return (
    <AnimatedRect
      fill={color}
      animatedProps={animatedProps}
      onPress={() => onPress?.(index)}
    />
  );
};

const BarChartBase: React.FC<BarChartProps> = ({
  data,
  labels,
  width = 320,
  height = 200,
  padding = 40,
  barColor = colors.primary.main,
  barRadius = 4,
  animateDuration = 800,
  showValues = false,
  onBarTap,
  showGrid = true,
  isLoading = false,
  emptyMessage,
}) => {
  const safeData = useMemo(() => data.map((val) => (Number.isFinite(val) ? val : 0)), [data]);
  const maxValue = useMemo(() => (safeData.length ? Math.max(...safeData) : 0), [safeData]);
  const normalized = useMemo(() => normalizeData(safeData, 0, maxValue), [safeData, maxValue]);
  const gridLines = useMemo(
    () => (showGrid ? generateGridLines(maxValue, 5) : []),
    [maxValue, showGrid]
  );
  const labelStep = useMemo(
    () => Math.max(1, labels.length > 10 ? Math.ceil(labels.length / 8) : 1),
    [labels.length]
  );
  const gridMax = gridLines.length ? gridLines[gridLines.length - 1]?.y ?? maxValue : maxValue;

  const animation = useSharedValue(0);
  const activeIndex = useSharedValue(-1);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; value: number; label: string } | null>(null);

  useEffect(() => {
    animation.value = 0;
    animation.value = withTiming(1, { duration: animateDuration, easing: Easing.out(Easing.cubic) });
  }, [animateDuration, data, animation]);

  useEffect(() => {
    activeIndex.value = -1;
    setTooltip(null);
  }, [data, activeIndex]);

  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const count = data.length;
  const minBarWidth = 10;
  let gap = 12;
  let barWidth = count > 0 ? (chartWidth - gap * (count - 1)) / count : chartWidth;
  if (barWidth < minBarWidth && count > 1) {
    gap = Math.max(4, (chartWidth - minBarWidth * count) / (count - 1));
    barWidth = (chartWidth - gap * (count - 1)) / count;
  }

  if (isLoading) {
    return (
      <View style={[styles.placeholder, { width, height }]}>
        <SkeletonLoader width={width - 32} height={12} borderRadius={6} />
        <SkeletonLoader width={width - 48} height={12} borderRadius={6} style={styles.placeholderGap} />
        <SkeletonLoader width={width - 24} height={12} borderRadius={6} style={styles.placeholderGap} />
      </View>
    );
  }

  if (!data.length || !labels.length) {
    return (
      <View style={[styles.emptyState, { width, height }]}>
        <Text style={styles.emptyText}>{emptyMessage ?? 'No data available for this timeframe.'}</Text>
      </View>
    );
  }

  const handleBarPress = (index: number) => {
    const value = safeData[index] ?? 0;
    const label = labels[index] ?? '';
    const x = padding + index * (barWidth + gap) + barWidth / 2;
    const y = padding + chartHeight - normalized[index] * chartHeight;
    activeIndex.value = index;
    setTooltip({ x, y, value, label });
    onBarTap?.(index);
  };

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {gridLines.map((line, index) => {
          const y = padding + chartHeight - (gridMax ? (line.y / gridMax) * chartHeight : 0);
          return (
            <React.Fragment key={`grid-${index}`}>
              <Line x1={padding} x2={width - padding} y1={y} y2={y} stroke={colors.border.light} strokeWidth={1} opacity={0.35} />
              <SvgText x={padding - 8} y={y + 4} fontSize={10} fill={colors.text.tertiary} textAnchor="end">
                {line.label}
              </SvgText>
            </React.Fragment>
          );
        })}

        {normalized.map((value, index) => {
          const x = padding + index * (barWidth + gap);
          const baseHeight = value * chartHeight;
          return (
            <React.Fragment key={`bar-${index}`}>
              <BarItem
                index={index}
                total={count}
                baseX={x}
                baseWidth={barWidth}
                baseHeight={baseHeight}
                bottomY={padding + chartHeight}
                radius={barRadius}
                color={barColor}
                animation={animation}
                activeIndex={activeIndex}
                onPress={handleBarPress}
              />
              {showValues && (
                <SvgText
                  x={x + barWidth / 2}
                  y={padding + chartHeight - baseHeight - 8}
                  fontSize={10}
                  fill={colors.text.secondary}
                  textAnchor="middle"
                >
                  {safeData[index]?.toString() ?? '0'}
                </SvgText>
              )}
              {index % labelStep === 0 ? (
                <SvgText
                  x={x + barWidth / 2}
                  y={height - padding + 18}
                  fontSize={10}
                  fill={colors.text.tertiary}
                  textAnchor="middle"
                >
                  {labels[index] ?? ''}
                </SvgText>
              ) : null}
            </React.Fragment>
          );
        })}
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
          <View style={styles.tooltipBubble}>
            <View style={styles.tooltipRow}>
              <View style={[styles.tooltipDot, { backgroundColor: barColor }]} />
              <View>
                <Text style={styles.tooltipLabel}>{tooltip.label}</Text>
                <Text style={styles.tooltipValue}>{tooltip.value}</Text>
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
    backgroundColor: colors.glass.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  placeholderGap: {
    marginTop: 6,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.glass.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  emptyText: {
    color: colors.text.tertiary,
    fontSize: 12,
  },
  tooltip: {
    position: 'absolute',
    zIndex: 10,
  },
  tooltipBubble: {
    backgroundColor: colors.secondary.light,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tooltipLabel: {
    color: colors.text.tertiary,
    fontSize: 10,
    marginBottom: 2,
  },
  tooltipValue: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  tooltipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary.main,
  },
});

export const BarChart = React.memo(BarChartBase);

export default BarChart;
