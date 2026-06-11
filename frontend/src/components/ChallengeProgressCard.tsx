import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/glass-card';
import { Text } from '@/components/ui/text';
import { ChallengeSummary } from '@/src/api/challenges';
import { colorUtils } from '@/src/theme/colors';
import { useThemeColors } from '@/src/hooks/useThemeColors';

interface ChallengeProgressCardProps {
  challenge: ChallengeSummary;
  onPress: () => void;
  onStart?: () => void;
  cardWidth?: number;
}

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
};

export default function ChallengeProgressCard({ challenge, onPress, onStart, cardWidth }: ChallengeProgressCardProps) {
  const c = useThemeColors();

  const DIFFICULTY_COLORS: Record<string, string> = {
    beginner: c.success.main,
    intermediate: c.info.main,
    advanced: c.warning.main,
    elite: c.error.main,
  };

  const badgeColor = challenge.badge?.color || c.primary.main;
  const progress = Math.max(0, Math.min(1, Number(challenge.progress || 0)));
  const percent = Math.round(progress * 100);
  const difficultyColor = DIFFICULTY_COLORS[String(challenge.difficulty || '').toLowerCase()] || c.text.tertiary;
  const remainingRequirements = (challenge.requirements || []).filter((item) => !item.is_complete).length;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${challenge.title} challenge`}
      testID={`ChallengeCard_${challenge.id_challenges}`}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <GlassCard
        variant="medium"
        radius={16}
        padding={14}
        style={[styles.card, ...(cardWidth ? [{ width: cardWidth, maxWidth: cardWidth }] : [])]}
      >
        <View style={styles.headerRow}>
          <View style={[styles.badgeIconWrap, { backgroundColor: colorUtils.hexToRgba(badgeColor, 0.2) }]}>
            <Ionicons
              name={(challenge.badge?.icon_name as any) || 'shield-outline'}
              size={16}
              color={badgeColor}
            />
          </View>
          <View style={styles.titleWrap}>
            <Text style={[styles.title, { color: c.text.primary }]} numberOfLines={1}>
              {challenge.title}
            </Text>
            <Text style={[styles.difficulty, { color: difficultyColor }]}>
              {String(challenge.difficulty || 'unranked').toUpperCase()}
            </Text>
          </View>
          <View
            style={[
              styles.statusChip,
              challenge.status === 'completed'
                ? { backgroundColor: colorUtils.hexToRgba(c.success.main, 0.18), borderColor: colorUtils.hexToRgba(c.success.main, 0.35) }
                : challenge.status === 'in_progress'
                  ? { backgroundColor: c.glass.redSurface, borderColor: c.glass.redBorder }
                  : { backgroundColor: c.glass.surface, borderColor: c.glass.border },
            ]}
          >
            <Text style={[styles.statusText, { color: c.text.primary }]}>{STATUS_LABELS[challenge.status] || challenge.status}</Text>
          </View>
        </View>

        <Text style={[styles.description, { color: c.text.secondary }]} numberOfLines={2}>
          {challenge.description}
        </Text>

        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: c.text.tertiary }]}>Progress</Text>
            <Text style={[styles.progressPercent, { color: c.text.primary }]}>{percent}%</Text>
          </View>
          <View style={[styles.progressTrack, { borderColor: c.glass.border, backgroundColor: c.glass.surface }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${percent}%`,
                  backgroundColor: challenge.status === 'completed' ? c.success.main : badgeColor,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressHint, { color: c.text.tertiary }]}>
            {challenge.status === 'completed'
              ? 'Badge unlocked'
              : `${remainingRequirements} requirement${remainingRequirements === 1 ? '' : 's'} left`}
          </Text>
        </View>

        <View style={styles.footerRow}>
          <Text style={[styles.badgeTitle, { color: c.text.secondary }]} numberOfLines={1}>
            {challenge.badge?.title || 'Challenge badge'}
          </Text>
          {challenge.status === 'not_started' && onStart ? (
            <Pressable
              style={[styles.startButton, { borderColor: c.glass.redBorder, backgroundColor: c.glass.redSurface }]}
              onPress={(event) => {
                event.stopPropagation();
                onStart();
              }}
              accessibilityRole="button"
              accessibilityLabel={`Start ${challenge.title}`}
              testID={`ChallengeStart_${challenge.id_challenges}`}
            >
              <Text style={[styles.startButtonText, { color: c.primary.main }]}>Start</Text>
            </Pressable>
          ) : null}
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  card: {
    width: '100%',
    gap: 10,
    height: 180,
    alignSelf: 'flex-start',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  difficulty: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 12,
    lineHeight: 17,
  },
  progressBlock: {
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressHint: {
    fontSize: 11,
  },
  footerRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badgeTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  startButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  startButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
