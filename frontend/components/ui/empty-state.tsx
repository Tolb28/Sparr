import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/src/hooks/useThemeColors';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export function EmptyState({ icon = 'search-outline', title, subtitle, style, children }: EmptyStateProps) {
  const c = useThemeColors();
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconWrap, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]}>
        <Ionicons name={icon} size={34} color={c.text.tertiary} />
      </View>
      <Text style={[styles.title, { color: c.text.primary }]}>{title}</Text>
      {!!subtitle && <Text style={[styles.subtitle, { color: c.text.tertiary }]}>{subtitle}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});

export default EmptyState;
