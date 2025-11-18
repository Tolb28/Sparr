import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import {
  Box,
  Text,
  Button,
  ButtonText,
  VStack,
  HStack,
  Heading,
  Divider,
} from '@gluestack-ui/themed';

const BOX_SIZE = 40;

export default function CalendarScreen() {
  const [descExpanded, setDescExpanded] = useState(false);
  const [contentExpanded, setContentExpanded] = useState(false);

  const description =
    'Lorem ipsum illium sebsum helium exostatic postmort sereium... (longer sample text to demonstrate truncation)';

  const contentItems = [
    'Jumping jacks (3 rounds, 1 minute)',
    'Push ups (3 rounds, 30s)',
    'Bodyweight squats (3 rounds, 45s)',
    'Plank (3 rounds, 60s)',
  ];

  return (
    <Box flex={1} bg="$backgroundLight0">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>

        {/* Calendar */}
        <HStack justifyContent="space-between" px="$1" mb="$4">
          {['M','T','W','T','F','S','S'].map((d, i) => (
            <VStack key={i} alignItems="center" width={BOX_SIZE}>
              <Text size="sm" color="$textDark700">{d}</Text>

              <Box
                width={BOX_SIZE}
                height={BOX_SIZE}
                rounded="$lg"
                mt="$1"
                bg="$white"
                borderWidth={1}
                borderColor="$coolGray300"
              />
            </VStack>
          ))}
        </HStack>

        {/* Large Box */}
        <HStack mb="$4">
          <Box
            width={BOX_SIZE}
            height={BOX_SIZE}
            rounded="$lg"
            bg="$white"
            borderWidth={1}
            borderColor="$coolGray300"
          />
        </HStack>

        {/* Card */}
        <Box
          bg="$white"
          p="$4"
          rounded="$xl"
          borderWidth={1}
          borderColor="$coolGray300"
        >
          {/* Title */}
          <Heading textAlign="center" size="lg" mb="$2">
            Current Training Title
          </Heading>

          <Divider my="$2" />

          {/* Length */}
          <HStack alignItems="center" mb="$1">
            <Text fontWeight="$semibold" mr="$2">Length:</Text>
            <Text color="$textDark700">1h 12m</Text>
          </HStack>

          {/* Description */}
          <Text fontWeight="$semibold" mt="$3">Description:</Text>
          <Text mt="$1" color="$textDark700" lineHeight="$sm">
            {descExpanded ? description : description.slice(0, 120) + (description.length > 120 ? '...' : '')}
            {description.length > 120 && (
              <Text
                color="$primary600"
                onPress={() => setDescExpanded(v => !v)}
              >
                {descExpanded ? ' (Show less)' : ' (Show more)'}
              </Text>
            )}
          </Text>

          {/* Content */}
          <Text fontWeight="$semibold" mt="$3">Content:</Text>
          <VStack mt="$1">
            {(contentExpanded ? contentItems : contentItems.slice(0, 3)).map((c, i) => (
              <Text key={i} color="$textDark700">- {c}</Text>
            ))}

            {contentItems.length > 3 && (
              <Text
                color="$primary600"
                mt="$1"
                onPress={() => setContentExpanded(v => !v)}
              >
                ({contentExpanded ? 'Show less' : 'Show more'})
              </Text>
            )}
          </VStack>

          {/* Buttons */}
          <HStack mt="$5" space="md">
            <Button flex={1} action="primary" onPress={() => {}}>
              <ButtonText>Start Training</ButtonText>
            </Button>

            <Button flex={1} variant="outline" action="secondary" onPress={() => {}}>
              <ButtonText>Edit Training</ButtonText>
            </Button>
          </HStack>
        </Box>

      </ScrollView>
    </Box>
  );
}

