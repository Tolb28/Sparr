import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/src/theme/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: 'default' | 'medium' | 'strong' | 'red';
  radius?: number;
  padding?: number;
}

const VARIANTS: Record<string, ViewStyle> = {
  default: {
    backgroundColor: colors.glass.surface,
    borderColor: colors.glass.border,
  },
  medium: {
    backgroundColor: colors.glass.surfaceMedium,
    borderColor: colors.glass.border,
  },
  strong: {
    backgroundColor: colors.glass.surfaceStrong,
    borderColor: colors.glass.borderStrong,
  },
  red: {
    backgroundColor: colors.glass.redSurface,
    borderColor: colors.glass.redBorder,
  },
};

export function GlassCard({
  children,
  style,
  variant = 'default',
  radius = 16,
  padding = 16,
}: GlassCardProps) {
  return (
    <View
      style={[
        styles.card,
        VARIANTS[variant],
        { borderRadius: radius, padding },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
});

export default GlassCard;
