import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { colors } from '@/src/theme/colors';

interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  backgroundColor?: string;
  foregroundColor?: string;
  animateDuration?: number;
  milestones?: Array<{
    percent: number;
    label: string;
    color?: string;
  }>;
  useGradient?: boolean;
  gradientColors?: [string, string];
  centerContent?: React.ReactNode;
  animateOnMount?: boolean;
  accessibilityLabel?: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function ProgressRing({
  percent,
  size = 96,
  strokeWidth = 8,
  backgroundColor = colors.border.light,
  foregroundColor = colors.primary.main,
  animateDuration = 600,
  milestones,
  useGradient = false,
  gradientColors,
  centerContent,
  animateOnMount = true,
  accessibilityLabel,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const safePercent = Number.isFinite(percent) ? percent : 0;
  const clampedPercent = Math.max(0, Math.min(100, safePercent));
  const progress = useSharedValue(animateOnMount ? 0 : clampedPercent);
  const didMount = useRef(false);
  const springConfig = useMemo(
    () => ({ damping: 14, stiffness: animateDuration >= 600 ? 120 : 150 }),
    [animateDuration]
  );
  const gradientId = useMemo(
    () => `progress-gradient-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      if (animateOnMount) {
        progress.value = withSpring(clampedPercent, springConfig);
        return;
      }
    }
    progress.value = withSpring(clampedPercent, springConfig);
  }, [animateDuration, animateOnMount, clampedPercent, progress, springConfig]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circ - (progress.value / 100) * circ,
  }));

  const ringStroke = useGradient ? `url(#${gradientId})` : foregroundColor;
  const gradientStops = gradientColors ?? [colors.primary.main, colors.primary.dark];

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? `Progress ${Math.round(clampedPercent)}%`}
    >
      <Svg width={size} height={size}>
        {useGradient && (
          <Defs>
            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={gradientStops[0]} />
              <Stop offset="100%" stopColor={gradientStops[1]} />
            </LinearGradient>
          </Defs>
        )}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringStroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={`${circ}`}
          animatedProps={animatedProps}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
        {milestones?.map((milestone, index) => {
          const angle = (Math.min(100, Math.max(0, milestone.percent)) / 100) * 2 * Math.PI - Math.PI / 2;
          const x = size / 2 + Math.cos(angle) * radius;
          const y = size / 2 + Math.sin(angle) * radius;
          return (
            <Circle
              key={`milestone-${index}`}
              cx={x}
              cy={y}
              r={strokeWidth / 3}
              fill={milestone.color ?? colors.text.secondary}
            />
          );
        })}
      </Svg>
      <View style={styles.centerContent}>
        {centerContent ?? (
          <Text className="text-lg font-bold text-white">{Math.round(clampedPercent)}%</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
