import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';

type ContentType = 'technique' | 'drill' | 'combination';

interface ContentTypeIndicatorProps {
  type: ContentType;
  variant?: 'badge' | 'text' | 'compact';
}

const TYPE_CONFIG: Record<
  ContentType,
  {
    label: string;
    icon: string;
    color: string;
    bgColor: string;
  }
> = {
  technique: {
    label: 'Technique',
    icon: 'hand-right-outline',
    color: colors.primary.main,
    bgColor: 'rgba(139, 92, 246, 0.1)',
  },
  drill: {
    label: 'Drill',
    icon: 'repeat-outline',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
  },
  combination: {
    label: 'Combo',
    icon: 'layers-outline',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
  },
};

export const ContentTypeIndicator: React.FC<ContentTypeIndicatorProps> = ({
  type,
  variant = 'badge',
}) => {
  const config = TYPE_CONFIG[type];

  if (variant === 'text') {
    return (
      <Text style={[styles.text, { color: config.color }]}>
        {config.label}
      </Text>
    );
  }

  if (variant === 'compact') {
    return (
      <Ionicons name={config.icon as any} size={16} color={config.color} />
    );
  }

  // badge variant (default)
  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }]}>
      <Ionicons name={config.icon as any} size={14} color={config.color} />
      <Text style={[styles.badgeText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
