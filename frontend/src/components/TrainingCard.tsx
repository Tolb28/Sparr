import React, { useState } from 'react';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface TrainingCardProps {
  title: string;
  description?: string;
  length?: string;
  components?: string[];
  trainingComponents?: any[];
  trainingName?: string;
  onStartPress?: () => void;
  onEditPress?: () => void;
  isLoading?: boolean;
  isEmpty?: boolean;
}

export default function TrainingCard({
  title,
  description = 'No training selected for this day',
  length = '—',
  components = [],
  trainingComponents = [],
  trainingName = '',
  onStartPress = () => {},
  onEditPress = () => {},
  isLoading = false,
  isEmpty = false,
}: TrainingCardProps) {
  const navigation = useNavigation<RootNavigationProp>();
  const [descExpanded, setDescExpanded] = useState(false);
  const [contentExpanded, setContentExpanded] = useState(false);

  const truncateLength = 120;
  const shouldTruncateDesc = description.length > truncateLength;
  const displayDescription = !descExpanded && shouldTruncateDesc 
    ? description.slice(0, truncateLength) + '...' 
    : description;

  const MAX_VISIBLE_COMPONENTS = 3;
  const displayComponents = !contentExpanded 
    ? components.slice(0, MAX_VISIBLE_COMPONENTS) 
    : components;

  const isButtonsDisabled = isEmpty || isLoading;

  const handleStartPress = () => {
    if (trainingComponents && trainingComponents.length > 0) {
      navigation.navigate('Training', { components: trainingComponents, trainingName });
    } else {
      onStartPress();
    }
  };

  return (
    <Box className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Header */}
      <VStack className="px-5 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900 mb-3">
          {isLoading ? 'Loading...' : title}
        </Text>
        
        {/* Training metadata */}
        <HStack className="gap-4">
          <VStack className="gap-1">
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</Text>
            <Text className="text-sm font-semibold text-gray-900">{length}</Text>
          </VStack>
        </HStack>
      </VStack>

      {/* Content */}
      <VStack className="px-5 py-4 gap-4">
        {/* Description Section */}
        <VStack className="gap-2">
          <Text className="text-sm font-semibold text-gray-700 uppercase tracking-wide">About</Text>
          <Text className="text-sm text-gray-600 leading-6">
            {displayDescription}
          </Text>
          {shouldTruncateDesc && (
            <Pressable onPress={() => setDescExpanded(!descExpanded)} className="active:opacity-70">
              <HStack className="gap-1 items-center">
                <Text className="text-sm font-semibold text-blue-600">
                  {descExpanded ? 'Show less' : 'Show more'}
                </Text>
                <Ionicons 
                  name={descExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#2563eb"
                />
              </HStack>
            </Pressable>
          )}
        </VStack>

        {/* Components Section */}
        {components.length > 0 && (
          <VStack className="gap-2">
            <Text className="text-sm font-semibold text-gray-700 uppercase tracking-wide">What's included</Text>
            <VStack className="gap-2">
              {displayComponents.map((component, idx) => (
                <HStack key={idx} className="gap-3">
                  <Box className="w-2 h-2 rounded-full bg-blue-600 mt-1.5" />
                  <Text className="text-sm text-gray-600 flex-1">{component}</Text>
                </HStack>
              ))}
            </VStack>
            {components.length > MAX_VISIBLE_COMPONENTS && (
              <Pressable onPress={() => setContentExpanded(!contentExpanded)} className="active:opacity-70 mt-1">
                <HStack className="gap-1 items-center">
                  <Text className="text-sm font-semibold text-blue-600">
                    {contentExpanded ? 'Show less' : `Show ${components.length - MAX_VISIBLE_COMPONENTS} more`}
                  </Text>
                  <Ionicons 
                    name={contentExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#2563eb"
                  />
                </HStack>
              </Pressable>
            )}
          </VStack>
        )}

        {isEmpty && (
          <Box className="bg-blue-50 rounded-lg px-4 py-3 border border-blue-200">
            <Text className="text-sm text-blue-900">
              No training assigned for this day. Visit "Select Calendar" to choose a training schedule.
            </Text>
          </Box>
        )}
      </VStack>

      {/* Action Buttons */}
      <HStack className="px-5 py-4 gap-3 border-t border-gray-100">
        <Pressable
          className={`flex-1 rounded-lg px-5 py-3.5 items-center justify-center ${
            isButtonsDisabled 
              ? 'bg-gray-200' 
              : 'bg-blue-600 active:bg-blue-700'
          }`}
          onPress={handleStartPress}
          disabled={isButtonsDisabled}
        >
          <Text className={`font-semibold ${isButtonsDisabled ? 'text-gray-500' : 'text-white'}`}>
            Start Training
          </Text>
        </Pressable>
        <Pressable
          className={`rounded-lg px-5 py-3.5 items-center justify-center ${
            isButtonsDisabled 
              ? 'bg-gray-100 border border-gray-200' 
              : 'bg-gray-100 border border-gray-300 active:bg-gray-200'
          }`}
          onPress={onEditPress}
          disabled={isButtonsDisabled}
        >
          <Text className={`font-semibold ${isButtonsDisabled ? 'text-gray-400' : 'text-gray-900'}`}>
            Edit
          </Text>
        </Pressable>
      </HStack>
    </Box>
  );
}
