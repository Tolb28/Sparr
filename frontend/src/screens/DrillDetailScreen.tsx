import React, { useEffect, useState, useRef } from 'react';
import { ScrollView, ActivityIndicator, RefreshControl, PanResponder, GestureResponderEvent, View, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getDrill } from '../api/techniques';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { GlassCard } from '@/components/ui/glass-card';
import { ErrorState } from '@/components/ui/error-state';
import { useThemeColors } from '@/src/hooks/useThemeColors';

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
  const c = useThemeColors();
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
      <View style={[styles.root, styles.center, { backgroundColor: c.background.secondary }]}>
        <ActivityIndicator size="large" color={c.primary.main} />
      </View>
    );
  }

  if (error || !drill) {
    return (
      <View style={[styles.root, { backgroundColor: c.background.secondary }]}>
        <View style={[styles.header, { borderBottomColor: c.border.light, backgroundColor: c.background.secondary }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={c.text.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: c.text.primary }]}>Drill</Text>
          <View style={{ width: 40 }} />
        </View>
        <ErrorState message={error || 'Drill not found'} onRetry={loadDrill} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background.secondary }]} {...panResponder.panHandlers}>
      <View style={[styles.header, { borderBottomColor: c.border.light, backgroundColor: c.background.secondary }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={c.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text.primary }]}>Drill</Text>
        {itemsList.length > 1 ? (
          <Text style={[styles.indexLabel, { color: c.text.secondary }]}>{actualIndex + 1} / {itemsList.length}</Text>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.primary.main} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {(drill.video_url || drill.source) ? (
          <VideoPlayerComponent videoUri={(drill.video_url || drill.source) as string} />
        ) : (
          <View style={[styles.videoPlaceholder, { backgroundColor: c.glass.surface }]}>
            <Ionicons name="videocam-outline" size={48} color={c.text.tertiary} />
          </View>
        )}

        <View style={styles.body}>
          <Text style={[styles.title, { color: c.text.primary }]}>{drill.title}</Text>

          {!!drill.category && (
            <View style={[styles.categoryChip, { backgroundColor: c.glass.redSurface, borderColor: c.primary.main + '44' }]}>
              <Text style={[styles.categoryText, { color: c.primary.main }]}>{drill.category}</Text>
            </View>
          )}

          {!!drill.description && (
            <GlassCard variant="medium" radius={14} padding={16}>
              <Text style={[styles.descLabel, { color: c.text.tertiary }]}>DESCRIPTION</Text>
              <Text style={[styles.descText, { color: c.text.secondary }]}>{drill.description}</Text>
            </GlassCard>
          )}

          {itemsList.length > 1 && (
            <View style={styles.swipeHint}>
              <Ionicons name="swap-horizontal" size={14} color={c.text.tertiary} />
              <Text style={[styles.swipeHintText, { color: c.text.tertiary }]}>Swipe to navigate</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function VideoPlayerComponent({ videoUri }: { videoUri: string }) {
  const player = useVideoPlayer(videoUri, (p) => { p.loop = true; });
  return (
    <View style={styles.videoContainer}>
      <VideoView style={{ width: '100%', height: '100%' }} player={player} allowsFullscreen />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingTop: 48, paddingHorizontal: 16, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  backBtn: { padding: 6, width: 40 },
  headerTitle: { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  indexLabel: { fontSize: 13, fontWeight: '600', width: 40, textAlign: 'right' },
  videoContainer: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  videoPlaceholder: {
    width: '100%', aspectRatio: 16 / 9,
    alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: 16, gap: 14 },
  title: { fontSize: 26, fontWeight: '800' },
  categoryChip: {
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  descLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  descText: { fontSize: 14, lineHeight: 22 },
  swipeHint: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 8 },
  swipeHintText: { fontSize: 12 },
});
