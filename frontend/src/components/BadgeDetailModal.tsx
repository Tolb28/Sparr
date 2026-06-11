import React from 'react';
import { Modal, View, StyleSheet, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colorUtils } from '@/src/theme/colors';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import Svg, { Circle } from 'react-native-svg';

export interface Badge {
  id_badges: number;
  title: string;
  description?: string;
  icon_name?: string;
  color?: string;
  earned: boolean;
  progress?: number; // 0-1
  current_value?: number;
  threshold?: number;
  awarded_at?: string; // ISO date
  awarded_reason?: string;
}

interface BadgeDetailModalProps {
  badge: Badge | null;
  visible: boolean;
  onClose: () => void;
}

const LARGE_BADGE_SIZE = 120;
const RING_STROKE = 5;
const ICON_SIZE = 48;

export default function BadgeDetailModal({ badge, visible, onClose }: BadgeDetailModalProps) {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();

  if (!badge) return null;

  const badgeColor = badge.color || c.primary.main;
  const earned = !!badge.earned;
  const progress = badge.progress ?? 0;

  const radius = (LARGE_BADGE_SIZE - RING_STROKE) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - progress * circ;

  const formatDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const remaining = badge.threshold && badge.current_value != null
    ? badge.threshold - badge.current_value
    : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={[styles.backdrop, { backgroundColor: c.overlay.dark }]} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + 24, backgroundColor: c.background.secondary }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={c.text.secondary} />
          </Pressable>

          {/* Large badge icon */}
          <View style={styles.badgeContainer}>
            <View style={styles.circle}>
              {/* Background ring (track) */}
              <Svg width={LARGE_BADGE_SIZE} height={LARGE_BADGE_SIZE} style={StyleSheet.absoluteFill}>
                <Circle
                  cx={LARGE_BADGE_SIZE / 2}
                  cy={LARGE_BADGE_SIZE / 2}
                  r={radius}
                  stroke={earned ? badgeColor : c.border.light}
                  strokeWidth={RING_STROKE}
                  fill="transparent"
                />
                {/* Progress arc for unearned badges */}
                {!earned && progress > 0 && (
                  <Circle
                    cx={LARGE_BADGE_SIZE / 2}
                    cy={LARGE_BADGE_SIZE / 2}
                    r={radius}
                    stroke={colorUtils.hexToRgba(badgeColor, 0.6)}
                    strokeWidth={RING_STROKE}
                    strokeLinecap="round"
                    fill="transparent"
                    strokeDasharray={`${circ}`}
                    strokeDashoffset={offset}
                    rotation={-90}
                    origin={`${LARGE_BADGE_SIZE / 2}, ${LARGE_BADGE_SIZE / 2}`}
                  />
                )}
              </Svg>
              {/* Inner fill */}
              <View
                style={[
                  styles.inner,
                  earned
                    ? { backgroundColor: colorUtils.hexToRgba(badgeColor, 0.2) }
                    : { backgroundColor: c.glass.surface },
                ]}
              >
                <Ionicons
                  name={(badge.icon_name as any) || 'ribbon-outline'}
                  size={ICON_SIZE}
                  color={earned ? badgeColor : c.text.tertiary}
                />
                {/* Lock overlay for unearned */}
                {!earned && (
                  <View style={[styles.lockOverlay, { backgroundColor: c.background.primary }]}>
                    <Ionicons name="lock-closed" size={16} color={c.text.tertiary} />
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: c.text.primary }]}>{badge.title}</Text>

          {/* Description */}
          {badge.description && (
            <Text style={[styles.description, { color: c.text.secondary }]}>{badge.description}</Text>
          )}

          {/* Progress bar */}
          {badge.threshold != null && badge.current_value != null && (
            <View style={styles.progressSection}>
              <View style={[styles.progressBar, { backgroundColor: c.glass.surfaceMedium }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(progress * 100, 100)}%`,
                      backgroundColor: earned ? badgeColor : colorUtils.hexToRgba(badgeColor, 0.7),
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: c.text.secondary }]}>
                {badge.current_value} / {badge.threshold}
              </Text>
            </View>
          )}

          {/* Earned status */}
          {earned ? (
            <View style={styles.earnedRow}>
              <Ionicons name="checkmark-circle" size={20} color={c.success.main} />
              <Text style={[styles.earnedText, { color: c.success.main }]}>
                Unlocked{badge.awarded_at ? ` on ${formatDate(badge.awarded_at)}` : ''}
              </Text>
            </View>
          ) : remaining != null && remaining > 0 ? (
            <View style={styles.encouragementRow}>
              <Ionicons name="flash" size={20} color={c.warning.main} />
              <Text style={[styles.encouragementText, { color: c.warning.main }]}>
                Keep going! {remaining} more to unlock
              </Text>
            </View>
          ) : null}

          {/* Awarded reason if available */}
          {badge.awarded_reason && (
            <Text style={[styles.reason, { color: c.text.tertiary }]}>{badge.awarded_reason}</Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 1,
  },
  badgeContainer: {
    marginTop: 16,
    marginBottom: 20,
  },
  circle: {
    width: LARGE_BADGE_SIZE,
    height: LARGE_BADGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: LARGE_BADGE_SIZE - RING_STROKE * 2 - 8,
    height: LARGE_BADGE_SIZE - RING_STROKE * 2 - 8,
    borderRadius: (LARGE_BADGE_SIZE - RING_STROKE * 2 - 8) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    borderRadius: 10,
    padding: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  progressSection: {
    width: '100%',
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    textAlign: 'center',
  },
  earnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  earnedText: {
    fontSize: 15,
    fontWeight: '600',
  },
  encouragementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  encouragementText: {
    fontSize: 15,
    fontWeight: '500',
  },
  reason: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
