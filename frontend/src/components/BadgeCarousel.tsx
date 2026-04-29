import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { colors, colorUtils } from '@/src/theme/colors';
import BadgeDetailModal, { Badge } from './BadgeDetailModal';

export type { Badge } from './BadgeDetailModal';

interface BadgeCarouselProps {
  badges: Badge[];
  /** Show progress ring on unearned badges (own profile only) */
  showProgress?: boolean;
}

const BADGE_SIZE = 72;
const RING_STROKE = 3;
const ICON_SIZE = 28;

interface BadgeIconProps {
  badge: Badge;
  showProgress?: boolean;
  onPress: () => void;
}

function BadgeIcon({ badge, showProgress, onPress }: BadgeIconProps) {
  const badgeColor = badge.color || colors.primary.main;
  const earned = !!badge.earned;
  const progress = badge.progress ?? 0;

  const radius = (BADGE_SIZE - RING_STROKE) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - progress * circ;

  return (
    <Pressable onPress={onPress} style={bStyles.item}>
      <View style={bStyles.circle}>
        {/* Background ring (track) */}
        <Svg width={BADGE_SIZE} height={BADGE_SIZE} style={StyleSheet.absoluteFill}>
          <Circle
            cx={BADGE_SIZE / 2}
            cy={BADGE_SIZE / 2}
            r={radius}
            stroke={earned ? badgeColor : colors.border.light}
            strokeWidth={RING_STROKE}
            fill="transparent"
          />
          {/* Progress arc for unearned badges */}
          {!earned && showProgress && progress > 0 && (
            <Circle
              cx={BADGE_SIZE / 2}
              cy={BADGE_SIZE / 2}
              r={radius}
              stroke={colorUtils.hexToRgba(badgeColor, 0.5)}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              fill="transparent"
              strokeDasharray={`${circ}`}
              strokeDashoffset={offset}
              rotation={-90}
              origin={`${BADGE_SIZE / 2}, ${BADGE_SIZE / 2}`}
            />
          )}
        </Svg>
        {/* Inner fill */}
        <View
          style={[
            bStyles.inner,
            earned
              ? { backgroundColor: colorUtils.hexToRgba(badgeColor, 0.15) }
              : { backgroundColor: colors.glass.surface },
          ]}
        >
          <Ionicons
            name={(badge.icon_name as any) || 'ribbon-outline'}
            size={ICON_SIZE}
            color={earned ? badgeColor : colors.text.tertiary}
          />
          {/* Lock overlay for unearned */}
          {!earned && (
            <View style={bStyles.lockOverlay}>
              <Ionicons name="lock-closed" size={12} color={colors.text.tertiary} />
            </View>
          )}
        </View>
      </View>
      <Text
        style={[bStyles.label, earned && { color: colors.text.primary }]}
        numberOfLines={1}
      >
        {badge.title}
      </Text>
    </Pressable>
  );
}

export default function BadgeCarousel({ badges, showProgress = false }: BadgeCarouselProps) {
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleBadgePress = (badge: Badge) => {
    setSelectedBadge(badge);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedBadge(null);
  };

  if (!badges || badges.length === 0) {
    return <Text style={bStyles.empty}>No badges yet. Start training!</Text>;
  }

  // Sort: earned first, then by progress desc
  const sorted = [...badges].sort((a, b) => {
    if (a.earned && !b.earned) return -1;
    if (!a.earned && b.earned) return 1;
    return (b.progress ?? 0) - (a.progress ?? 0);
  });

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={bStyles.scrollContent}
      >
        {sorted.map((badge) => (
          <BadgeIcon
            key={String(badge.id_badges)}
            badge={badge}
            showProgress={showProgress}
            onPress={() => handleBadgePress(badge)}
          />
        ))}
      </ScrollView>
      <BadgeDetailModal
        badge={selectedBadge}
        visible={modalVisible}
        onClose={handleCloseModal}
      />
    </>
  );
}

const bStyles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 4, gap: 14, paddingVertical: 4 },
  item: { alignItems: 'center', width: BADGE_SIZE + 4 },
  circle: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: BADGE_SIZE - RING_STROKE * 2 - 4,
    height: BADGE_SIZE - RING_STROKE * 2 - 4,
    borderRadius: (BADGE_SIZE - RING_STROKE * 2 - 4) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    padding: 1,
  },
  label: {
    color: colors.text.tertiary,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  empty: { color: colors.text.tertiary, fontSize: 13 },
});
