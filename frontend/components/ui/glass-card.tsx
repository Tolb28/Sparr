import React from 'react';
import { View, StyleSheet, ViewStyle, Animated } from 'react-native';
import { useThemeColors } from '@/src/hooks/useThemeColors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: 'default' | 'medium' | 'strong' | 'red';
  radius?: number;
  padding?: number;
  animated?: boolean;
  animatedValue?: Animated.Value;
}

export function GlassCard({
  children,
  style,
  variant = 'default',
  radius = 16,
  padding = 16,
  animated = false,
  animatedValue,
}: GlassCardProps) {
  const c = useThemeColors();

  const variantStyle: ViewStyle = variant === 'red'
    ? { backgroundColor: c.glass.redSurface, borderColor: c.glass.redBorder }
    : variant === 'strong'
    ? { backgroundColor: c.glass.surfaceStrong, borderColor: c.glass.borderStrong }
    : variant === 'medium'
    ? { backgroundColor: c.glass.surfaceMedium, borderColor: c.glass.border }
    : { backgroundColor: c.glass.surface, borderColor: c.glass.border };

  const cardStyle = animated && animatedValue
    ? [styles.card, variantStyle, { borderRadius: radius, padding }, { transform: [{ scale: animatedValue }] }, style]
    : [styles.card, variantStyle, { borderRadius: radius, padding }, style];

  const Component = animated ? Animated.View : View;

  return (
    <Component style={cardStyle}>
      {children}
    </Component>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
});

export default GlassCard;
