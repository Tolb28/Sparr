import React from 'react';
import { View } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import ItemCard from './ItemCard';

interface Item {
  id_techniques?: number;
  id_drills?: number;
  id_combinations?: number;
  title: string;
  description?: string;
  source?: string | null;
}

interface CategorySectionProps {
  categoryName: string;
  items: Item[];
  onItemPress: (item: Item) => void;
}

export default function CategorySection({
  categoryName,
  items,
  onItemPress,
}: CategorySectionProps) {
  return (
    <VStack className="mb-6">
      {/* Category Heading */}
      <Box className="px-4 py-3 border-b border-gray-200">
        <Text className="text-lg font-bold text-gray-900">
          {categoryName}
        </Text>
      </Box>

      {/* Grid of Items */}
      <View className="flex-row flex-wrap px-2 py-3">
        {items.map((item) => {
          const id = item.id_techniques || item.id_drills || item.id_combinations;
          return (
            <ItemCard
              key={id}
              title={item.title}
              description={item.description}
              source={item.source}
              onPress={() => onItemPress(item)}
            />
          );
        })}
      </View>
    </VStack>
  );
}
