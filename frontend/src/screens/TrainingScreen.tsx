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
import { colors } from '@/src/theme/colors';
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
          color: badge.color || colors.primary.main,
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
      <View style={[styles.root, styles.center]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.text.secondary} />
        <Text style={styles.emptyMsg}>No training components available</Text>
        <SparrButton label="Go Back" variant="outline" onPress={() => navigation.goBack()} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const videoUri = currentComponent?.video_url || currentComponent?.source;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{trainingName || 'Training'}</Text>
        <Text style={styles.indexLabel}>{currentComponentIndex + 1}/{components.length}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Video / Placeholder */}
        {videoUri ? (
          <VideoPlayerComponent videoUri={videoUri} />
        ) : (
          <View style={styles.videoPlaceholder}>
            <Ionicons name="videocam-outline" size={48} color={colors.text.tertiary} />
          </View>
        )}

        <View style={styles.body}>
          {/* Component name + set counter */}
          <View style={styles.titleBlock}>
            <Text style={styles.componentName}>{getComponentName()}</Text>
            {hasMultipleSets && (
              <Text style={styles.setLabel}>Set {currentSetIndex + 1} of {componentSets}</Text>
            )}
          </View>

          {/* Timer */}
          {hasTime && timeRemaining !== null && (
            <GlassCard variant="medium" radius={16} padding={20}>
              <Text style={[styles.timerDisplay, timeRemaining <= 5 && styles.timerUrgent]}>
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
                <Text style={styles.repsLabel}>Complete all reps</Text>
                <Text style={styles.repsCount}>{currentComponent.reps} Reps</Text>
              </View>
              <View style={styles.navBtns}>
                {currentComponentIndex > 0 || currentSetIndex > 0 ? (
                  <Pressable style={styles.navBtn} onPress={handleGoPrev}>
                    <Ionicons name="chevron-back-circle" size={48} color={colors.text.secondary} />
                  </Pressable>
                ) : <View style={styles.navBtnPlaceholder} />}
                <Pressable style={styles.navBtn} onPress={handleGoNext}>
                  <Ionicons name="chevron-forward-circle" size={48} color={colors.primary.main} />
                </Pressable>
              </View>
            </GlassCard>
          )}

          {/* No timer/reps */}
          {!hasTime && !hasReps && (
            <GlassCard variant="medium" radius={16} padding={20}>
              <View style={styles.repsBlock}>
                <Ionicons name="checkmark-circle" size={36} color={colors.primary.main} />
                <Text style={styles.repsLabel}>Complete this exercise</Text>
              </View>
              <View style={styles.navBtns}>
                {currentComponentIndex > 0 || currentSetIndex > 0 ? (
                  <Pressable style={styles.navBtn} onPress={handleGoPrev}>
                    <Ionicons name="chevron-back-circle" size={48} color={colors.text.secondary} />
                  </Pressable>
                ) : <View style={styles.navBtnPlaceholder} />}
                <Pressable style={styles.navBtn} onPress={handleGoNext}>
                  <Ionicons name="chevron-forward-circle" size={48} color={colors.primary.main} />
                </Pressable>
              </View>
            </GlassCard>
          )}

          {/* Description */}
          {!!currentComponent?.description && (
            <GlassCard variant="default" radius={14} padding={16}>
              <Text style={styles.descLabel}>DESCRIPTION</Text>
              <Text
                style={styles.descText}
                numberOfLines={descriptionExpanded ? undefined : 3}
              >
                {currentComponent.description}
              </Text>
              {currentComponent.description.length > 150 && (
                <Pressable onPress={() => setDescriptionExpanded(!descriptionExpanded)} style={styles.expandBtn}>
                  <Text style={styles.expandText}>{descriptionExpanded ? 'Show less' : 'Show more'}</Text>
                  <Ionicons name={descriptionExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary.main} />
                </Pressable>
              )}
            </GlassCard>
          )}
        </View>
      </ScrollView>

      {/* Sticky progress bar */}
      <View style={styles.progressBar}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>PROGRESS</Text>
          <Text style={styles.progressCounter}>{currentUnit + 1} / {totalUnits}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
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
  return (
    <View style={[styles.root, styles.center]}>
      <View style={styles.completionIcon}>
        <Ionicons name="checkmark" size={56} color="#fff" />
      </View>
      <Text style={styles.completionHeading}>Congratulations!</Text>
      <Text style={styles.completionSub}>You've completed</Text>
      <GlassCard variant="red" radius={14} padding={16} style={{ marginTop: 12, marginHorizontal: 32 }}>
        <Text style={styles.completionName}>{trainingName}</Text>
      </GlassCard>
      <Text style={styles.completionMsg}>
        Great job! Keep up the excellent work with your training routine and keep improving.
      </Text>
      <SparrButton label="Back to Calendar" variant="primary" onPress={onClose} style={{ marginTop: 30, width: '80%' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.secondary },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: {
    paddingTop: 48, paddingHorizontal: 16, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border.light,
    backgroundColor: colors.background.secondary,
  },
  backBtn: { padding: 6 },
  headerTitle: { flex: 1, color: colors.text.primary, fontSize: 16, fontWeight: '700' },
  indexLabel: { color: colors.text.secondary, fontSize: 13, fontWeight: '600' },
  videoContainer: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  videoPlaceholder: {
    width: '100%', aspectRatio: 16 / 9,
    backgroundColor: colors.glass.surface, alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: 16, gap: 14 },
  titleBlock: { alignItems: 'center', paddingVertical: 8 },
  componentName: { color: colors.text.primary, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  setLabel: { color: colors.text.secondary, fontSize: 14, marginTop: 4 },
  timerDisplay: { color: colors.text.primary, fontSize: 60, fontWeight: '800', textAlign: 'center', fontVariant: ['tabular-nums'] },
  timerUrgent: { color: '#ef4444' },
  timerControls: { flexDirection: 'row', gap: 10, marginTop: 16 },
  repsBlock: { alignItems: 'center', gap: 6, marginBottom: 16 },
  repsLabel: { color: colors.text.secondary, fontSize: 14 },
  repsCount: { color: colors.primary.main, fontSize: 36, fontWeight: '800', lineHeight: 44 },
  navBtns: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24 },
  navBtn: { padding: 4 },
  navBtnPlaceholder: { width: 56, height: 56 },
  descLabel: { color: colors.text.tertiary, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  descText: { color: colors.text.secondary, fontSize: 13, lineHeight: 20 },
  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  expandText: { color: colors.primary.main, fontSize: 13, fontWeight: '600' },
  progressBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: colors.background.secondary,
    borderTopWidth: 1, borderTopColor: colors.border.light,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { color: colors.text.tertiary, fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  progressCounter: { color: colors.text.secondary, fontSize: 11 },
  progressTrack: {
    height: 6, borderRadius: 99, backgroundColor: colors.glass.surface,
    overflow: 'hidden', borderWidth: 1, borderColor: colors.glass.border,
  },
  progressFill: { height: '100%', borderRadius: 99, backgroundColor: colors.primary.main },
  emptyMsg: { color: colors.text.secondary, fontSize: 15, marginTop: 12, textAlign: 'center' },
  completionIcon: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.primary.main, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary.main, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
    marginBottom: 8,
  },
  completionHeading: { color: colors.text.primary, fontSize: 28, fontWeight: '800', marginTop: 12 },
  completionSub: { color: colors.text.secondary, fontSize: 15, marginTop: 8 },
  completionName: { color: colors.primary.main, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  completionMsg: { color: colors.text.secondary, fontSize: 13, textAlign: 'center', lineHeight: 20, marginTop: 20, paddingHorizontal: 24 },
});
