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
import { colors } from '@/src/theme/colors';
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
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.root, styles.center]}>
        <ErrorState message={error} onRetry={() => {}} />
      </View>
    );
  }

  const FOREIGN_TABS = [
    { key: 'posts', label: 'Posts' },
    { key: 'about', label: 'About' },
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary.main} />}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: (insets.top || 0) + 4 }]}>
          <Pressable
  onPress={() => navigation.goBack()}
  style={styles.iconBtn}
  accessibilityRole="button"
  accessibilityLabel="Back"
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Athlete Profile</Text>
          <Pressable
  style={styles.iconBtn}
  onPress={handleShareProfile}
  accessibilityLabel="Share profile"
  accessibilityRole="button"
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
>
            <Ionicons name="share-social-outline" size={18} color="#fff" />
          </Pressable>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.avatarRing}>
            <Avatar size="2xl">
              <AvatarFallbackText>{profile?.display_name ?? '?'}</AvatarFallbackText>
              <AvatarImage source={{ uri: profile?.avatar_url || undefined }} />
            </Avatar>
          </View>
          <Text style={styles.displayName}>{profile?.display_name ?? 'Athlete'}</Text>
          <Text style={styles.username}>@{profile?.username ?? 'username'}</Text>
          {!!profile?.location && <Text style={styles.location}>{profile.location}</Text>}
          {!!profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          {/* CTA row */}
          <View style={styles.ctaRow}>
            {statusLoading ? (
              <View style={styles.loadingCta}>
                <ActivityIndicator size="small" color={colors.primary.main} />
              </View>
            ) : friendStatus === 'friends' ? (
              <Pressable style={styles.iconCircleBtn} onPress={handleUnfriend} accessibilityLabel="Unfriend">
                <Ionicons name="person-remove-outline" size={20} color={colors.primary.main} />
              </Pressable>
            ) : friendStatus === 'pending_sent' ? (
              <Pressable style={[styles.iconCircleBtn, styles.iconCircleBtnMuted]} onPress={() => {}} accessibilityLabel="Request Sent">
                <Ionicons name="time-outline" size={20} color={colors.text.secondary} />
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
              <Pressable style={styles.iconCircleBtn} onPress={handleAddFriend} accessibilityLabel="Add Friend">
                <Ionicons name="person-add-outline" size={20} color={colors.primary.main} />
              </Pressable>
            )}
            <Pressable
              style={styles.iconCircleBtn}
              onPress={handleMessage}
              disabled={messagingLoading}
              accessibilityLabel="Message"
            >
              <Ionicons name="chatbubble-outline" size={20} color={colors.text.secondary} />
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
              <Text style={styles.cardLabel}>WEEKLY PROGRESS</Text>
              <Text style={styles.cardValue}>Score: {progress?.metrics?.score ?? 0}</Text>
              <Text style={styles.cardMeta}>
                Workouts: {progress?.metrics?.workouts_completed ?? 0} · Club: {progress?.metrics?.club_sessions ?? 0}
              </Text>
            </GlassCard>

            <GlassCard variant="medium" radius={14} padding={14} style={styles.aboutCard}>
              <Text style={styles.cardLabel}>BADGES</Text>
              <BadgeCarousel badges={(badges || []).map((b: any) => ({ ...b, earned: true }))} />
            </GlassCard>

            <GlassCard variant="medium" radius={14} padding={14} style={styles.aboutCard}>
              <Text style={styles.cardLabel}>WEIGHT CLASS</Text>
              <Text style={styles.cardValue}>{profile?.title_weight || 'Not set'}</Text>
            </GlassCard>

            <GlassCard variant="medium" radius={14} padding={14} style={styles.aboutCard}>
              <Text style={styles.cardLabel}>BOXING STYLE</Text>
              <Text style={styles.cardValue}>{profile?.title_style || 'Not set'}</Text>
            </GlassCard>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.secondary },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border.light,
  },
  headerTitle: { color: colors.text.primary, fontSize: 16, fontWeight: '700' },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.glass.surface, borderWidth: 1, borderColor: colors.glass.border,
    alignItems: 'center', justifyContent: 'center',
  },
  hero: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  avatarRing: { borderRadius: 48, borderWidth: 2.5, borderColor: colors.primary.main, padding: 3, marginBottom: 12 },
  displayName: { color: colors.text.primary, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  username: { color: colors.text.secondary, fontSize: 13, marginTop: 3 },
  location: { color: colors.text.tertiary, fontSize: 12, marginTop: 4 },
  bio: { color: colors.text.secondary, fontSize: 12, marginTop: 8, textAlign: 'center', paddingHorizontal: 16, lineHeight: 18 },
  ctaRow: { flexDirection: 'row', gap: 12, marginTop: 16, justifyContent: 'center' },
  loadingCta: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  iconCircleBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.glass.surface, borderWidth: 1, borderColor: colors.glass.border,
    alignItems: 'center', justifyContent: 'center',
  },
  iconCircleBtnMuted: { borderColor: colors.border.light },
  iconCircleBtnGreen: { backgroundColor: '#10b981', borderColor: '#10b981' },
  tabBarWrapper: { marginTop: 12, marginHorizontal: 16 },
  aboutSection: { padding: 16, gap: 10 },
  aboutCard: { marginBottom: 0 },
  cardLabel: { color: colors.text.tertiary, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  cardValue: { color: colors.text.primary, fontSize: 14, fontWeight: '600' },
  cardMeta: { color: colors.text.secondary, fontSize: 11, marginTop: 2 },
  badgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  badge: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
    backgroundColor: colors.glass.redSurface, borderWidth: 1, borderColor: colors.primary.main,
  },
  badgeText: { color: colors.text.primary, fontSize: 11, fontWeight: '600' },
});
