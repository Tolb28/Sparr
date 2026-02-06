import React, { useEffect, useState, useRef } from 'react';
import { ScrollView, View, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

type TrainingScreenRouteProp = RouteProp<RootStackParamList, 'Training'>;
type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface TrainingComponent {
  id?: number;
  drill_title?: string;
  combination_title?: string;
  technique_title?: string;
  title?: string;
  description?: string;
  source?: string | null;
  video_url?: string | null;
  length?: number | string;
  reps?: number | string;
  sets?: number | string;
  drill_id?: number;
  combination_id?: number;
  technique_id?: number;
}

interface TrainingParams {
  components: TrainingComponent[];
  trainingName?: string;
}

export default function TrainingScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<TrainingScreenRouteProp>();
  
  const { components = [], trainingName = '' } = route.params as TrainingParams;
  
  const [currentComponentIndex, setCurrentComponentIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentComponent = components[currentComponentIndex];
  const componentSets = currentComponent?.sets ? Number(currentComponent.sets) : 1;
  const componentTime = currentComponent?.length ? Number(currentComponent.length) : null;
  const hasTime = componentTime !== null && componentTime > 0;
  const hasReps = currentComponent?.reps !== undefined && currentComponent?.reps !== null;
  const hasMultipleSets = componentSets > 1;

  // Get display name
  const getComponentName = () => {
    return currentComponent?.drill_title 
      || currentComponent?.combination_title 
      || currentComponent?.technique_title 
      || currentComponent?.title 
      || 'Training Component';
  };

  // Calculate total units (each component with sets counts as that many units)
  const calculateTotalUnits = () => {
    return components.reduce((acc, comp) => {
      const sets = comp.sets ? Number(comp.sets) : 1;
      return acc + sets;
    }, 0);
  };

  // Calculate current progress in units
  const calculateCurrentUnit = () => {
    let currentUnit = 0;
    for (let i = 0; i < currentComponentIndex; i++) {
      const sets = components[i].sets ? Number(components[i].sets) : 1;
      currentUnit += sets;
    }
    currentUnit += currentSetIndex; // Add current set index
    return currentUnit;
  };

  const totalUnits = calculateTotalUnits();
  const currentUnit = calculateCurrentUnit();
  const progressPercentage = (currentUnit / totalUnits) * 100;

  // Initialize timer when component loads or changes
  useEffect(() => {
    if (hasTime && timeRemaining === null) {
      setTimeRemaining(componentTime);
    }
  }, [currentComponentIndex, currentSetIndex]);

  // Timer effect
  useEffect(() => {
    if (!hasTime) return;

    if (isRunning && timeRemaining !== null && timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(prev => {
          if (prev !== null && prev > 1) {
            return prev - 1;
          } else {
            // Time's up, move to next
            setIsRunning(true);
            handleAutoNext();
            return 0;
          }
        });
      }, 1000);
    } else if (timeRemaining === 0) {
      setIsRunning(false);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRunning, timeRemaining, hasTime]);

  const handleAutoNext = () => {
    if (hasMultipleSets && currentSetIndex < componentSets - 1) {
      // Move to next set
      setCurrentSetIndex(prev => prev + 1);
      setTimeRemaining(componentTime);
      // Keep isRunning true so timer continues
    } else {
      // Move to next component
      if (currentComponentIndex < components.length - 1) {
        const nextIndex = currentComponentIndex + 1;
        const nextComponent = components[nextIndex];
        const nextHasTime = nextComponent?.length ? Number(nextComponent.length) > 0 : false;
        
        setCurrentComponentIndex(nextIndex);
        setCurrentSetIndex(0);
        setTimeRemaining(null);
        
        // Keep isRunning true if next component has time, otherwise stop
        if (!nextHasTime) {
          setIsRunning(false);
        }
      } else {
        // Training complete
        setIsCompleted(true);
      }
    }
  };

  const handleSkip = () => {
    if (hasMultipleSets && currentSetIndex < componentSets - 1) {
      setCurrentSetIndex(prev => prev + 1);
      setTimeRemaining(componentTime);
      setIsRunning(false);
    } else {
      if (currentComponentIndex < components.length - 1) {
        setCurrentComponentIndex(prev => prev + 1);
        setCurrentSetIndex(0);
        setTimeRemaining(null);
        setIsRunning(false);
      } else {
        setIsCompleted(true);
      }
    }
  };

  const handleGoNext = () => {
    handleSkip();
  };

  const handleToggleTimer = () => {
    if (hasTime) {
      setIsRunning(!isRunning);
    }
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isCompleted) {
    return (
      <CompletionScreen
        trainingName={trainingName || 'Your Training'}
        onClose={() => navigation.goBack()}
      />
    );
  }

  if (components.length === 0) {
    return (
      <Box className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background.secondary }}>
        <VStack className="items-center gap-4 px-6">
          <Ionicons name="alert-circle-outline" size={48} color={colors.text.secondary} />
          <Text className="text-lg font-semibold text-center" style={{ color: colors.text.primary }}>
            No training components available
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            className="px-6 py-3 rounded-lg mt-4"
            style={{ backgroundColor: colors.primary.dark }}
          >
            <Text style={{ color: colors.text.inverse }}>Go Back</Text>
          </Pressable>
        </VStack>
      </Box>
    );
  }

  const videoUri = currentComponent?.video_url || currentComponent?.source;

  return (
    <Box className="flex-1" style={{ backgroundColor: colors.background.secondary }}>
      {/* Header */}
      <HStack className="pt-12 px-4 pb-4 items-center justify-between" style={{ backgroundColor: colors.card.background, borderBottomColor: colors.border.light, borderBottomWidth: 1 }}>
        <HStack className="items-center gap-3 flex-1">
          <Pressable onPress={() => navigation.goBack()} className="p-2">
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </Pressable>
          <Text className="text-lg font-bold" style={{ color: colors.text.primary }}>
            {trainingName || 'Training'}
          </Text>
        </HStack>
        <Text className="text-sm font-semibold" style={{ color: colors.text.secondary }}>
          {currentComponentIndex + 1}/{components.length}
        </Text>
      </HStack>

      {/* Content - ScrollView with pb for sticky progress bar */}
      <ScrollView className="flex-1 pb-20">
        <VStack className="gap-6 pb-8">
          {/* Video Section */}
          {videoUri ? (
            <VideoPlayerComponent videoUri={videoUri} />
          ) : (
            <Box className="w-full aspect-video items-center justify-center" style={{ backgroundColor: colors.neutral[200] }}>
              <Ionicons name="videocam-outline" size={48} color={colors.text.tertiary} />
            </Box>
          )}

          {/* Title with Sets */}
          <VStack className="px-4 gap-2">
            <HStack className="items-center justify-between">
              <Text className="text-3xl font-bold flex-1 text-center" style={{ color: colors.text.primary }}>
                {getComponentName()}
              </Text>
            </HStack>
            {hasMultipleSets && (
              <Text className="text-sm font-semibold text-center" style={{ color: colors.text.secondary }}>
                Set {currentSetIndex + 1} of {componentSets}
              </Text>
            )}
          </VStack>

          {/* Timer Section */}
          {hasTime && timeRemaining !== null && (
            <VStack className="px-4 gap-4">
              <VStack className="gap-3">
                {/* Timer display */}
                <Box className="items-center gap-2">
                  <Text
                    className="text-6xl font-bold font-mono"
                    style={{ color: timeRemaining <= 5 ? '#ef4444' : colors.text.primary }}
                  >
                    {formatTime(timeRemaining)}
                  </Text>
                </Box>

                {/* Timer controls */}
                <HStack className="gap-3 items-center justify-center">
                  <Pressable
                    onPress={handleToggleTimer}
                    className="flex-1 rounded-lg py-3 items-center justify-center active:opacity-80"
                    style={{ backgroundColor: colors.primary.dark }}
                  >
                    <HStack className="items-center gap-2">
                      <Ionicons
                        name={isRunning ? 'pause' : 'play'}
                        size={20}
                        color={colors.text.inverse}
                      />
                      <Text style={{ color: colors.text.inverse }} className="font-semibold">
                        {isRunning ? 'Pause' : 'Start'}
                      </Text>
                    </HStack>
                  </Pressable>

                  <Pressable
                    onPress={handleSkip}
                    className="flex-1 rounded-lg py-3 items-center justify-center active:opacity-80 border"
                    style={{ backgroundColor: colors.neutral[100], borderColor: colors.border.light }}
                  >
                    <HStack className="items-center gap-2">
                      <Ionicons name="play-forward" size={20} color={colors.text.primary} />
                      <Text style={{ color: colors.text.primary }} className="font-semibold">
                        Skip
                      </Text>
                    </HStack>
                  </Pressable>
                </HStack>
              </VStack>
            </VStack>
          )}

          {/* Reps Section */}
          {hasReps && !hasTime && (
            <VStack className="px-4 gap-4">
              <Box className="items-center gap-2">
                <Text className="text-lg font-semibold" style={{ color: colors.text.secondary }}>
                  Complete all reps
                </Text>
                <Text className="text-4xl font-bold" style={{ color: colors.primary.dark }}>
                  {currentComponent.reps} Reps
                </Text>
              </Box>
              <Pressable
                onPress={handleGoNext}
                className="rounded-lg py-4 items-center justify-center active:opacity-80"
                style={{ backgroundColor: colors.primary.dark }}
              >
                <HStack className="items-center gap-2">
                  <Text style={{ color: colors.text.inverse }} className="font-semibold text-base">
                    Go Next
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.text.inverse} />
                </HStack>
              </Pressable>
            </VStack>
          )}

          {/* No timer/reps message */}
          {!hasTime && !hasReps && (
            <VStack className="px-4 gap-4">
              <Box className="items-center gap-2">
                <Ionicons name="checkmark-circle" size={40} color={colors.primary.dark} />
                <Text className="text-lg font-semibold" style={{ color: colors.text.secondary }}>
                  Complete this exercise
                </Text>
              </Box>
              <Pressable
                onPress={handleGoNext}
                className="rounded-lg py-4 items-center justify-center active:opacity-80"
                style={{ backgroundColor: colors.primary.dark }}
              >
                <HStack className="items-center gap-2">
                  <Text style={{ color: colors.text.inverse }} className="font-semibold text-base">
                    Go Next
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.text.inverse} />
                </HStack>
              </Pressable>
            </VStack>
          )}

          {/* Description Section */}
          {currentComponent?.description && (
            <VStack className="px-4 gap-2">
              <Text className="text-sm font-semibold uppercase tracking-wide" style={{ color: colors.text.tertiary }}>
                Description
              </Text>
              <Text
                className="text-sm leading-6"
                style={{ color: colors.text.secondary }}
                numberOfLines={descriptionExpanded ? undefined : 3}
              >
                {currentComponent.description}
              </Text>
              {currentComponent.description.length > 150 && (
                <Pressable
                  onPress={() => setDescriptionExpanded(!descriptionExpanded)}
                  className="active:opacity-70 mt-1"
                >
                  <HStack className="gap-1 items-center">
                    <Text className="text-sm font-semibold" style={{ color: colors.primary.dark }}>
                      {descriptionExpanded ? 'Show less' : 'Show more'}
                    </Text>
                    <Ionicons
                      name={descriptionExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.primary.dark}
                    />
                  </HStack>
                </Pressable>
              )}
            </VStack>
          )}
        </VStack>
      </ScrollView>

      {/* Sticky Progress Bar at Bottom */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
          paddingVertical: 16,
          backgroundColor: colors.card.background,
          borderTopColor: colors.border.light,
          borderTopWidth: 1,
        }}
      >
        <VStack className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.text.tertiary }}>
            Overall Progress
          </Text>
          <View
            style={{
              width: '100%',
              height: 8,
              borderRadius: 999,
              overflow: 'hidden',
              backgroundColor: colors.neutral[200],
            }}
          >
            <View
              style={{
                width: `${progressPercentage}%`,
                height: '100%',
                borderRadius: 999,
                backgroundColor: colors.primary.dark,
              }}
            />
          </View>
          <Text className="text-xs text-right" style={{ color: colors.text.secondary }}>
            {currentUnit + 1} / {totalUnits}
          </Text>
        </VStack>
      </View>
    </Box>
  );
}

function VideoPlayerComponent({ videoUri }: { videoUri: string }) {
  const player = useVideoPlayer(videoUri, player => {
    player.loop = true;
    player.play();
  });

  return (
    <Box className="w-full aspect-video bg-black items-center justify-center relative">
      <VideoView
        style={{ width: '100%', height: '100%' }}
        player={player}
        allowsFullscreen
      />
    </Box>
  );
}

function CompletionScreen({ trainingName, onClose }: { trainingName: string; onClose: () => void }) {
  return (
    <Box className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background.secondary }}>
      <VStack className="items-center gap-6 px-6">
        {/* Success Icon */}
        <Box className="w-24 h-24 rounded-full items-center justify-center" style={{ backgroundColor: colors.primary.dark }}>
          <Ionicons name="checkmark" size={64} color={colors.text.inverse} />
        </Box>

        {/* Congratulations Text */}
        <VStack className="items-center gap-2">
          <Text className="text-3xl font-bold text-center" style={{ color: colors.text.primary }}>
            Congratulations!
          </Text>
          <Text className="text-lg text-center" style={{ color: colors.text.secondary }}>
            You've completed
          </Text>
        </VStack>

        {/* Training Name */}
        <Box className="px-8 py-3 rounded-lg" style={{ backgroundColor: colors.neutral[100] }}>
          <Text className="text-xl font-bold text-center" style={{ color: colors.primary.dark }}>
            {trainingName}
          </Text>
        </Box>

        {/* Motivational Message */}
        <Text className="text-base text-center leading-6" style={{ color: colors.text.secondary }}>
          Great job! Keep up the excellent work with your training routine and keep improving.
        </Text>

        {/* Close Button */}
        <Pressable
          onPress={onClose}
          className="w-full rounded-lg py-4 px-2 items-center justify-center active:opacity-80 mt-4"
          style={{ backgroundColor: colors.primary.dark }}
        >
          <Text style={{ color: colors.text.inverse }} className="font-semibold text-base">
            Back to Calendar
          </Text>
        </Pressable>
      </VStack>
    </Box>
  );
}
