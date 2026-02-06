import React, { useEffect, useState, useRef } from 'react';
import { ScrollView, ActivityIndicator, RefreshControl, PanResponder, GestureResponderEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getDrill } from '../api/techniques';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { colors } from '../theme';

type DrillDetailRouteProp = RouteProp<RootStackParamList, 'DrillDetail'>;
type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Drill {
  id_drills: number;
  title: string;
  description?: string;
  source?: string | null;
  video_url?: string | null;
  category?: string;
}

export default function DrillDetailScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<DrillDetailRouteProp>();
  const [drill, setDrill] = useState<Drill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { drill_id, category, items, initialIndex } = route.params;
  const itemsList = items || [];
  const actualIndex = initialIndex !== undefined ? initialIndex : 0;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (event: GestureResponderEvent, gestureState) => {
        const threshold = 50;
        
        if (gestureState.dx > threshold && actualIndex > 0) {
          // Swipe right - go to previous item
          const prevItem = itemsList[actualIndex - 1];
          if (prevItem && prevItem.id_drills) {
            navigation.replace('DrillDetail', {
              drill_id: prevItem.id_drills,
              category,
              items: itemsList,
              initialIndex: actualIndex - 1,
            });
          }
        } else if (gestureState.dx < -threshold && actualIndex < itemsList.length - 1) {
          // Swipe left - go to next item
          const nextItem = itemsList[actualIndex + 1];
          if (nextItem && nextItem.id_drills) {
            navigation.replace('DrillDetail', {
              drill_id: nextItem.id_drills,
              category,
              items: itemsList,
              initialIndex: actualIndex + 1,
            });
          }
        }
      },
    })
  ).current;

  useEffect(() => {
    loadDrill();
  }, [drill_id]);

  const loadDrill = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDrill(drill_id);
      const drillData = data?.drill || data;
      setDrill({
        ...drillData,
        category: category || drillData.category,
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to load drill');
      console.error('Error loading drill:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDrill();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <Box className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background.secondary }}>
        <ActivityIndicator size="large" color={colors.primary.dark} />
      </Box>
    );
  }

  if (error || !drill) {
    return (
      <Box className="flex-1" style={{ backgroundColor: colors.background.secondary }}>
        <HStack className="pt-12 px-4 pb-4 items-center gap-2" style={{ backgroundColor: colors.card.background }}>
          <Pressable onPress={() => navigation.goBack()} className="p-2">
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </Pressable>
          <Text className="flex-1 text-lg font-bold" style={{ color: colors.text.primary }}>
            Drill
          </Text>
        </HStack>
        <VStack className="flex-1 items-center justify-center px-4 gap-4">
          <Ionicons name="warning" size={48} color={colors.text.secondary} />
          <Text style={{ color: colors.text.primary }}>{error || 'Drill not found'}</Text>
          <Pressable onPress={() => navigation.goBack()} className="px-6 py-3 rounded-lg" style={{ backgroundColor: colors.primary.dark }}>
            <Text style={{ color: colors.text.inverse }}>Go Back</Text>
          </Pressable>
        </VStack>
      </Box>
    );
  }

  return (
    <Box className="flex-1" style={{ backgroundColor: colors.background.secondary }} {...panResponder.panHandlers}>
      {/* Header */}
      <HStack className="pt-12 px-4 pb-4 items-center gap-2" style={{ backgroundColor: colors.card.background, borderBottomColor: colors.border.light, borderBottomWidth: 1 }}>
        <Pressable onPress={() => navigation.goBack()} className="p-2">
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </Pressable>
        <Text className="flex-1 text-lg font-bold" style={{ color: colors.text.primary }}>
          Drill
        </Text>
        {itemsList.length > 1 && (
          <Text className="text-sm font-semibold" style={{ color: colors.text.secondary }}>
            {actualIndex + 1} / {itemsList.length}
          </Text>
        )}
      </HStack>

      {/* Content */}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        className="flex-1"
      >
        <VStack className="gap-6 pb-8">
          {/* Video Section */}
          {(drill.video_url || drill.source) ? (
            <VideoPlayerComponent videoUri={(drill.video_url || drill.source) as string} />
          ) : (
            <Box className="w-full aspect-video items-center justify-center" style={{ backgroundColor: colors.neutral[200] }}>
              <Ionicons name="videocam-outline" size={48} color={colors.text.tertiary} />
            </Box>
          )}

          {/* Title */}
          <VStack className="px-4 gap-2">
            <Text className="text-3xl font-bold" style={{ color: colors.text.primary }}>
              {drill.title}
            </Text>
          </VStack>

          {/* Category */}
          {drill.category && (
            <VStack className="px-4 gap-2">
              <Text className="text-sm font-semibold uppercase" style={{ color: colors.text.tertiary }}>
                Category
              </Text>
              <Text className="text-base" style={{ color: colors.text.secondary }}>
                {drill.category}
              </Text>
            </VStack>
          )}

          {/* Description */}
          {drill.description && (
            <VStack className="px-4 gap-2">
              <Text className="text-sm font-semibold uppercase" style={{ color: colors.text.tertiary }}>
                Description
              </Text>
              <Text className="text-base leading-6" style={{ color: colors.text.secondary }}>
                {drill.description}
              </Text>
            </VStack>
          )}

          {/* Navigation hint */}
          {itemsList.length > 1 && (
            <VStack className="px-4 pt-4 items-center gap-2">
              <Text className="text-sm" style={{ color: colors.text.tertiary }}>
                Swipe to navigate
              </Text>
            </VStack>
          )}
        </VStack>
      </ScrollView>
    </Box>
  );
}

function VideoPlayerComponent({ videoUri }: { videoUri: string }) {
  const player = useVideoPlayer(videoUri, player => {
    player.loop = true;
  });

  return (
    <Box className="w-full aspect-video bg-black items-center justify-center">
      <VideoView style={{ width: '100%', height: '100%' }} player={player} allowsFullscreen />
    </Box>
  );
}
