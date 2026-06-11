import React, { useEffect, useState, useRef } from 'react';
import { ScrollView, View, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/glass-card';
import { SparrButton } from '@/components/ui/sparr-button';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { getBadgeCatalog, logWorkoutCompletion } from '@/src/api/gamification';
import { useProgress } from '@/src/context/ProgressContext';
import { showBadgeNotification, showErrorNotification } from '@/src/services/notificationService';

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
  const c = useThemeColors();

  const { components = [], trainingName = '' } = route.params as TrainingParams;

  const [currentComponentIndex, setCurrentComponentIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef(Date.now());
  const hasLoggedCompletion = useRef(false);
  const earnedBadgeIds = useRef<Set<number>>(new Set());

  const { badges: progressBadges, refresh: refreshProgress } = useProgress();

  // Log completion to backend when training finishes
  useEffect(() => {
    earnedBadgeIds.current = new Set(
      (progressBadges || []).filter((badge) => badge.earned).map((badge) => badge.id_badges)
    );
  }, [progressBadges]);

  useEffect(() => {
    if (!isCompleted || hasLoggedCompletion.current) return;
    hasLoggedCompletion.current = true;
    const durationSec = Math.round((Date.now() - startTimeRef.current) / 1000);

    (async () => {
      let baselineBadges = progressBadges || [];
      if (!baselineBadges.length) {
        baselineBadges = await getBadgeCatalog().catch(() => []);
      }
      const priorEarned = new Set(
        baselineBadges.filter((badge: any) => badge.earned).map((badge: any) => badge.id_badges)
      );

      try {
        await logWorkoutCompletion(null, durationSec);
      } catch {
        showErrorNotification('Unable to log workout completion.');
        return;
      }

      const updatedBadges = await getBadgeCatalog().catch(() => []);
      const newlyEarned = updatedBadges.filter(
        (badge: any) => badge.earned && !priorEarned.has(badge.id_badges)
      );

      newlyEarned.forEach((badge: any) => {
        showBadgeNotification({
          title: badge.title,
          icon_name: badge.icon_name || 'ribbon-outline',
          color: badge.color || c.primary.main,
        });
      });

      refreshProgress(true).catch(() => {});
    })();
  }, [isCompleted, progressBadges, refreshProgress]);

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

  const handleGoPrev = () => {
    if (currentSetIndex > 0) {
      setCurrentSetIndex(prev => prev - 1);
      setTimeRemaining(componentTime);
      setIsRunning(false);
    } else if (currentComponentIndex > 0) {
      const prevIndex = currentComponentIndex - 1;
      const prevComponent = components[prevIndex];
      const prevSets = prevComponent?.sets ? Number(prevComponent.sets) : 1;
      setCurrentComponentIndex(prevIndex);
      setCurrentSetIndex(Math.max(0, prevSets - 1));
      setTimeRemaining(null);
      setIsRunning(false);
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
      <View style={[styles.root, styles.center, { backgroundColor: c.background.secondary }]}>
        <Ionicons name="alert-circle-outline" size={48} color={c.text.secondary} />
        <Text style={[styles.emptyMsg, { color: c.text.secondary }]}>No training components available</Text>
        <SparrButton label="Go Back" variant="outline" onPress={() => navigation.goBack()} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const videoUri = currentComponent?.video_url || currentComponent?.source;

  return (
    <View style={[styles.root, { backgroundColor: c.background.secondary }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border.light, backgroundColor: c.background.secondary }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={c.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text.primary }]} numberOfLines={1}>{trainingName || 'Training'}</Text>
        <Text style={[styles.indexLabel, { color: c.text.secondary }]}>{currentComponentIndex + 1}/{components.length}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Video / Placeholder */}
        {videoUri ? (
          <VideoPlayerComponent videoUri={videoUri} />
        ) : (
          <View style={[styles.videoPlaceholder, { backgroundColor: c.glass.surface }]}>
            <Ionicons name="videocam-outline" size={48} color={c.text.tertiary} />
          </View>
        )}

        <View style={styles.body}>
          {/* Component name + set counter */}
          <View style={styles.titleBlock}>
            <Text style={[styles.componentName, { color: c.text.primary }]}>{getComponentName()}</Text>
            {hasMultipleSets && (
              <Text style={[styles.setLabel, { color: c.text.secondary }]}>Set {currentSetIndex + 1} of {componentSets}</Text>
            )}
          </View>

          {/* Timer */}
          {hasTime && timeRemaining !== null && (
            <GlassCard variant="medium" radius={16} padding={20}>
              <Text style={[styles.timerDisplay, { color: c.text.primary, fontFamily: 'Barlow_700Bold', fontWeight: '700' }, timeRemaining <= 5 && styles.timerUrgent]}>
                {formatTime(timeRemaining)}
              </Text>
              <View style={styles.timerControls}>
                <SparrButton
                  label={isRunning ? 'Pause' : 'Start'}
                  variant="primary"
                  onPress={handleToggleTimer}
                  style={{ flex: 1 }}
                />
                <SparrButton
                  label="Skip"
                  variant="ghost"
                  onPress={handleSkip}
                  style={{ flex: 1 }}
                />
              </View>
            </GlassCard>
          )}

          {/* Reps */}
          {hasReps && !hasTime && (
            <GlassCard variant="medium" radius={16} padding={20}>
              <View style={styles.repsBlock}>
                <Text style={[styles.repsLabel, { color: c.text.secondary }]}>Complete all reps</Text>
                <Text style={[styles.repsCount, { color: c.primary.main, fontFamily: 'Barlow_700Bold', fontWeight: '700' }]}>{currentComponent.reps} Reps</Text>
              </View>
              <View style={styles.navBtns}>
                {currentComponentIndex > 0 || currentSetIndex > 0 ? (
                  <Pressable style={styles.navBtn} onPress={handleGoPrev}>
                    <Ionicons name="chevron-back-circle" size={48} color={c.text.secondary} />
                  </Pressable>
                ) : <View style={styles.navBtnPlaceholder} />}
                <Pressable style={styles.navBtn} onPress={handleGoNext}>
                  <Ionicons name="chevron-forward-circle" size={48} color={c.primary.main} />
                </Pressable>
              </View>
            </GlassCard>
          )}

          {/* No timer/reps */}
          {!hasTime && !hasReps && (
            <GlassCard variant="medium" radius={16} padding={20}>
              <View style={styles.repsBlock}>
                <Ionicons name="checkmark-circle" size={36} color={c.primary.main} />
                <Text style={[styles.repsLabel, { color: c.text.secondary }]}>Complete this exercise</Text>
              </View>
              <View style={styles.navBtns}>
                {currentComponentIndex > 0 || currentSetIndex > 0 ? (
                  <Pressable style={styles.navBtn} onPress={handleGoPrev}>
                    <Ionicons name="chevron-back-circle" size={48} color={c.text.secondary} />
                  </Pressable>
                ) : <View style={styles.navBtnPlaceholder} />}
                <Pressable style={styles.navBtn} onPress={handleGoNext}>
                  <Ionicons name="chevron-forward-circle" size={48} color={c.primary.main} />
                </Pressable>
              </View>
            </GlassCard>
          )}

          {/* Description */}
          {!!currentComponent?.description && (
            <GlassCard variant="default" radius={14} padding={16}>
              <Text style={[styles.descLabel, { color: c.text.tertiary }]}>DESCRIPTION</Text>
              <Text
                style={[styles.descText, { color: c.text.secondary }]}
                numberOfLines={descriptionExpanded ? undefined : 3}
              >
                {currentComponent.description}
              </Text>
              {currentComponent.description.length > 150 && (
                <Pressable onPress={() => setDescriptionExpanded(!descriptionExpanded)} style={styles.expandBtn}>
                  <Text style={[styles.expandText, { color: c.primary.main }]}>{descriptionExpanded ? 'Show less' : 'Show more'}</Text>
                  <Ionicons name={descriptionExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={c.primary.main} />
                </Pressable>
              )}
            </GlassCard>
          )}
        </View>
      </ScrollView>

      {/* Sticky progress bar */}
      <View style={[styles.progressBar, { backgroundColor: c.background.secondary, borderTopColor: c.border.light }]}>
        <View style={styles.progressRow}>
          <Text style={[styles.progressLabel, { color: c.text.tertiary }]}>PROGRESS</Text>
          <Text style={[styles.progressCounter, { color: c.text.secondary }]}>{currentUnit + 1} / {totalUnits}</Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]}>
          <View style={[styles.progressFill, { width: `${progressPercentage}%`, backgroundColor: c.primary.main }]} />
        </View>
      </View>
    </View>
  );
}

function VideoPlayerComponent({ videoUri }: { videoUri: string }) {
  const player = useVideoPlayer(videoUri, (p) => { p.loop = true; p.play(); });
  return (
    <View style={styles.videoContainer}>
      <VideoView style={{ width: '100%', height: '100%' }} player={player} allowsFullscreen />
    </View>
  );
}

function CompletionScreen({ trainingName, onClose }: { trainingName: string; onClose: () => void }) {
  const c = useThemeColors();
  return (
    <View style={[styles.root, styles.center, { backgroundColor: c.background.secondary }]}>
      <View style={[styles.completionIcon, { backgroundColor: c.primary.main, shadowColor: c.primary.main }]}>
        <Ionicons name="checkmark" size={56} color="#fff" />
      </View>
      <Text style={[styles.completionHeading, { color: c.text.primary }]}>Congratulations!</Text>
      <Text style={[styles.completionSub, { color: c.text.secondary }]}>You've completed</Text>
      <GlassCard variant="red" radius={14} padding={16} style={{ marginTop: 12, marginHorizontal: 32 }}>
        <Text style={[styles.completionName, { color: c.primary.main }]}>{trainingName}</Text>
      </GlassCard>
      <Text style={[styles.completionMsg, { color: c.text.secondary }]}>
        Great job! Keep up the excellent work with your training routine and keep improving.
      </Text>
      <SparrButton label="Back to Calendar" variant="primary" onPress={onClose} style={{ marginTop: 30, width: '80%' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: {
    paddingTop: 48, paddingHorizontal: 16, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 6 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  indexLabel: { fontSize: 13, fontWeight: '600' },
  videoContainer: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  videoPlaceholder: {
    width: '100%', aspectRatio: 16 / 9,
    alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: 16, gap: 14 },
  titleBlock: { alignItems: 'center', paddingVertical: 8 },
  componentName: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  setLabel: { fontSize: 14, marginTop: 4 },
  timerDisplay: { fontSize: 60, fontWeight: '700', fontFamily: 'Barlow_700Bold', textAlign: 'center', lineHeight: 76 },
  timerUrgent: { color: '#ef4444' },
  timerControls: { flexDirection: 'row', gap: 10, marginTop: 16 },
  repsBlock: { alignItems: 'center', gap: 6, marginBottom: 16 },
  repsLabel: { fontSize: 14 },
  repsCount: { fontSize: 36, fontWeight: '700', fontFamily: 'Barlow_700Bold', lineHeight: 44 },
  navBtns: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24 },
  navBtn: { padding: 4 },
  navBtnPlaceholder: { width: 56, height: 56 },
  descLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  descText: { fontSize: 13, lineHeight: 20 },
  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  expandText: { fontSize: 13, fontWeight: '600' },
  progressBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 1,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  progressCounter: { fontSize: 11 },
  progressTrack: {
    height: 6, borderRadius: 99,
    overflow: 'hidden', borderWidth: 1,
  },
  progressFill: { height: '100%', borderRadius: 99 },
  emptyMsg: { fontSize: 15, marginTop: 12, textAlign: 'center' },
  completionIcon: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
    marginBottom: 8,
  },
  completionHeading: { fontSize: 28, fontWeight: '800', marginTop: 12 },
  completionSub: { fontSize: 15, marginTop: 8 },
  completionName: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  completionMsg: { fontSize: 13, textAlign: 'center', lineHeight: 20, marginTop: 20, paddingHorizontal: 24 },
});
