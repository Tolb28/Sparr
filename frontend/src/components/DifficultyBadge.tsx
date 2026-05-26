import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { colors } from '@/src/theme/colors';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

type Size = 'sm' | 'md' | 'lg';

interface DifficultyBadgeProps {
  difficulty: DifficultyLevel;
  size?: Size;
}

const DIFFICULTY_COLORS: Record<DifficultyLevel, { bg: string; text: string; border: string }> = {
  'Beginner': {
    bg: '#10b981',
    text: '#ffffff',
    border: '#059669',
  },
  'Intermediate': {
    bg: '#f59e0b',
    text: '#ffffff',
    border: '#d97706',
  },
  'Advanced': {
    bg: '#ef4444',
    text: '#ffffff',
    border: '#dc2626',
  },
  'Expert': {
    bg: '#8b5cf6',
    text: '#ffffff',
    border: '#7c3aed',
  },
};

const SIZES: Record<Size, { padding: number; fontSize: number }> = {
  sm: { padding: 4, fontSize: 10 },
  md: { padding: 6, fontSize: 12 },
  lg: { padding: 8, fontSize: 14 },
};

export const DifficultyBadge: React.FC<DifficultyBadgeProps> = ({ difficulty, size = 'md' }) => {
  const colors_config = DIFFICULTY_COLORS[difficulty];
  const sizeConfig = SIZES[size];

  return (
    <View
      style={[
        styles.badge,
        {
          paddingHorizontal: sizeConfig.padding * 2,
          paddingVertical: sizeConfig.padding,
          backgroundColor: colors_config.bg,
          borderColor: colors_config.border,
        },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            color: colors_config.text,
            fontSize: sizeConfig.fontSize,
          },
        ]}
      >
        {difficulty}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontWeight: '600',
  },
});
