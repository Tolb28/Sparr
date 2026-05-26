import React from 'react';
import { ImageBackground, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { GlassCard } from '@/components/ui/glass-card';
import { Text } from '@/components/ui/text';
import MembershipCTA from './MembershipCTA';
import { colors } from '@/src/theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

interface ClubHeaderProps {
  club: any;
  canManage: boolean;
  joining?: boolean;
  leaving?: boolean;
  sharing?: boolean;
  onJoin?: () => void;
  onLeave?: () => void;
  onManage?: () => void;
  onShare?: () => void;
}

export default function ClubHeader({ club, canManage, joining, leaving, sharing, onJoin, onLeave, onManage, onShare }: ClubHeaderProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  return (
    <>
      <View style={styles.coverWrapper}>
        <ImageBackground
          source={club?.cover_url ? { uri: club.cover_url } : undefined}
          style={styles.cover}
          imageStyle={styles.coverImage}
        >
          {!club?.cover_url && (
            <View style={styles.coverFallback}>
              <View style={styles.coverFallbackInner} />
            </View>
          )}
          <View style={styles.coverGradient} />

          <View style={[styles.headerBar, { paddingTop: (insets.top || 0) + 4 }]}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerRight}>
              {club?.can_manage && (
                <TouchableOpacity
                  onPress={onManage}
                  style={[styles.iconBtn, styles.manageIconBtn]}
                >
                  <Ionicons name="settings-outline" size={18} color={colors.primary.main} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.iconBtn, sharing && { opacity: 0.65 }]}
                onPress={onShare}
                accessibilityLabel="Share club"
                disabled={sharing}
              >
                <Ionicons name="share-social-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.avatarAnchor}>
          <View style={styles.avatarRing}>
            <Avatar size="2xl">
              <AvatarFallbackText>{club?.title?.[0] ?? 'C'}</AvatarFallbackText>
              <AvatarImage source={club?.avatar_url ? { uri: club.avatar_url } : undefined} />
            </Avatar>
          </View>
          {club?.is_verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary.main} />
            </View>
          )}
        </View>
      </View>

      <View style={styles.identityBlock}>
        <View style={styles.identityLeft}>
          <Text style={styles.clubName}>{club?.title ?? 'Club'}</Text>
          {!!club?.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={colors.text.tertiary} />
              <Text style={styles.locationText}>{club.location}</Text>
            </View>
          )}
          {!!club?.join_policy && (
            <View style={styles.policyChip}>
              <Text style={styles.policyChipText}>
                {club.join_policy === 'open' ? '🔓 Open' : '🔒 Approval'}
              </Text>
            </View>
          )}
        </View>

        <View style={{ flex: 1 }} />
      </View>

      <View style={styles.statsRow}>
        {[
          { label: 'Members', value: club?.members_count ?? 0 },
          { label: 'Posts',   value: club?.posts_count ?? 0 },
          { label: 'Plans',   value: club?.training_plans_count ?? 0 },
        ].map((stat, i) => (
          <View key={stat.label} style={[styles.statItem, i === 1 && styles.statItemMiddle]}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.ctaRow}>
        <MembershipCTA
          club={club}
          canManage={canManage}
          joining={joining}
          leaving={leaving}
          onJoin={onJoin}
          onLeave={onLeave}
          onManage={onManage}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  coverWrapper: { marginBottom: 8 },
  cover: { height: 200, width: '100%', justifyContent: 'flex-start' },
  coverImage: { resizeMode: 'cover' },
  coverFallback: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  coverFallbackInner: { height: 60, width: 120, backgroundColor: colors.glass.surface, borderRadius: 8 },
  coverGradient: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'transparent' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.glass.surface, borderWidth: 1, borderColor: colors.glass.border, alignItems: 'center', justifyContent: 'center' },
  headerRight: { flexDirection: 'row', gap: 8 },
  manageIconBtn: { marginRight: 8 },
  avatarAnchor: { marginTop: -40, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarRing: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  verifiedBadge: { marginLeft: -12, marginTop: 56 },
  identityBlock: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6, flexDirection: 'row', alignItems: 'center' },
  identityLeft: { flex: 1 },
  clubName: { color: colors.text.primary, fontWeight: '800', fontSize: 18 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locationText: { color: colors.text.tertiary, fontSize: 12 },
  policyChip: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: colors.glass.border, backgroundColor: colors.glass.surface, alignSelf: 'flex-start' },
  policyChipText: { color: colors.text.tertiary, fontSize: 12 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginTop: 8 },
  statItem: { flex: 1, alignItems: 'center' },
  statItemMiddle: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border.light },
  statValue: { color: colors.text.primary, fontWeight: '800', fontSize: 18 },
  statLabel: { color: colors.text.tertiary, fontSize: 12 },
  ctaRow: { paddingHorizontal: 16, marginTop: 10, marginBottom: 12 },
});
