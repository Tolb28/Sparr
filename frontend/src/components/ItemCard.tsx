import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { ServerIP } from '../api/tokenHandler';
import { colors } from '../theme';
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
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setImageUri(source_url ?? null);
   /* const fetchPreviewUrl = async () => {
      try {
        if (!itemType || !itemId) {
          setLoading(false);
          return;
        }

        const previewUrl = `${ServerIP}/auth/training/${itemType}s/${itemId}/preview`;
        const response = await fetch(previewUrl);
        
        if (response.ok) {
          const data = await response.json();
          if (data.url) {
            setImageUri(data.url);
          } else {
            console.warn('No URL in preview response for', itemType, itemId);
          }
        } else {
          console.warn(`Preview request failed with status ${response.status} for ${itemType}/${itemId}`);
        }
      } catch (err) {
        console.error(`Error fetching preview for ${itemType}/${itemId}:`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchPreviewUrl();
    */
  }, [itemType, itemId]);

  return (
    <Pressable onPress={onPress} className="flex-1 m-2 min-w-[45%]">
      <Box className="rounded-xl overflow-hidden border border-[#3a1d1d]" style={{ backgroundColor: '#341818' }}>
        {/* Image Container - Smaller */}
        <View className="w-full aspect-video items-center justify-center relative" style={{ backgroundColor: '#2a1414' }}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              className="w-full h-full"
              resizeMode="cover"
              onError={(error) => {
                console.error(`Image failed to load for ${itemType}/${itemId}:`, error);
                setImageUri(null);
              }}
              onLoad={() => {
                console.log(`Image loaded successfully for ${itemType}/${itemId}`);
              }}
            />
          ) : (
            <View className="w-full h-full items-center justify-center" style={{ backgroundColor: '#3a1d1d' }}>
              <Text className="text-xs text-center px-2" style={{ color: '#cb9090' }}>
                {loading ? 'Loading...' : 'No Image'}
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
            style={{ color: '#ffffff' }}
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
