import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';

export default function CalendarScreen() {
  const [descExpanded, setDescExpanded] = useState(false);
  const [contentExpanded, setContentExpanded] = useState(false);

  const description =
    'Lorem ipsum illium sebsum helium exostatic postmort sereium... (longer sample text)';
  const contentItems = [
    'Jumping jacks (3 rounds, 1 minute)',
    'Push ups (3 rounds, 30s)',
    'Bodyweight squats (3 rounds, 45s)',
    'Plank (3 rounds, 60s)',
  ];

  return (
    <Box className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Day header */}
        <VStack className="px-4 py-6 gap-4">
          <HStack className="justify-between px-1 mb-1.5">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => (
              <Text key={d} className="text-sm text-gray-700 w-9 text-center">
                {d}
              </Text>
            ))}
          </HStack>

          {/* Calendar boxes row */}
          <HStack className="justify-between mb-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Box
                key={i}
                className="w-9 h-9 border border-gray-300 rounded bg-white"
              />
            ))}
          </HStack>

          {/* Larger box */}
          <VStack className="mb-4">
            <Box className="w-9 h-9 border border-gray-300 rounded bg-white" />
          </VStack>

          {/* Training card */}
          <Box className="bg-white rounded-lg p-3.5 border border-gray-200">
            <Text className="text-lg font-semibold text-center mb-3">
              Current Training Title
            </Text>

            <HStack className="mb-1.5">
              <Text className="font-semibold mr-2">Length:</Text>
              <Text className="text-gray-700">1h 12m</Text>
            </HStack>

            <HStack className="mb-2">
              <Text className="font-semibold mr-2">Description:</Text>
            </HStack>
            <Text className="text-gray-700 leading-5 mt-1">
              {descExpanded
                ? description
                : description.slice(0, 120) + '...'}
              {description.length > 120 && (
                <Text
                  className="text-blue-500"
                  onPress={() => setDescExpanded(!descExpanded)}
                >
                  {' '}
                  ({descExpanded ? 'Show less' : 'Show more'})
                </Text>
              )}
            </Text>

            <VStack className="mt-3">
              <Text className="font-semibold mb-2">Content:</Text>
              {(contentExpanded ? contentItems : contentItems.slice(0, 3)).map(
                (c, i) => (
                  <Text key={i} className="text-gray-700 mt-1">
                    - {c}
                  </Text>
                )
              )}
              {contentItems.length > 3 && (
                <Text
                  className="text-blue-500 mt-2"
                  onPress={() => setContentExpanded(!contentExpanded)}
                >
                  ({contentExpanded ? 'Show less' : 'Show more'})
                </Text>
              )}
            </VStack>

            <HStack className="mt-3 gap-2">
              <Pressable
                className="flex-1 bg-gray-800 rounded px-4 py-2.5 items-center justify-center"
                onPress={() => {}}
              >
                <Text className="text-white font-semibold">Start Training</Text>
              </Pressable>
              <Pressable
                className="bg-gray-200 rounded px-4 py-2.5 items-center justify-center min-w-max"
                onPress={() => {}}
              >
                <Text className="text-gray-800 font-semibold">Edit Training</Text>
              </Pressable>
            </HStack>
          </Box>
        </VStack>
      </ScrollView>
    </Box>
  );
}

