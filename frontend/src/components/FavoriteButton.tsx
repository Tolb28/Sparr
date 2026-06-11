import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/src/hooks/useThemeColors';

interface FavoriteButtonProps {
  isFavorited?: boolean;
  onToggle?: (isFavorited: boolean) => Promise<void> | void;
  loading?: boolean;
  showCount?: boolean;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  isFavorited = false,
  onToggle,
  loading = false,
  showCount = false,
  count = 0,
  size = 'md',
}) => {
  const c = useThemeColors();
  const [liked, setLiked] = useState(isFavorited);
  const [isLoading, setIsLoading] = useState(false);

  const iconSizes = {
    sm: 18,
    md: 24,
    lg: 28,
  };

  const handlePress = async () => {
    if (isLoading || loading) return;

    setIsLoading(true);
    try {
      setLiked(!liked);
      if (onToggle) {
        await onToggle(!liked);
      }
    } catch (error) {
      // Revert on error
      setLiked(liked);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePress}
        disabled={isLoading || loading}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.pressed,
        ]}
        accessibilityLabel={liked ? 'Remove from favorites' : 'Add to favorites'}
        accessibilityRole="button"
        accessibilityState={{ selected: liked, busy: isLoading || loading }}
      >
        <Ionicons
          name={liked ? 'heart' : 'heart-outline'}
          size={iconSizes[size]}
          color={liked ? c.primary.main : c.text.secondary}
        />
      </Pressable>
      {showCount && count > 0 && (
        <Text style={[styles.countText, { color: c.text.secondary }]}>{count}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  button: {
    padding: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
