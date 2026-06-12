import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { DifficultyBadge, DifficultyLevel } from './DifficultyBadge';
import { FavoriteButton } from './FavoriteButton';
import { ContentTypeIndicator } from './ContentTypeIndicator';

interface ItemCardProps {
  title: string;
  description?: string;
  source_url?: string | null;
  itemType?: 'drill' | 'technique' | 'combination';
  itemId?: number;
  difficulty?: DifficultyLevel;
  isFavorited?: boolean;
  onPress?: () => void;
  onFavoriteToggle?: (isFavorited: boolean) => void;
}

export default function ItemCard({
  title,
  description,
  source_url,
  itemType,
  itemId,
  difficulty,
  isFavorited = false,
  onPress,
  onFavoriteToggle,
}: ItemCardProps) {
  const c = useThemeColors();
  const [imageUri, setImageUri] = useState<string | null>(source_url ?? null);
  const [failed, setFailed] = useState(false);

  // Keep the image in sync with the source_url prop. Depending on itemType/itemId
  // here would leave a late-arriving source_url stranded as a permanent placeholder.
  useEffect(() => {
    setImageUri(source_url ?? null);
    setFailed(false);
  }, [source_url]);

  return (
    <Pressable onPress={onPress} className="flex-1 m-2 min-w-[45%]">
      <Box className="rounded-xl overflow-hidden border" style={{ backgroundColor: c.background.tertiary, borderColor: c.border.light }}>
        {/* Image Container - Smaller */}
        <View className="w-full aspect-video items-center justify-center relative" style={{ backgroundColor: c.background.card }}>
          {imageUri && !failed ? (
            <Image
              source={{ uri: imageUri }}
              className="w-full h-full"
              resizeMode="cover"
              onError={(e) => {
                console.warn(`[ITEMCARD IMG ERROR] ${itemType}/${itemId} uri:`, imageUri, e.nativeEvent?.error);
                setFailed(true);
              }}
            />
          ) : (
            <View className="w-full h-full items-center justify-center" style={{ backgroundColor: c.border.light }}>
              <Text className="text-xs text-center px-2" style={{ color: c.text.secondary }}>
                No Image
              </Text>
            </View>
          )}

          {/* Badges Overlay */}
          <View style={styles.badgesContainer}>
            {itemType && <ContentTypeIndicator type={itemType} variant="compact" />}
            {difficulty && <DifficultyBadge difficulty={difficulty} size="sm" />}
          </View>

          {/* Favorite Button Overlay */}
          <View style={styles.favoriteContainer}>
            <FavoriteButton
              isFavorited={isFavorited}
              onToggle={onFavoriteToggle}
              size="md"
            />
          </View>
        </View>

        {/* Content */}
        <VStack className="p-3">
          <Text
            className="font-bold text-base"
            numberOfLines={2}
            style={{ color: c.text.primary }}
          >
            {title}
          </Text>
        </VStack>
      </Box>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badgesContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'column',
    gap: 6,
  },
  favoriteContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});
