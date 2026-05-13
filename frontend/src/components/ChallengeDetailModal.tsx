import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/glass-card';
import { Text } from '@/components/ui/text';
import { ChallengeRequirement, ChallengeSummary } from '@/src/api/challenges';
import { colors, colorUtils } from '@/src/theme/colors';

interface ChallengeDetailModalProps {
  visible: boolean;
  challenge: ChallengeSummary | null;
  loading?: boolean;
  onClose: () => void;
  onStart: (challengeId: number) => void;
  onLogProgress: (challengeId: number, requirementId: number, increment: number) => void;
  onComplete: (challengeId: number) => void;
}

function getIncrementForRequirement(requirement: ChallengeRequirement) {
  if (requirement.unit === 'minutes') return 1;
  if (requirement.unit === 'seconds') return 30;
  if (requirement.target_value <= 50) return 1;
  if (requirement.target_value <= 200) return 5;
  return 10;
}

export default function ChallengeDetailModal({
  visible,
  challenge,
  loading,
  onClose,
  onStart,
  onLogProgress,
  onComplete,
}: ChallengeDetailModalProps) {
  const insets = useSafeAreaInsets();

  const [localChallenge, setLocalChallenge] = React.useState<ChallengeSummary | null>(challenge);
  React.useEffect(() => {
    if (visible) setLocalChallenge(challenge);
  }, [challenge, visible]);

  if (!localChallenge) return null;

  const allComplete =
    localChallenge.requirements.length > 0 && localChallenge.requirements.every((requirement) => requirement.is_complete);
  const challengeColor = localChallenge.badge?.color || colors.primary.main;
  const progressPercent = Math.round(Math.max(0, Math.min(1, localChallenge.progress || 0)) * 100);

  const handleLocalIncrement = (requirement: ChallengeRequirement, increment: number) => {
    setLocalChallenge((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, requirements: prev.requirements.map((r) => ({ ...r })) } as ChallengeSummary;
      for (const r of updated.requirements) {
        if (r.id_challenge_requirements === requirement.id_challenge_requirements) {
          r.current_value = Math.min(r.target_value, (Number(r.current_value) || 0) + increment);
          r.is_complete = r.current_value >= r.target_value;
          break;
        }
      }
      const targetTotal = updated.requirements.reduce((s, r) => s + (r.target_value || 0), 0);
      const currentTotal = updated.requirements.reduce((s, r) => s + Math.min(Number(r.current_value || 0), r.target_value || 0), 0);
      updated.progress = targetTotal > 0 ? currentTotal / targetTotal : 0;
      if (updated.requirements.length > 0 && updated.requirements.every((r) => r.is_complete)) {
        updated.status = 'completed';
        updated.progress = 1;
      }
      return updated;
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: (insets.bottom || 0) + 20 }]}>
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: colorUtils.hexToRgba(challengeColor, 0.2) }]}>
              <Ionicons name={(localChallenge.badge?.icon_name as any) || 'shield-outline'} size={18} color={challengeColor} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{localChallenge.title}</Text>
              <Text style={styles.subtitle}>
                {String(localChallenge.difficulty || 'unranked').toUpperCase()} · {progressPercent}% complete
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={colors.text.secondary} />
            </Pressable>
          </View>

          <Text style={styles.description}>{localChallenge.description}</Text>

          <GlassCard variant="medium" radius={12} padding={12} style={styles.badgeCard}>
            <Text style={styles.badgeLabel}>Challenge Badge</Text>
            <View style={styles.badgeRow}>
              <Ionicons
                name={(localChallenge.badge?.icon_name as any) || 'ribbon-outline'}
                size={18}
                color={localChallenge.badge?.earned ? challengeColor : colors.text.tertiary}
              />
              <Text style={styles.badgeText}>
                {localChallenge.badge?.title || 'Badge reward'}
                {localChallenge.badge?.earned ? ' · unlocked' : ''}
              </Text>
            </View>
          </GlassCard>

          <ScrollView style={styles.requirementsScroll} contentContainerStyle={styles.requirementsContent}>
            {localChallenge.requirements.map((requirement) => {
              const progressWidth = `${Math.min(
                100,
                Math.round((Math.max(0, requirement.current_value) / Math.max(1, requirement.target_value)) * 100)
              )}%` as `${number}%`;
              const increment = getIncrementForRequirement(requirement);

              return (
                <GlassCard
                  key={String(requirement.id_challenge_requirements)}
                  variant="default"
                  radius={12}
                  padding={12}
                  style={styles.requirementCard}
                >
                  <View style={styles.requirementHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.requirementTitle}>{requirement.title}</Text>
                      <Text style={styles.requirementMeta}>
                        {requirement.source === 'auto' ? 'Auto tracked' : 'Manual'} · {requirement.unit}
                      </Text>
                    </View>
                    <Text style={styles.requirementProgress}>
                      {requirement.current_value} / {requirement.target_value}
                    </Text>
                  </View>

                  <View style={styles.requirementTrack}>
                    <View style={[styles.requirementFill, { width: progressWidth }]} />
                  </View>

                  <View style={styles.requirementFooter}>
                    <Text style={styles.requirementState}>
                      {requirement.is_complete ? 'Completed' : 'In progress'}
                    </Text>
                    {requirement.source === 'manual' &&
                    localChallenge.status !== 'completed' &&
                    localChallenge.status !== 'not_started' ? (
                      <Pressable
                        onPress={() => {
                          // update local UI immediately
                          handleLocalIncrement(requirement, increment);
                          // call parent to persist; parent will defer heavy refresh
                          onLogProgress(localChallenge.id_challenges, requirement.id_challenge_requirements, increment);
                        }}
                        disabled={loading}
                        style={[styles.incrementButton, loading && styles.disabledButton]}
                        accessibilityRole="button"
                        accessibilityLabel={`Add progress to ${requirement.title}`}
                        testID={`ChallengeLog_${requirement.id_challenge_requirements}`}
                      >
                        <Ionicons name="add" size={14} color={colors.primary.main} />
                        <Text style={styles.incrementButtonText}>
                          +{increment} {requirement.unit}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </GlassCard>
              );
            })}
          </ScrollView>

          {localChallenge.status === 'not_started' ? (
            <Pressable
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={() => onStart(localChallenge.id_challenges)}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={`Start ${localChallenge.title}`}
              testID="ChallengeModal_Start"
            >
              <Ionicons name="play" size={14} color="#fff" />
              <Text style={styles.primaryButtonText}>Start challenge</Text>
            </Pressable>
          ) : localChallenge.status === 'completed' ? (
            <View style={styles.completedRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success.main} />
              <Text style={styles.completedText}>Challenge completed</Text>
            </View>
          ) : (
            <Pressable
              style={[
                styles.primaryButton,
                !allComplete && styles.inactiveButton,
                loading && styles.disabledButton,
              ]}
              onPress={() => onComplete(localChallenge.id_challenges)}
              disabled={loading || !allComplete}
              accessibilityRole="button"
              accessibilityLabel={`Complete ${localChallenge.title}`}
              testID="ChallengeModal_Complete"
            >
              <Ionicons name="checkmark" size={14} color="#fff" />
              <Text style={styles.primaryButtonText}>Complete challenge</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.text.tertiary,
    fontSize: 11,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  description: {
    color: colors.text.secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  badgeCard: {
    gap: 8,
  },
  badgeLabel: {
    color: colors.text.tertiary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  requirementsScroll: {
    maxHeight: 340,
  },
  requirementsContent: {
    gap: 10,
    paddingBottom: 8,
  },
  requirementCard: {
    gap: 8,
  },
  requirementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementTitle: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  requirementMeta: {
    color: colors.text.tertiary,
    fontSize: 10,
    marginTop: 2,
  },
  requirementProgress: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: '700',
  },
  requirementTrack: {
    height: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.glass.border,
    backgroundColor: colors.glass.surface,
    overflow: 'hidden',
  },
  requirementFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary.main,
  },
  requirementFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requirementState: {
    color: colors.text.tertiary,
    fontSize: 11,
  },
  incrementButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.glass.redBorder,
    backgroundColor: colors.glass.redSurface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  incrementButtonText: {
    color: colors.primary.main,
    fontSize: 11,
    fontWeight: '700',
  },
  primaryButton: {
    marginTop: 2,
    borderRadius: 12,
    minHeight: 44,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  completedRow: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colorUtils.hexToRgba(colors.success.main, 0.35),
    backgroundColor: colorUtils.hexToRgba(colors.success.main, 0.14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  completedText: {
    color: colors.success.main,
    fontSize: 13,
    fontWeight: '700',
  },
  inactiveButton: {
    opacity: 0.45,
  },
  disabledButton: {
    opacity: 0.7,
  },
});

