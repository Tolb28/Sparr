import React, { useEffect, useState } from 'react';
import { ScrollView, ActivityIndicator, RefreshControl, View, Pressable, StyleSheet, Share } from 'react-native';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getForeignProfile } from '../api/profile';
import { checkFriendStatus, sendFriendRequest, unfriend } from '../api/friends';
import { createConversation } from '../api/chatApi';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import ProfilePosts from '../components/ProfilePosts';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getProfileBadges, getProfileProgress } from '../api/gamification';
import { GlassCard } from '@/components/ui/glass-card';
import { TabBar } from '@/components/ui/tab-bar';
import { ErrorState } from '@/components/ui/error-state';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import BadgeCarousel from '../components/BadgeCarousel';

type Profile = {
  id_profiles?: number;
  display_name?: string;
  username?: string;
  location?: string;
  bio?: string;
  avatar_url?: string | null;
  title_weight?: string | null;
  title_style?: string | null;
};

type ProfileRouteProp = RouteProp<RootStackParamList, 'ForeignProfile'>;
type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ForeignProfileScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const route = useRoute<ProfileRouteProp>();
  const { foreign_profile_id } = route.params;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [friendStatus, setFriendStatus] = useState<'friends' | 'pending_sent' | 'pending_received' | 'none'>('none');
  const [statusLoading, setStatusLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'about'>('posts');
  const [badges, setBadges] = useState<any[]>([]);
  const [progress, setProgress] = useState<any | null>(null);
  const [clubMemberships, setClubMemberships] = useState<any[]>([]);
  const [messagingLoading, setMessagingLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setStatusLoading(true);
      try {
        const data = await getForeignProfile(foreign_profile_id);
        const p = data?.profile ?? data;
        if (!mounted) return;
        setProfile(p);
        setClubMemberships(data?.club_memberships || []);
        if (p?.id_profiles) {
          const [badgeData, progressData] = await Promise.all([
            getProfileBadges(Number(p.id_profiles)),
            getProfileProgress(Number(p.id_profiles), 'weekly'),
          ]);
          if (!mounted) return;
          setBadges(badgeData || []);
          setProgress(progressData || null);
        }
        const status = await checkFriendStatus(p.id_profiles);
        if (!mounted) return;
        setFriendStatus(status);
      } catch (err: any) {
        if (mounted) setError(err?.message ?? 'Failed to load profile');
      } finally {
        if (mounted) {
          setLoading(false);
          setStatusLoading(false);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [foreign_profile_id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await getForeignProfile(foreign_profile_id);
      const p = data?.profile ?? data;
      setClubMemberships(data?.club_memberships || []);
      setProfile(p);
      const status = await checkFriendStatus(p.id_profiles);
      setFriendStatus(status);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load profile');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddFriend = async () => {
    if (!profile?.id_profiles) return;
    try {
      setStatusLoading(true);
      await sendFriendRequest(profile.id_profiles);
      setFriendStatus('pending_sent');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleUnfriend = async () => {
    if (!profile?.id_profiles) return;
    try {
      setStatusLoading(true);
      await unfriend(profile.id_profiles);
      setFriendStatus('none');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!profile?.id_profiles) return;
    setMessagingLoading(true);
    try {
      const conversation = await createConversation([profile.id_profiles], 0);
      (navigation as any).navigate('ChatDetail', {
        conversationId: conversation.id_conversations,
        otherParticipantName: profile.display_name,
        otherParticipantAvatar: profile.avatar_url,
      });
    } catch (error) {
      console.error('Failed to create or open conversation:', error);
    } finally {
      setMessagingLoading(false);
    }
  };

  const handleShareProfile = async () => {
    if (!profile) return;
    const displayName = profile.display_name || profile.username || 'an athlete';
    try {
      await Share.share({
        message: `Check out ${displayName}'s profile on Sparr.`,
      });
    } catch {}
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: c.background.secondary }]}>
        <ActivityIndicator size="large" color={c.primary.main} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: c.background.secondary }]}>
        <ErrorState message={error} onRetry={() => {}} />
      </View>
    );
  }

  const FOREIGN_TABS = [
    { key: 'posts', label: 'Posts' },
    { key: 'about', label: 'About' },
  ];

  return (
    <View style={[styles.root, { backgroundColor: c.background.secondary }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.primary.main} />}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: (insets.top || 0) + 4, borderBottomColor: c.border.light }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.iconBtn, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color={c.text.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: c.text.primary }]}>Athlete Profile</Text>
          <Pressable
            style={[styles.iconBtn, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]}
            onPress={handleShareProfile}
            accessibilityLabel="Share profile"
            accessibilityRole="button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="share-social-outline" size={18} color={c.text.primary} />
          </Pressable>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.avatarRing, { borderColor: c.primary.main }]}>
            <Avatar size="2xl">
              <AvatarFallbackText>{profile?.display_name ?? '?'}</AvatarFallbackText>
              <AvatarImage source={{ uri: profile?.avatar_url || undefined }} />
            </Avatar>
          </View>
          <Text style={[styles.displayName, { color: c.text.primary }]}>{profile?.display_name ?? 'Athlete'}</Text>
          <Text style={[styles.username, { color: c.text.secondary }]}>@{profile?.username ?? 'username'}</Text>
          {!!profile?.location && <Text style={[styles.location, { color: c.text.tertiary }]}>{profile.location}</Text>}
          {!!profile?.bio && <Text style={[styles.bio, { color: c.text.secondary }]}>{profile.bio}</Text>}

          {/* CTA row */}
          <View style={styles.ctaRow}>
            {statusLoading ? (
              <View style={styles.loadingCta}>
                <ActivityIndicator size="small" color={c.primary.main} />
              </View>
            ) : friendStatus === 'friends' ? (
              <Pressable style={[styles.iconCircleBtn, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]} onPress={handleUnfriend} accessibilityLabel="Unfriend">
                <Ionicons name="person-remove-outline" size={20} color={c.primary.main} />
              </Pressable>
            ) : friendStatus === 'pending_sent' ? (
              <Pressable style={[styles.iconCircleBtn, { backgroundColor: c.glass.surface, borderColor: c.border.light }]} onPress={() => {}} accessibilityLabel="Request Sent">
                <Ionicons name="time-outline" size={20} color={c.text.secondary} />
              </Pressable>
            ) : friendStatus === 'pending_received' ? (
              <Pressable
                style={[styles.iconCircleBtn, styles.iconCircleBtnGreen]}
                onPress={() => (navigation as any).navigate('Main', { screen: 'Friends', params: { activeTab: 'requests' } })}
                accessibilityLabel="Accept Request"
              >
                <Ionicons name="checkmark-outline" size={20} color="#fff" />
              </Pressable>
            ) : (
              <Pressable style={[styles.iconCircleBtn, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]} onPress={handleAddFriend} accessibilityLabel="Add Friend">
                <Ionicons name="person-add-outline" size={20} color={c.primary.main} />
              </Pressable>
            )}
            <Pressable
              style={[styles.iconCircleBtn, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]}
              onPress={handleMessage}
              disabled={messagingLoading}
              accessibilityLabel="Message"
            >
              <Ionicons name="chatbubble-outline" size={20} color={c.text.secondary} />
            </Pressable>
          </View>
        </View>

        {/* Tab bar */}
        <View style={styles.tabBarWrapper}>
          <TabBar
            tabs={FOREIGN_TABS}
            activeTab={activeTab}
            onTabChange={(t) => setActiveTab(t as 'posts' | 'about')}
          />
        </View>

        {activeTab === 'posts' ? (
          profile?.id_profiles ? <ProfilePosts profileId={profile.id_profiles} refreshTrigger={refreshTrigger} /> : null
        ) : (
          <View style={styles.aboutSection}>
            <GlassCard variant="medium" radius={14} padding={14} style={styles.aboutCard}>
              <Text style={[styles.cardLabel, { color: c.text.tertiary }]}>WEEKLY PROGRESS</Text>
              <Text style={[styles.cardValue, { color: c.text.primary }]}>Score: {progress?.metrics?.score ?? 0}</Text>
              <Text style={[styles.cardMeta, { color: c.text.secondary }]}>
                Workouts: {progress?.metrics?.workouts_completed ?? 0} · Club: {progress?.metrics?.club_sessions ?? 0}
              </Text>
            </GlassCard>

            <GlassCard variant="medium" radius={14} padding={14} style={styles.aboutCard}>
              <Text style={[styles.cardLabel, { color: c.text.tertiary }]}>BADGES</Text>
              <BadgeCarousel badges={(badges || []).map((b: any) => ({ ...b, earned: true }))} />
            </GlassCard>

            <GlassCard variant="medium" radius={14} padding={14} style={styles.aboutCard}>
              <Text style={[styles.cardLabel, { color: c.text.tertiary }]}>WEIGHT CLASS</Text>
              <Text style={[styles.cardValue, { color: c.text.primary }]}>{profile?.title_weight || 'Not set'}</Text>
            </GlassCard>

            <GlassCard variant="medium" radius={14} padding={14} style={styles.aboutCard}>
              <Text style={[styles.cardLabel, { color: c.text.tertiary }]}>BOXING STYLE</Text>
              <Text style={[styles.cardValue, { color: c.text.primary }]}>{profile?.title_style || 'Not set'}</Text>
            </GlassCard>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
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
  hero: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  avatarRing: { borderRadius: 48, borderWidth: 2.5, padding: 3, marginBottom: 12 },
  displayName: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  username: { fontSize: 13, marginTop: 3 },
  location: { fontSize: 12, marginTop: 4 },
  bio: { fontSize: 12, marginTop: 8, textAlign: 'center', paddingHorizontal: 16, lineHeight: 18 },
  ctaRow: { flexDirection: 'row', gap: 12, marginTop: 16, justifyContent: 'center' },
  loadingCta: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  iconCircleBtn: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  iconCircleBtnGreen: { backgroundColor: '#10b981', borderColor: '#10b981' },
  tabBarWrapper: { marginTop: 12, marginHorizontal: 16 },
  aboutSection: { padding: 16, gap: 10 },
  aboutCard: { marginBottom: 0 },
  cardLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  cardValue: { fontSize: 14, fontWeight: '600' },
  cardMeta: { fontSize: 11, marginTop: 2 },
  badgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  badge: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
});
