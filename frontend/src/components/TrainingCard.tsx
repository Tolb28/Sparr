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
import { ImageBackground, View } from 'react-native';

type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

function formatTime(t: string | null | undefined): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:${m} ${ampm}`;
}

interface TrainingCardProps {
  title: string;
  description?: string;
  length?: string;
  start_time?: string | null;
  components?: string[];
  trainingComponents?: any[];
  trainingName?: string;
  onStartPress?: () => void;
  onEditPress?: () => void;
  isLoading?: boolean;
  isEmpty?: boolean;
  isRestDay?: boolean;
}

export default function TrainingCard({
  title,
  description = 'No training selected for this day',
  length = '—',
  start_time = null,
  components = [],
  trainingComponents = [],
  trainingName = '',
  onStartPress = () => {},
  onEditPress = () => {},
  isLoading = false,
  isEmpty = false,
  isRestDay = false,
}: TrainingCardProps) {
  const navigation = useNavigation<RootNavigationProp>();
  const [descExpanded, setDescExpanded] = useState(false);
  const [contentExpanded, setContentExpanded] = useState(false);

  // Rest day styling - uses brand red with reduced opacity for visual consistency
  if (isRestDay) {
    return (
      <Box className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'rgba(242, 13, 13, 0.08)', borderColor: 'rgba(242, 13, 13, 0.25)' }}>
        <VStack className="px-5 py-6 items-center gap-4">
          <Box className="w-16 h-16 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(242, 13, 13, 0.15)' }}>
            <Ionicons name="hand-right-outline" size={32} color="rgba(242, 13, 13, 1)" />
          </Box>
          <VStack className="items-center gap-2">
            <Text className="text-xl font-bold" style={{ color: 'rgba(242, 13, 13, 1)' }}>Rest Day</Text>
            <Text className="text-sm text-center" style={{ color: 'rgba(242, 13, 13, 0.7)' }}>
              Recovery time — take it easy!
            </Text>
          </VStack>
        </VStack>
      </Box>
    );
  }

  // derive a banner image from training components if available
  const bannerImage: string | undefined = (() => {
    if (!trainingComponents || trainingComponents.length === 0) return undefined;
    const first = trainingComponents[0];
    return (first && (first.thumbnail || first.image || first.thumb_url)) || undefined;
  })();

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
    <Box className="rounded-2xl border border-[#2e1919] overflow-hidden" style={{ backgroundColor: '#221010' }}>
      {/* Banner/Header */}
      {bannerImage ? (
        <ImageBackground
          source={{ uri: bannerImage }}
          style={{ width: '100%', height: 190 }}
          imageStyle={{ resizeMode: 'cover' }}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', padding: 16, justifyContent: 'flex-end' }}>
            <Text className="text-2xl font-bold text-white">{isLoading ? 'Loading...' : title}</Text>
            <HStack className="items-center justify-between mt-3">
              <VStack>
                <Text className="text-xs text-white/75 uppercase">Duration</Text>
                <Text className="text-sm font-semibold text-white">{length}</Text>
              </VStack>
              {start_time && (
                <VStack className="items-end">
                  <Text className="text-xs text-white/75 uppercase">Time</Text>
                  <Text className="text-sm font-semibold text-white">{formatTime(start_time)}</Text>
                </VStack>
              )}
            </HStack>
          </View>
        </ImageBackground>
      ) : (
        <VStack className="px-5 py-4 border-b border-[#2e1919]" style={{ backgroundColor: '#2a1515' }}>
          <Text className="text-xl font-bold text-white mb-3">{isLoading ? 'Loading...' : title}</Text>
          <HStack className="gap-4">
            <VStack className="gap-1">
              <Text className="text-xs font-semibold text-[#cb9090] uppercase tracking-wider">Duration</Text>
              <Text className="text-sm font-semibold text-white">{length}</Text>
            </VStack>
            {start_time && (
              <VStack className="gap-1">
                <Text className="text-xs font-semibold text-[#cb9090] uppercase tracking-wider">Time</Text>
                <Text className="text-sm font-semibold text-white">{formatTime(start_time)}</Text>
              </VStack>
            )}
          </HStack>
        </VStack>
      )}

      {/* Content */}
      <VStack className="px-5 py-4 gap-4" style={{ backgroundColor: '#221010' }}>
        {/* Description Section */}
        <VStack className="gap-2">
          <Text className="text-sm font-semibold text-[#cb9090] uppercase tracking-wide">About</Text>
          <Text className="text-sm text-white/85 leading-6">
            {displayDescription}
          </Text>
          {shouldTruncateDesc && (
            <Pressable onPress={() => setDescExpanded(!descExpanded)} className="active:opacity-70">
              <HStack className="gap-1 items-center">
                <Text className="text-sm font-semibold text-primary-500">
                  {descExpanded ? 'Show less' : 'Show more'}
                </Text>
                <Ionicons 
                  name={descExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#f20d0d"
                />
              </HStack>
            </Pressable>
          )}
        </VStack>

        {/* Components Section */}
        {components.length > 0 && (
          <VStack className="gap-2">
            <Text className="text-sm font-semibold text-[#cb9090] uppercase tracking-wide">What's included</Text>
            <VStack className="gap-2">
              {displayComponents.map((component, idx) => (
                <HStack key={idx} className="gap-3">
                  <Box className="w-2 h-2 rounded-full bg-primary-500 mt-1.5" />
                  <Text className="text-sm text-white/80 flex-1">{component}</Text>
                </HStack>
              ))}
            </VStack>
            {components.length > MAX_VISIBLE_COMPONENTS && (
              <Pressable onPress={() => setContentExpanded(!contentExpanded)} className="active:opacity-70 mt-1">
                <HStack className="gap-1 items-center">
                  <Text className="text-sm font-semibold text-primary-500">
                    {contentExpanded ? 'Show less' : `Show ${components.length - MAX_VISIBLE_COMPONENTS} more`}
                  </Text>
                  <Ionicons 
                    name={contentExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#f20d0d"
                  />
                </HStack>
              </Pressable>
            )}
          </VStack>
        )}

        {isEmpty && (
          <Box className="rounded-lg px-4 py-3 border border-[#6d2e2e]" style={{ backgroundColor: '#341818' }}>
            <Text className="text-sm text-[#f5d6d6]">
              No training assigned for this day. Visit "Select Calendar" to choose a training schedule.
            </Text>
          </Box>
        )}
      </VStack>

      {/* Action Buttons */}
      <HStack className="px-5 py-4 gap-3 border-t border-[#2e1919]" style={{ backgroundColor: '#1a0c0c' }}>
        <Pressable
          className={`flex-1 rounded-lg px-5 py-3.5 items-center justify-center ${
            isButtonsDisabled 
              ? 'bg-gray-600' 
              : 'bg-primary-500 active:bg-primary-600'
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
              ? 'bg-[#2a1515] border border-[#472323]' 
              : 'bg-[#2a1515] border border-[#6d2e2e] active:bg-[#341818]'
          }`}
          onPress={onEditPress}
          disabled={isButtonsDisabled}
        >
          <Text className={`font-semibold ${isButtonsDisabled ? 'text-gray-400' : 'text-white'}`}>
            Edit
          </Text>
        </Pressable>
      </HStack>
    </Box>
  );
}
