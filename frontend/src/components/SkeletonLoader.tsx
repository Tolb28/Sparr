/**
 * Skeleton Loader Components
 * Match actual card shapes for smooth loading transitions
 * VISUAL_DENSITY: 4 (breathable spacing)
 */

import React, { useEffect, useState } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { useThemeColors } from '@/src/hooks/useThemeColors';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  animated?: boolean;
}

/**
 * Basic skeleton line (for text, titles)
 */
export function SkeletonLine({
  width = '100%',
  height = 16,
  borderRadius = 4,
  style,
  animated = true,
}: SkeletonLoaderProps) {
  const c = useThemeColors();
  const [opacity] = useState(new Animated.Value(0.4));

  useEffect(() => {
    if (!animated) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [animated, opacity]);

  const animatedStyle: any = {
    backgroundColor: c.glass.surfaceMedium,
    borderColor: c.glass.border,
    borderWidth: 1,
    width,
    height,
    borderRadius,
    opacity,
  };

  return (
    <Animated.View
      style={[
        animatedStyle,
        style,
      ]}
    />
  );
}

/**
 * Card skeleton - matches TrainingCard dimensions
 */
export function CardSkeleton() {
  const c = useThemeColors();
  const [opacity] = useState(new Animated.Value(0.4));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  const skeletonBannerStyle: any = {
    width: '100%',
    height: 190,
    backgroundColor: c.glass.surfaceMedium,
    opacity,
  };

  const skeletonLineStyle: any = {
    height: 14,
    backgroundColor: c.glass.surfaceMedium,
    borderRadius: 4,
    opacity,
  };

  const skeletonButtonStyle: any = {
    height: 44,
    flex: 1,
    backgroundColor: c.glass.surfaceMedium,
    borderRadius: 8,
    opacity,
  };

  return (
    <View style={[styles.cardSkeleton, { backgroundColor: c.background.card, borderColor: c.border.light }]}>
      {/* Banner placeholder */}
      <Animated.View style={skeletonBannerStyle} />

      {/* Content section */}
      <View style={styles.cardContent}>
        <Animated.View style={[skeletonLineStyle, { width: '70%' }]} />
        <Animated.View style={[skeletonLineStyle, { width: '100%', marginTop: 12 }]} />
        <Animated.View style={[skeletonLineStyle, { width: '85%', marginTop: 8 }]} />
      </View>

      {/* Button section */}
      <View style={[styles.cardButtons, { borderTopColor: c.border.light }]}>
        <Animated.View style={skeletonButtonStyle} />
        <Animated.View style={skeletonButtonStyle} />
      </View>
    </View>
  );
}

/**
 * Badge skeleton - matches BadgeCarousel
 */
export function BadgeSkeleton() {
  const c = useThemeColors();
  const [opacity] = useState(new Animated.Value(0.4));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  const badgeItemStyle: any = {
    width: 72,
    height: 96,
    borderRadius: 12,
    backgroundColor: c.glass.surfaceMedium,
    opacity,
  };

  return (
    <View style={styles.badgeSkeletonContainer}>
      {[...Array(4)].map((_, i) => (
        <Animated.View
          key={i}
          style={badgeItemStyle}
        />
      ))}
    </View>
  );
}

/**
 * List skeleton - multiple lines like a list item
 */
export function ListItemSkeleton() {
  const c = useThemeColors();
  const [opacity] = useState(new Animated.Value(0.4));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  const skeletonIconStyle: any = {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: c.glass.surfaceMedium,
    opacity,
  };

  const skeletonLineStyle: any = {
    height: 14,
    backgroundColor: c.glass.surfaceMedium,
    borderRadius: 4,
    opacity,
  };

  return (
    <View style={styles.listItemSkeleton}>
      {/* Icon placeholder */}
      <Animated.View style={skeletonIconStyle} />
      
      {/* Content */}
      <View style={styles.listItemContent}>
        <Animated.View style={[skeletonLineStyle, { width: '60%' }]} />
        <Animated.View style={[skeletonLineStyle, { width: '100%', marginTop: 8 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    borderWidth: 1,
  },
  cardSkeleton: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  skeletonBanner: {
    width: '100%',
    height: 190,
  },
  cardContent: {
    padding: 20,
    gap: 12,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 4,
  },
  cardButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  skeletonButton: {
    height: 44,
    flex: 1,
    borderRadius: 8,
  },
  badgeSkeletonContainer: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  badgeSkeletonItem: {
    width: 72,
    height: 96,
    borderRadius: 12,
  },
  listItemSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  listItemContent: {
    flex: 1,
    gap: 8,
  },
});
