import React from 'react';
import { View, Image } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';

interface ItemCardProps {
  title: string;
  description?: string;
  source?: string | null;
  onPress?: () => void;
}

export default function ItemCard({
  title,
  description,
  source,
  onPress,
}: ItemCardProps) {
  return (
    <Pressable onPress={onPress} className="flex-1 m-2 min-w-[45%]">
      <Box className="bg-white rounded-lg overflow-hidden shadow-sm">
        {/* Image Container - Smaller */}
        <View className="w-full aspect-video bg-gray-200 items-center justify-center">
          {source ? (
            <Image
              source={{ uri: source }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full bg-gray-300 items-center justify-center">
              <Text className="text-gray-500 text-xs">No Image</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <VStack className="p-3">
          <Text
            className="font-bold text-gray-900 text-base"
            numberOfLines={2}
          >
            {title}
          </Text>
        </VStack>
      </Box>
    </Pressable>
  );
}
