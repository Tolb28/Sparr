import React, { useState, useEffect } from 'react';
import { View, Image } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { ServerIP } from '../api/tokenHandler';
import { colors } from '../theme';

interface ItemCardProps {
  title: string;
  description?: string;
  source_url?: string | null;
  itemType?: 'drill' | 'technique' | 'combination';
  itemId?: number;
  onPress?: () => void;
}

export default function ItemCard({
  title,
  description,
  source_url,
  itemType,
  itemId,
  onPress,
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
      <Box className="rounded-lg overflow-hidden shadow-sm" style={{ backgroundColor: colors.card.background }}>
        {/* Image Container - Smaller */}
        <View className="w-full aspect-video items-center justify-center" style={{ backgroundColor: colors.neutral[200] }}>
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
            <View className="w-full h-full items-center justify-center" style={{ backgroundColor: colors.neutral[300] }}>
              <Text className="text-xs text-center px-2" style={{ color: colors.text.tertiary }}>
                {loading ? 'Loading...' : 'No Image'}
              </Text>
            </View>
          )}
        </View>

        {/* Content */}
        <VStack className="p-3">
          <Text
            className="font-bold text-base"
            numberOfLines={2}
            style={{ color: colors.text.primary }}
          >
            {title}
          </Text>
        </VStack>
      </Box>
    </Pressable>
  );
}
