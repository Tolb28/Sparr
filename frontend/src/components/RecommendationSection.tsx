import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/glass-card';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import type { NearbyClub, PopularTraining, SuggestedBoxer } from '../api/recommendations';

interface RecommendationSectionProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  onSeeAll?: () => void;
}

export function RecommendationSection({ title, icon, children, onSeeAll }: RecommendationSectionProps) {
  const c = useThemeColors();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name={icon} size={18} color={c.primary.main} />
          <Text style={[styles.sectionTitle, { color: c.text.primary }]}>{title}</Text>
        </View>
        {onSeeAll && (
          <Pressable onPress={onSeeAll} style={styles.seeAllBtn}>
            <Text style={[styles.seeAllText, { color: c.primary.main }]}>See all</Text>
            <Ionicons name="chevron-forward" size={14} color={c.primary.main} />
          </Pressable>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {children}
      </ScrollView>
    </View>
  );
}

interface ClubCardProps {
  club: NearbyClub;
  onPress: () => void;
  fullWidth?: boolean;
}

export function ClubCard({ club, onPress, fullWidth }: ClubCardProps) {
  const c = useThemeColors();
  return (
    <Pressable onPress={onPress}>
      <GlassCard variant="medium" radius={14} padding={14} style={fullWidth ? styles.cardFull : styles.card}>
        <View style={styles.cardAvatarContainer}>
          <Avatar size="lg">
            <AvatarFallbackText>{club.title?.[0] || 'C'}</AvatarFallbackText>
            {club.avatar_url && <AvatarImage source={{ uri: club.avatar_url }} />}
          </Avatar>
        </View>
        <Text style={[styles.cardTitle, { color: c.text.primary }]} numberOfLines={1}>{club.title}</Text>
        <View style={styles.cardLocationRow}>
          <Ionicons name="location-outline" size={12} color={c.text.tertiary} />
          <Text style={[styles.cardSubtext, { color: c.text.secondary }]} numberOfLines={1}>{club.location || 'Unknown'}</Text>
        </View>
        <Text style={[styles.cardMeta, { color: c.text.tertiary }]}>{club.members_count ?? 0} members</Text>
        <View style={[
          styles.policyBadge,
          club.join_policy === 'open'
            ? { backgroundColor: c.success.main + '20' }
            : { backgroundColor: c.warning.main + '20' },
        ]}>
          <Text style={[styles.policyText, { color: c.text.secondary }]}>
            {club.join_policy === 'open' ? 'Open' : 'Request'}
          </Text>
        </View>
      </GlassCard>
    </Pressable>
  );
}

interface TrainingCardProps {
  training: PopularTraining;
  onPress: () => void;
}

export function TrainingCard({ training, onPress }: TrainingCardProps) {
  const c = useThemeColors();
  const popularityBars = Math.min(5, Math.max(1, Math.ceil(training.popularity / 20)));

  return (
    <Pressable onPress={onPress}>
      <GlassCard variant="medium" radius={14} padding={14} style={styles.card}>
        <View style={[styles.trainingIconContainer, { backgroundColor: c.glass.redSurface }]}>
          <Ionicons name="fitness-outline" size={28} color={c.primary.main} />
        </View>
        <Text style={[styles.cardTitle, { color: c.text.primary }]} numberOfLines={2}>{training.title}</Text>
        {training.description && (
          <Text style={[styles.cardSubtext, { color: c.text.secondary }]} numberOfLines={2}>{training.description}</Text>
        )}
        <View style={styles.popularityRow}>
          <Text style={[styles.popularityLabel, { color: c.text.tertiary }]}>Popularity</Text>
          <View style={styles.popularityBars}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={[
                  styles.popularityBar,
                  { backgroundColor: i <= popularityBars ? c.primary.main : c.glass.border },
                ]}
              />
            ))}
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

interface BoxerCardProps {
  boxer: SuggestedBoxer;
  onPress: () => void;
}

export function BoxerCard({ boxer, onPress }: BoxerCardProps) {
  const c = useThemeColors();
  return (
    <Pressable onPress={onPress}>
      <GlassCard variant="medium" radius={14} padding={14} style={styles.card}>
        <View style={[styles.boxerAvatarRing, { borderColor: c.primary.main }]}>
          <Avatar size="lg">
            <AvatarFallbackText>{boxer.display_name?.[0] || boxer.username?.[0] || '?'}</AvatarFallbackText>
            {boxer.avatar_url && <AvatarImage source={{ uri: boxer.avatar_url }} />}
          </Avatar>
        </View>
        <Text style={[styles.cardTitle, { color: c.text.primary }]} numberOfLines={1}>
          {boxer.display_name || boxer.username}
        </Text>
        {(boxer.title_style || boxer.title_weight) && (
          <Text style={[styles.cardSubtext, { color: c.text.secondary }]} numberOfLines={1}>
            {[boxer.title_weight, boxer.title_style].filter(Boolean).join(' · ')}
          </Text>
        )}
        {boxer.location && (
          <View style={styles.cardLocationRow}>
            <Ionicons name="location-outline" size={12} color={c.text.tertiary} />
            <Text style={[styles.cardMeta, { color: c.text.tertiary }]} numberOfLines={1}>{boxer.location}</Text>
          </View>
        )}
      </GlassCard>
    </Pressable>
  );
}

interface CalendarCardProps {
  calendar: {
    id_training_calendar: number;
    calendar_name: string;
    creator_name: string;
    creator_avatar?: string;
    subscriber_count: number;
    training_count: number;
  };
  onPress: () => void;
}

export function CalendarCard({ calendar, onPress }: CalendarCardProps) {
  const c = useThemeColors();
  return (
    <Pressable onPress={onPress}>
      <GlassCard variant="medium" radius={14} padding={14} style={styles.card}>
        <View style={[styles.calendarIconContainer, { backgroundColor: c.glass.redSurface }]}>
          <Ionicons name="calendar-outline" size={28} color={c.primary.main} />
        </View>
        <Text style={[styles.cardTitle, { color: c.text.primary }]} numberOfLines={1}>
          {calendar.calendar_name}
        </Text>
        <Text style={[styles.cardSubtext, { color: c.text.secondary }]} numberOfLines={1}>
          by {calendar.creator_name}
        </Text>
        <Text style={[styles.cardMeta, { color: c.text.tertiary }]}>
          {calendar.subscriber_count} users • {calendar.training_count} workouts
        </Text>
      </GlassCard>
    </Pressable>
  );
}

const CARD_WIDTH = 180;

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    minHeight: 160,
  },
  cardFull: {
    width: '90%',
    alignSelf: 'center',
    minHeight: 160,
    marginVertical: 10,
  },
  cardAvatarContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 2,
  },
  cardSubtext: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 11,
    textAlign: 'center',
  },
  policyBadge: {
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  policyText: {
    fontSize: 10,
    fontWeight: '700',
  },
  trainingIconContainer: {
    alignItems: 'center',
    marginBottom: 10,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  calendarIconContainer: {
    alignItems: 'center',
    marginBottom: 10,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  popularityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  popularityLabel: {
    fontSize: 10,
  },
  popularityBars: {
    flexDirection: 'row',
    gap: 3,
  },
  popularityBar: {
    width: 8,
    height: 12,
    borderRadius: 2,
  },
  boxerAvatarRing: {
    alignItems: 'center',
    marginBottom: 10,
    borderRadius: 32,
    borderWidth: 2,
    padding: 2,
    alignSelf: 'center',
  },
});
