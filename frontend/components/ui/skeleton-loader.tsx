import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/src/theme/colors';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonLoader({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.65, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 750, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: colors.secondary.light, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.row}>
        <SkeletonLoader width={44} height={44} borderRadius={22} />
        <View style={styles.textBlock}>
          <SkeletonLoader height={14} width="58%" borderRadius={6} />
          <SkeletonLoader height={11} width="38%" borderRadius={6} style={styles.mt6} />
        </View>
      </View>
      <SkeletonLoader height={12} width="92%" borderRadius={6} style={styles.mt12} />
      <SkeletonLoader height={12} width="70%" borderRadius={6} style={styles.mt6} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    backgroundColor: colors.glass.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glass.border,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  textBlock: { flex: 1, gap: 6 },
  mt6: { marginTop: 6 },
  mt12: { marginTop: 12 },
});

export default SkeletonLoader;
