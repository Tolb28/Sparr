import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { SkeletonLoader } from '@/components/ui/skeleton-loader';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/src/hooks/useThemeColors';
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

const BarChartBase: React.FC<BarChartProps> = ({
  data,
  labels,
  width = 320,
  height = 200,
  padding = 40,
  barColor,
  barRadius = 4,
  showValues = false,
  onBarTap,
  showGrid = true,
  isLoading = false,
  emptyMessage,
}) => {
  const c = useThemeColors();
  const resolvedBarColor = barColor ?? c.primary.main;
  const safeData = useMemo(() => data.map((val) => (Number.isFinite(val) ? val : 0)), [data]);
  const maxValue = useMemo(() => (safeData.length ? Math.max(...safeData) : 0), [safeData]);
  const gridLines = useMemo(
    () => (showGrid ? generateGridLines(maxValue, 5) : []),
    [maxValue, showGrid]
  );
  // Bars and gridlines must share the same scale, otherwise bars overshoot/undershoot the
  // axis labels. Use the "nice" grid max as the scale max when a grid is shown.
  const gridMax = gridLines.length ? gridLines[gridLines.length - 1]?.y ?? maxValue : maxValue;
  const scaleMax = gridMax || maxValue;
  const normalized = useMemo(() => normalizeData(safeData, 0, scaleMax), [safeData, scaleMax]);
  const labelStep = useMemo(
    () => Math.max(1, labels.length > 10 ? Math.ceil(labels.length / 8) : 1),
    [labels.length]
  );

  const [tooltip, setTooltip] = useState<{ x: number; y: number; value: number; label: string } | null>(null);

  // Reset the tooltip when the data actually changes (keyed on values, not the array ref).
  const dataKey = safeData.join('|');
  useEffect(() => {
    setTooltip(null);
  }, [dataKey]);

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

  const handleBarPress = (index: number) => {
    const value = safeData[index] ?? 0;
    const label = labels[index] ?? '';
    const x = padding + index * (barWidth + gap) + barWidth / 2;
    const y = padding + chartHeight - normalized[index] * chartHeight;
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
              <Line x1={padding} x2={width - padding} y1={y} y2={y} stroke={c.border.light} strokeWidth={1} opacity={0.35} />
              <SvgText x={padding - 8} y={y + 4} fontSize={10} fill={c.text.tertiary} textAnchor="end">
                {line.label}
              </SvgText>
            </React.Fragment>
          );
        })}

        {normalized.map((value, index) => {
          const x = padding + index * (barWidth + gap);
          // Keep small but non-zero values visible (a 0.3h bar shouldn't vanish).
          const baseHeight = value > 0 ? Math.max(value * chartHeight, 3) : 0;
          return (
            <React.Fragment key={`bar-${index}`}>
              <Rect
                x={x}
                y={padding + chartHeight - baseHeight}
                width={barWidth}
                height={baseHeight}
                rx={barRadius}
                ry={barRadius}
                fill={resolvedBarColor}
                onPress={() => handleBarPress(index)}
              />
              {showValues && (
                <SvgText
                  x={x + barWidth / 2}
                  y={padding + chartHeight - baseHeight - 8}
                  fontSize={10}
                  fill={c.text.secondary}
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
                  fill={c.text.tertiary}
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
          <View style={[styles.tooltipBubble, { backgroundColor: c.secondary.light, borderColor: c.glass.border }]}>
            <View style={styles.tooltipRow}>
              <View style={[styles.tooltipDot, { backgroundColor: resolvedBarColor }]} />
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

export const BarChart = React.memo(BarChartBase);

export default BarChart;
