import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export function EmptyState({ icon = 'search-outline', title, subtitle, style, children }: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={34} color={colors.text.tertiary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.glass.surface,
    borderWidth: 1, borderColor: colors.glass.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { color: colors.text.primary, fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  subtitle: { color: colors.text.tertiary, fontSize: 13, textAlign: 'center', lineHeight: 18 },
});

export default EmptyState;
