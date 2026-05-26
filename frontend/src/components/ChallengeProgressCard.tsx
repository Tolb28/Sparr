import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/glass-card';
import { Text } from '@/components/ui/text';
import { ChallengeSummary } from '@/src/api/challenges';
import { colors, colorUtils } from '@/src/theme/colors';

interface ChallengeProgressCardProps {
  challenge: ChallengeSummary;
  onPress: () => void;
  onStart?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: colors.success.main,
  intermediate: colors.info.main,
  advanced: colors.warning.main,
  elite: colors.error.main,
};

export default function ChallengeProgressCard({ challenge, onPress, onStart }: ChallengeProgressCardProps) {
  const badgeColor = challenge.badge?.color || colors.primary.main;
  const progress = Math.max(0, Math.min(1, Number(challenge.progress || 0)));
  const percent = Math.round(progress * 100);
  const difficultyColor = DIFFICULTY_COLORS[String(challenge.difficulty || '').toLowerCase()] || colors.text.tertiary;
  const remainingRequirements = challenge.requirements.filter((item) => !item.is_complete).length;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${challenge.title} challenge`}
      testID={`ChallengeCard_${challenge.id_challenges}`}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <GlassCard variant="medium" radius={16} padding={14} style={styles.card}>
        <View style={styles.headerRow}>
          <View style={[styles.badgeIconWrap, { backgroundColor: colorUtils.hexToRgba(badgeColor, 0.2) }]}>
            <Ionicons
              name={(challenge.badge?.icon_name as any) || 'shield-outline'}
              size={16}
              color={badgeColor}
            />
          </View>
          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>
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
                ? styles.statusCompleted
                : challenge.status === 'in_progress'
                  ? styles.statusInProgress
                  : styles.statusNotStarted,
            ]}
          >
            <Text style={styles.statusText}>{STATUS_LABELS[challenge.status] || challenge.status}</Text>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {challenge.description}
        </Text>

        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressPercent}>{percent}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${percent}%`,
                  backgroundColor: challenge.status === 'completed' ? colors.success.main : badgeColor,
                },
              ]}
            />
          </View>
          <Text style={styles.progressHint}>
            {challenge.status === 'completed'
              ? 'Badge unlocked'
              : `${remainingRequirements} requirement${remainingRequirements === 1 ? '' : 's'} left`}
          </Text>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.badgeTitle} numberOfLines={1}>
            {challenge.badge?.title || 'Challenge badge'}
          </Text>
          {challenge.status === 'not_started' && onStart ? (
            <Pressable
              style={styles.startButton}
              onPress={(event) => {
                event.stopPropagation();
                onStart();
              }}
              accessibilityRole="button"
              accessibilityLabel={`Start ${challenge.title}`}
              testID={`ChallengeStart_${challenge.id_challenges}`}
            >
              <Text style={styles.startButtonText}>Start</Text>
            </Pressable>
          ) : null}
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: 280,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  card: {
    gap: 10,
    minHeight: 170,
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
    color: colors.text.primary,
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
  statusNotStarted: {
    backgroundColor: colors.glass.surface,
    borderColor: colors.glass.border,
  },
  statusInProgress: {
    backgroundColor: colors.glass.redSurface,
    borderColor: colors.glass.redBorder,
  },
  statusCompleted: {
    backgroundColor: colorUtils.hexToRgba(colors.success.main, 0.18),
    borderColor: colorUtils.hexToRgba(colors.success.main, 0.35),
  },
  statusText: {
    color: colors.text.primary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  description: {
    color: colors.text.secondary,
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
    color: colors.text.tertiary,
    fontSize: 11,
    fontWeight: '600',
  },
  progressPercent: {
    color: colors.text.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.glass.border,
    backgroundColor: colors.glass.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressHint: {
    color: colors.text.tertiary,
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
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  startButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.glass.redBorder,
    backgroundColor: colors.glass.redSurface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  startButtonText: {
    color: colors.primary.main,
    fontSize: 12,
    fontWeight: '700',
  },
});

