import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Pressable, StyleSheet, RefreshControl, Share } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getUserProfile } from '../api/profile';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { removeProfile } from '../api/profileHandler';
import { deleteToken } from '../api/tokenHandler';import ProfilePosts from '../components/ProfilePosts';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { recalculateGamification } from '../api/gamification';
import { getMyClubMemberships } from '../api/clubs';
import { GlassCard } from '@/components/ui/glass-card';
import { TabBar } from '@/components/ui/tab-bar';
import { SkeletonCard, SkeletonLoader } from '@/components/ui/skeleton-loader';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import BadgeCarousel from '../components/BadgeCarousel';
import { useProgress } from '@/src/context/ProgressContext';

type Profile = {
  id_profiles?: number;
  display_name?: string;
  username?: string;
  location?: string;
  bio?: string;
  title_weight?: string | null;
  title_style?: string | null;
  avatar_url?: string | null;
};

type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
const TABS = ['Personalized', 'Posts', 'About'];

export default function ProfileScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('Personalized');
  const [memberships, setMemberships] = useState<any[]>([]);
  const {
    metrics,
    badges: progressBadges,
    loading: progressLoading,
    error: progressError,
    refresh: refreshProgress,
  } = useProgress();

  const loadProfile = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const data = await getUserProfile({ forceRefresh });
      const p = data?.profile ?? data;
      setProfile(p);
      if (p?.id_profiles) {
        try { await recalculateGamification(Number(p.id_profiles)); } catch {}
        await refreshProgress(true).catch(() => {});
        const membershipsData = await getMyClubMemberships().catch(() => []);
        setMemberships(membershipsData || []);
      }
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load profile');
      await deleteToken();
      await removeProfile();
      navigation.navigate('Login');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfile(true);
    setRefreshTrigger((p) => p + 1);
    setRefreshing(false);
  };

  const handleShareProfile = async () => {
    const displayName = profile?.display_name || profile?.username || 'an athlete';
    try {
      await Share.share({
        message: `Check out ${displayName}'s profile on Sparr.`,
      });
    } catch {}
  };

  useEffect(() => { loadProfile(); }, []);
  useFocusEffect(React.useCallback(() => { loadProfile(); }, []));

  const nextBadge = useMemo(() => {
    if (!progressBadges || progressBadges.length === 0) return null;
    const unearned = progressBadges.filter((badge) => !badge.earned);
    if (!unearned.length) return null;
    return [...unearned].sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))[0] ?? null;
  }, [progressBadges]);

  const nextBadgeProgress = nextBadge ? Math.round((nextBadge.progress ?? 0) * 100) : 0;

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, backgroundColor: c.background.secondary }]}>
        <View style={styles.loadingHeader}>
          <SkeletonLoader width={36} height={36} borderRadius={18} />
          <SkeletonLoader width={140} height={18} borderRadius={8} />
          <SkeletonLoader width={36} height={36} borderRadius={18} />
        </View>
        <View style={styles.loadingHero}>
          <SkeletonLoader width={80} height={80} borderRadius={40} />
          <View style={styles.loadingHeroText}>
            <SkeletonLoader width={160} height={22} borderRadius={8} />
            <SkeletonLoader width={100} height={14} borderRadius={6} style={{ marginTop: 8 }} />
          </View>
        </View>
        <View style={styles.paddedContent}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.root, { flex: 1, justifyContent: 'center' }]}>
        <ErrorState message={error} onRetry={loadProfile} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background.secondary }]}>
       <ScrollView
         contentContainerStyle={{ paddingBottom: 120 + (insets.bottom || 0) }}
         showsVerticalScrollIndicator={false}
         refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.primary.main} />}
       >
        {/* Header bar */}
        <View style={[styles.headerBar, { paddingTop: (insets.top || 0) + 8, backgroundColor: c.background.secondary, borderBottomColor: c.border.light }]}>
          <Pressable
            style={[styles.iconBtn, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]}
            onPress={() => navigation.navigate('Settings')}
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={18} color={c.text.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: c.text.primary }]}>Athlete Profile</Text>
          <Pressable style={[styles.iconBtn, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]} accessibilityLabel="Share profile" onPress={handleShareProfile}>
            <Ionicons name="share-social-outline" size={18} color={c.text.primary} />
          </Pressable>
        </View>

        {/* Hero: avatar + info + actions */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={[styles.avatarRing, { borderColor: c.primary.main }]}>
              <Avatar size="2xl">
                <AvatarFallbackText style={styles.avatarFallback}>{profile?.display_name || '?'}</AvatarFallbackText>
                <AvatarImage source={{ uri: profile?.avatar_url || undefined }} />
              </Avatar>
            </View>

            <View style={styles.heroInfo}>
              <Text style={[styles.displayName, { color: c.text.primary }]}>{profile?.display_name || 'Athlete'}</Text>
              <Text style={[styles.username, { color: c.text.secondary }]}>@{profile?.username || 'username'}</Text>
              {!!profile?.location && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={12} color={c.text.tertiary} />
                  <Text style={[styles.locationText, { color: c.text.tertiary }]}>{profile.location}</Text>
                </View>
              )}
            </View>
          </View>

          {!!profile?.bio && (
            <GlassCard style={styles.bioCard} radius={12} padding={12}>
              <Text style={[styles.bioText, { color: c.text.secondary }]}>"{profile.bio}"</Text>
            </GlassCard>
          )}

          {/* Stats row */}
          <View style={styles.statsRow}>
            <GlassCard style={styles.statCard} radius={12} padding={12}>
              <Text style={[styles.statLabel, { color: c.text.tertiary }]}>WEIGHT</Text>
              <Text style={[styles.statValue, { color: c.text.primary }]}>{profile?.title_weight || '—'}</Text>
            </GlassCard>
            <GlassCard style={styles.statCard} radius={12} padding={12}>
              <Text style={[styles.statLabel, { color: c.text.tertiary }]}>STYLE</Text>
              <Text style={[styles.statValue, { color: c.text.primary }]}>{profile?.title_style || '—'}</Text>
            </GlassCard>
              <GlassCard style={[styles.statCard, styles.statCardScore]} radius={12} padding={12}>
                <Text style={[styles.statLabel, { color: c.text.tertiary }]}>HEIGHT</Text>
                <Text style={[styles.statValue, { color: c.text.primary }]}>{profile?.height_cm ? `${profile.height_cm} cm` : '—'}</Text>
              </GlassCard>
            </View>

        </View>

        {/* Tabs */}
        <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} style={styles.tabs} />

        {/* Tab content */}
        {activeTab === 'Personalized' && (
          <View style={styles.tabContent}>
            <GlassCard variant="medium" radius={16} padding={16} style={styles.contentCard}>
              <Text style={[styles.sectionLabel, { color: c.text.tertiary }]}>YOUR PROGRESS</Text>
              {progressLoading ? (
                <View style={styles.quickSkeleton}>
                  <SkeletonLoader width="55%" height={12} borderRadius={6} />
                  <SkeletonLoader width="65%" height={12} borderRadius={6} />
                  <SkeletonLoader width="70%" height={12} borderRadius={6} />
                </View>
              ) : progressError ? (
                <View style={styles.progressFallbackWrap}>
                  <Text style={[styles.progressFallback, { color: c.text.secondary }]}>Progress unavailable right now.</Text>
                  <Pressable
                    style={[styles.progressRetryButton, { borderColor: c.glass.redBorder, backgroundColor: c.glass.redSurface }]}
                    onPress={() => refreshProgress(true).catch(() => {})}
                    accessibilityRole="button"
                    accessibilityLabel="Retry loading progress"
                    testID="ProfileScreen_ProgressRetry"
                  >
                    <Ionicons name="reload" size={14} color={c.primary.main} />
                    <Text style={[styles.progressRetryText, { color: c.primary.main }]}>Retry</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.quickStats}>
                  <View style={styles.quickRow}>
                    <Ionicons name="flame" size={14} color={c.warning.main} />
                    <Text style={[styles.quickText, { color: c.text.secondary }]}>
                      Streak: {metrics?.streak_days ?? 0} days
                    </Text>
                  </View>
                  <View style={styles.quickRow}>
                    <Ionicons name="barbell" size={14} color={c.primary.main} />
                    <Text style={[styles.quickText, { color: c.text.secondary }]}>
                      This Week: {metrics?.workouts_completed ?? 0} workouts
                    </Text>
                  </View>
                  <View style={styles.quickRow}>
                    <Ionicons name="trophy" size={14} color={c.warning.light} />
                    <Text style={[styles.quickText, { color: c.text.secondary }]}>
                      Next Badge:{' '}
                      {nextBadge
                        ? `${nextBadge.title} ${nextBadgeProgress}%`
                        : 'All badges unlocked'}
                    </Text>
                  </View>
                </View>
              )}
              <Pressable
                style={[styles.viewProgressButton, { borderColor: c.glass.border, backgroundColor: c.glass.surface }]}
                onPress={() => (navigation as any).navigate('Calendar')}
                accessibilityRole="button"
                accessibilityLabel="View full progress"
                testID="ProfileScreen_ViewFullProgress"
              >
                <Text style={[styles.viewProgressText, { color: c.text.primary }]}>View Full Progress</Text>
                <Ionicons name="arrow-forward" size={14} color={c.text.primary} />
              </Pressable>
            </GlassCard>
            {/* Badges */}
            <GlassCard variant="medium" radius={16} padding={16} style={styles.contentCard}>
              <Text style={[styles.sectionLabel, { color: c.text.tertiary }]}>BADGES</Text>
              {progressLoading ? (
                <View style={styles.progressSkeleton}>
                  <SkeletonLoader width="60%" height={14} borderRadius={6} />
                  <SkeletonLoader width="80%" height={14} borderRadius={6} />
                </View>
              ) : progressError ? (
                <Text style={[styles.progressFallback, { color: c.text.secondary }]}>Badges unavailable right now.</Text>
              ) : (
                <BadgeCarousel badges={progressBadges || []} showProgress />
              )}
            </GlassCard>

            {/* Club roles */}
            <Text style={[styles.sectionTitle, { color: c.text.primary }]}>Club Roles</Text>
            {memberships.length === 0 ? (
              <EmptyState
                icon="shield-outline"
                title="No club memberships"
                subtitle="Join a club to train with others"
                style={styles.emptyState}
              />
            ) : (
              memberships.map((m: any) => {
                const role = String(m.role_title || 'member').toLowerCase();
                const canManageClub = role === 'owner' || role === 'admin';
                return (
                  <Pressable
                    key={String(m.idclubs)}
                    onPress={() => navigation.navigate('ClubProfile', { clubId: Number(m.idclubs) })}
                  >
                    <GlassCard variant="medium" radius={14} padding={14} style={styles.clubCard}>
                      <View style={styles.clubCardRow}>
                        <View style={[styles.clubDot, { backgroundColor: c.primary.main }]} />
                        <View style={styles.flex1}>
                          <Text style={[styles.clubTitle, { color: c.text.primary }]}>{m.role_title || 'Member'} · {m.title}</Text>
                          {!!m.location && <Text style={[styles.clubLocation, { color: c.text.tertiary }]}>{m.location}</Text>}
                        </View>
                        {canManageClub ? (
                          <Pressable
                            style={[styles.manageClubBtn, { borderColor: c.glass.redBorder, backgroundColor: c.glass.redSurface }]}
                            onPress={(e: any) => {
                              e?.stopPropagation?.();
                              navigation.navigate('ManageClub', { clubId: Number(m.idclubs) });
                            }}
                          >
                            <Ionicons name="settings-outline" size={13} color={c.primary.main} />
                            <Text style={[styles.manageClubBtnText, { color: c.primary.main }]}>Manage</Text>
                          </Pressable>
                        ) : (
                          <Ionicons name="chevron-forward" size={14} color={c.text.tertiary} />
                        )}
                      </View>
                    </GlassCard>
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        {activeTab === 'Posts' && (
          profile?.id_profiles ? (
            <ProfilePosts profileId={profile.id_profiles} refreshTrigger={refreshTrigger} />
          ) : null
        )}

        {activeTab === 'About' && (
          <View style={styles.tabContent}>
            <GlassCard variant="medium" radius={16} padding={16} style={styles.contentCard}>
              <Text style={[styles.sectionLabel, { color: c.text.tertiary }]}>BIO</Text>
              <Text style={[styles.aboutText, { color: c.text.secondary }]}>{profile?.bio || 'No bio added yet.'}</Text>
            </GlassCard>
            <GlassCard variant="medium" radius={16} padding={16} style={styles.contentCard}>
              <Text style={[styles.sectionLabel, { color: c.text.tertiary }]}>LOCATION</Text>
              <Text style={[styles.aboutText, { color: c.text.secondary }]}>{profile?.location || 'No location set.'}</Text>
            </GlassCard>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => (navigation as any).navigate('CreatePost')}
        style={[styles.fab, { backgroundColor: c.primary.main, shadowColor: c.primary.main }]}
        accessibilityRole="button"
        accessibilityLabel="Create post"
      >
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  hero: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  avatarRing: {
    padding: 3, borderRadius: 46, borderWidth: 2,
  },
  avatarFallback: { color: '#ffffff' },
  heroInfo: { flex: 1 },
  displayName: { fontSize: 22, fontWeight: '800', letterSpacing: 0.2 },
  username: { fontSize: 13, marginTop: 3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 5 },
  locationText: { fontSize: 12 },
  bioCard: { marginBottom: 14 },
  bioText: { fontSize: 13, fontStyle: 'italic', lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: { flex: 1, minWidth: 80 },
  statCardScore: {},
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4, textAlign: 'center' },
  statValue: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  statValueRed: {},
  logoutBtn: {
    width: 46, height: 46, borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  tabs: { marginTop: 8 },
  tabContent: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  contentCard: { marginBottom: 0 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  quickStats: { gap: 8, marginBottom: 10 },
  quickRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quickText: { fontSize: 12, lineHeight: 18 },
  quickSkeleton: { gap: 8, marginBottom: 10 },
  progressFallbackWrap: { gap: 8, marginBottom: 8 },
  progressFallback: { fontSize: 12 },
  progressRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
  },
  progressRetryText: { fontSize: 12, fontWeight: '700' },
  viewProgressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 44,
  },
  viewProgressText: { fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  progressStats: { flexDirection: 'row', alignItems: 'center' },
  progressSkeleton: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressStat: { flex: 1, alignItems: 'center' },
  progressNum: { fontSize: 22, fontWeight: '800' },
  progressStatLabel: { fontSize: 11, marginTop: 2 },
  progressDivider: { width: 1, height: 30 },
  badgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1,
  },
  badgeEarned: {},
  badgeText: { fontSize: 12, fontWeight: '600' },
  badgeTextEarned: {},
  emptyText: { fontSize: 13 },
  emptyState: { paddingVertical: 24 },
  clubCard: { marginHorizontal: 16, marginBottom: 8 },
  clubCardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  clubDot: { width: 8, height: 8, borderRadius: 4 },
  flex1: { flex: 1 },
  clubTitle: { fontSize: 13, fontWeight: '600' },
  clubLocation: { fontSize: 11, marginTop: 2 },
  manageClubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  manageClubBtnText: { fontSize: 12, fontWeight: '700' },
  aboutText: { fontSize: 14, lineHeight: 20 },
  loadingHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  loadingHero: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingTop: 20 },
  loadingHeroText: { flex: 1, gap: 8 },
  paddedContent: { paddingHorizontal: 16, paddingTop: 16 },
  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 54, height: 54, borderRadius: 27,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8,
    elevation: 8,
  },
});
