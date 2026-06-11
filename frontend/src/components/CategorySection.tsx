import React from 'react';
import { View } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import ItemCard from './ItemCard';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { DifficultyLevel } from './DifficultyBadge';

interface Item {
  id_techniques?: number;
  id_drills?: number;
  id_combinations?: number;
  title: string;
  description?: string;
  source_url?: string | null;
  difficulty?: DifficultyLevel;
}

interface CategorySectionProps {
  categoryName: string;
  items: Item[];
  itemType?: 'drill' | 'technique' | 'combination';
  onItemPress: (item: Item, categoryName: string) => void;
  favorites?: Set<string>;
  onFavoriteToggle?: (itemKey: string) => void;
}

export default function CategorySection({
  categoryName,
  items,
  itemType,
  onItemPress,
  favorites = new Set(),
  onFavoriteToggle,
}: CategorySectionProps) {
  const c = useThemeColors();

  return (
    <VStack className="mb-6">
      {/* Category Heading */}
      <Box className="px-4 py-3" style={{ borderBottomColor: c.border.light, borderBottomWidth: 1 }}>
        <Text className="text-lg font-bold" style={{ color: c.text.primary }}>
          {categoryName}
        </Text>
      </Box>

      {/* Grid of Items */}
      <View className="flex-row flex-wrap px-2 py-3">
        {items.map((item) => {
          const id = item.id_techniques || item.id_drills || item.id_combinations;
          const type = itemType || (item.id_drills ? 'drill' : item.id_techniques ? 'technique' : 'combination');
          const itemKey = `${type}-${id}`;
          const isFavorited = favorites.has(itemKey);

          return (
            <ItemCard
              key={id}
              title={item.title}
              description={item.description}
              source_url={item.source_url}
              itemType={type as 'drill' | 'technique' | 'combination'}
              itemId={id}
              difficulty={item.difficulty}
              isFavorited={isFavorited}
              onPress={() => onItemPress(item, categoryName)}
              onFavoriteToggle={() => onFavoriteToggle?.(itemKey)}
            />
          );
        })}
      </View>
    </VStack>
  );
}
