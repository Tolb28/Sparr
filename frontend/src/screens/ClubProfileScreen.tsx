import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { GlassCard } from '@/components/ui/glass-card';
import { SparrButton } from '@/components/ui/sparr-button';
import { EmptyState } from '@/components/ui/empty-state';
import FeedPost from '../components/Post';
import { RootStackParamList } from '../navigation/AppNavigator';
import {
  copyClubTrainingPlan,
  getClub,
  getClubMembers,
  getClubPosts,
  getClubSelectedCalendar,
  getClubTrainingPlans,
  joinClub,
  leaveClub,
  requestJoinClub,
} from '../api/clubs';
import { getTraining } from '../api/trainingCalendars';
import WeeklyCalendar from '../components/WeeklyCalendar';
import TrainingCard from '../components/TrainingCard';
import DayTimelineView, { TimelineTraining } from '../components/DayTimelineView';
import { colors } from '@/src/theme/colors';

type ClubProfileRouteProp = RouteProp<RootStackParamList, 'ClubProfile'>;

const COVER_HEIGHT = 200;
const AVATAR_SIZE = 84;
const AVATAR_OVERLAP = 40;
const TAB_INDICATOR_INSET = 8;
const TABS = ['Posts', 'Schedule', 'Members', 'About'] as const;
type Tab = typeof TABS[number];

const ROLE_COLORS: Record<string, string> = {
  owner:  '#f5c518',
  admin:  colors.primary.main,
  coach:  '#06b6d4',
  member: colors.text.tertiary,
};

export default function ClubProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<ClubProfileRouteProp>();
  const { clubId } = route.params;

  const [club, setClub]             = useState<any | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining]       = useState(false);
  const [leaving, setLeaving]       = useState(false);
  const [activeTab, setActiveTab]   = useState<Tab>('Posts');

  // Tab content state
  const [posts, setPosts]               = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [plans, setPlans]               = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [members, setMembers]           = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [copyingPlan, setCopyingPlan]   = useState<number | null>(null);
  const [calendar, setCalendar]         = useState<any>(null);
  const [calendarItems, setCalendarItems] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [resolvedTrainings, setResolvedTrainings] = useState<TimelineTraining[]>([]);

  const todayDate = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const [tabBarWidth, setTabBarWidth] = useState(0);
  const tabWidth = tabBarWidth > 0 ? tabBarWidth / TABS.length : 0;
  const indicatorWidth = Math.max(0, tabWidth - TAB_INDICATOR_INSET * 2);
  const activeTabIndex = Math.max(0, TABS.indexOf(activeTab));
  const indicatorLeft = TAB_INDICATOR_INSET + activeTabIndex * tabWidth;

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const clubData = await getClub(clubId);
      setClub(clubData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clubId]);

  useEffect(() => { load(); }, [load]);

  const handleTabPress = useCallback((tab: Tab) => {
    setActiveTab(tab);
  }, []);

  useEffect(() => {
    loadTabContent(activeTab);
  }, [activeTab, clubId]);

  const loadTabContent = async (tab: Tab) => {
    if (tab === 'Posts' && posts.length === 0) {
      setPostsLoading(true);
      try { const data = await getClubPosts(clubId); setPosts(data); } finally { setPostsLoading(false); }
    }
    if (tab === 'Schedule' && plans.length === 0) {
      setPlansLoading(true);
      try {
        const [plansData, calData] = await Promise.all([
          getClubTrainingPlans(clubId),
          getClubSelectedCalendar(clubId).catch(() => null),
        ]);
        setPlans(plansData);
        if (calData?.calendar) {
          setCalendar(calData.calendar);
          setCalendarItems(calData.items ?? []);
        }
      } finally { setPlansLoading(false); }
    }
    if (tab === 'Members' && members.length === 0) {
      setMembersLoading(true);
      try { const data = await getClubMembers(clubId); setMembers(data); } finally { setMembersLoading(false); }
    }
  };

  const handleJoin = async () => {
    if (!club) return;
    try {
      setJoining(true);
      if ((club.join_policy || 'open') === 'open') {
        await joinClub(clubId);
        setClub((prev: any) => ({ ...prev, join_status: 'member' }));
      } else {
        await requestJoinClub(clubId);
        setClub((prev: any) => ({ ...prev, join_status: 'requested' }));
      }
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = () => {
    Alert.alert('Leave Club', 'Are you sure you want to leave this club?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive',
        onPress: async () => {
          try {
            setLeaving(true);
            await leaveClub(clubId);
            setClub((prev: any) => ({ ...prev, join_status: 'none' }));
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Unable to leave club');
          } finally {
            setLeaving(false);
          }
        },
      },
    ]);
  };

  const handleCopyPlan = async (planId: number) => {
    setCopyingPlan(planId);
    try { await copyClubTrainingPlan(clubId, planId); } finally { setCopyingPlan(null); }
  };

  const dayTrainings = useMemo(() => {
    if (!calendar || calendarItems.length === 0) return [];

    if (calendar.calendar_type === 'order') {
      const startDate = calendar.order_start_date
        ? String(calendar.order_start_date).substring(0, 10)
        : calendar.created_at?.split('T')[0] || todayDate;
      if (!startDate) return [];
      const totalDays = daysBetween(startDate, selectedDate);
      const uniqueOrders = [...new Set(calendarItems.filter((i: any) => i.order != null).map((i: any) => Number(i.order)))].sort((a, b) => a - b);
      if (uniqueOrders.length === 0) return [];
      const n = uniqueOrders.length;
      const cycleIndex = totalDays >= 0
        ? totalDays % n
        : ((n - (Math.abs(totalDays) % n)) % n);
      const targetOrder = uniqueOrders[cycleIndex];
      return calendarItems.filter((it: any) => it.order != null && Number(it.order) === targetOrder);
    } else {
      const dow = dayOfWeekFromDate(selectedDate);
      const createdAt = calendar.created_at?.split('T')[0] || todayDate;
      const totalDays = daysBetween(createdAt, selectedDate);
      const numWeeks = calendar.num_weeks || 1;
      const weekInRotation = totalDays >= 0
        ? (Math.floor(totalDays / 7) % numWeeks) + 1
        : ((numWeeks - (Math.floor(Math.abs(totalDays) / 7) % numWeeks)) % numWeeks) + 1;
      return calendarItems.filter((it: any) => Number(it.day_of_week) === dow && Number(it.week_number) === weekInRotation);
    }
  }, [calendar, calendarItems, selectedDate]);

  const buildCalendarEvents = useMemo(() => {
    if (!calendar || calendarItems.length === 0) return {};
    const events: Record<string, { color: string; count: number }> = {};
    const calType: string = calendar.calendar_type || 'order';
    const center = new Date(selectedDate);
    for (let offset = -15; offset <= 15; offset++) {
      const d = new Date(center);
      d.setDate(center.getDate() + offset);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      let count = 0;
      if (calType === 'day') {
        const dow = dayOfWeekFromDate(dateStr);
        const numWeeks = calendar.num_weeks || 1;
        const createdAt = calendar.created_at?.split('T')[0] || todayDate;
        const totalDays = daysBetween(createdAt, dateStr);
        const weekInRotation = totalDays >= 0
          ? (Math.floor(totalDays / 7) % numWeeks) + 1
          : ((numWeeks - (Math.floor(Math.abs(totalDays) / 7) % numWeeks)) % numWeeks) + 1;
        count = calendarItems.filter(
          (it: any) => Number(it.day_of_week) === dow && Number(it.week_number) === weekInRotation && it.id_trainings
        ).length;
      } else {
        const rawStart = calendar.order_start_date;
        const startDate = rawStart ? String(rawStart).substring(0, 10) : (calendar.created_at?.split('T')[0] || todayDate);
        const uniqueOrders = [...new Set(calendarItems.filter((it: any) => it.order != null).map((it: any) => Number(it.order)))].sort((a, b) => a - b);
        const n = uniqueOrders.length || 1;
        const totalDays = daysBetween(startDate, dateStr);
        const cycleIdx = totalDays >= 0 ? totalDays % n : ((n - (Math.abs(totalDays) % n)) % n);
        const targetOrder = uniqueOrders[cycleIdx];
        count = calendarItems.filter((it: any) => it.order != null && Number(it.order) === targetOrder && it.id_trainings).length;
      }
      if (count > 0) events[dateStr] = { color: '#f20d0d', count };
    }
    return events;
  }, [calendar, calendarItems, selectedDate]);

  // Fetch full training details for matched calendar items
  useEffect(() => {
    if (dayTrainings.length === 0 || dayTrainings.every((it: any) => !it.id_trainings)) {
      setResolvedTrainings([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const results: TimelineTraining[] = [];
      for (const item of dayTrainings) {
        if (!item.id_trainings) continue;
        try {
          const resp = await getTraining(Number(item.id_trainings));
          const training = resp.training;
          const components = resp.components || [];
          const content = (components || []).map((c: any) => {
            const label = c.drill_title || c.combination_title || c.title || 'Component';
            const details: string[] = [];
            const sets = c.sets !== undefined && c.sets !== null ? c.sets : 1;
            details.push(`${sets} set${sets !== 1 ? 's' : ''}`);
            if (c.reps !== undefined && c.reps !== null) details.push(`${c.reps} reps`);
            if (c.length !== undefined && c.length !== null) {
              const len = Number(c.length);
              if (!isNaN(len)) {
                if (len >= 60) details.push(`${Math.round(len / 60)} min`);
                else details.push(`${len}s`);
              }
            }
            return `${label} (${details.join(', ')})`;
          });
          results.push({
            id: item.id_training_calendar_trainings || item.id_trainings,
            title: training?.title || 'Training',
            description: training?.description,
            duration: calculateDuration(components),
            start_time: item.start_time || null,
            components: content,
            trainingComponents: components,
            trainingName: training?.title || '',
          });
        } catch { /* skip failed fetches */ }
      }
      if (!cancelled) setResolvedTrainings(results);
    })();
    return () => { cancelled = true; };
  }, [dayTrainings]);

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.primary.main} size="large" />
      </View>
    );
  }

  const isOwner = String(club?.viewer_role ?? '').toLowerCase() === 'owner';

  const isMember = club?.join_status === 'member';

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor={colors.primary.main}
          />
        }
      >
        {/* ── Cover + Header overlay ─────────────────────────────── */}
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
            {/* Gradient overlay */}
            <View style={styles.coverGradient} />

            {/* Transparent header bar */}
            <View style={[styles.headerBar, { paddingTop: (insets.top || 0) + 4 }]}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerRight}>
                {club?.can_manage && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('ManageClub', { clubId })}
                    style={[styles.iconBtn, styles.manageIconBtn]}
                  >
                    <Ionicons name="settings-outline" size={18} color={colors.primary.main} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.iconBtn}>
                  <Ionicons name="share-social-outline" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </ImageBackground>

          {/* Avatar overlapping cover */}
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

        {/* ── Club identity row ──────────────────────────────────── */}
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
        </View>

        {/* ── Stats row ──────────────────────────────────────────── */}
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

        {/* ── Join / Leave CTA ───────────────────────────────────── */}
        <View style={styles.ctaRow}>
          {isOwner ? null : (
            <>
              {isMember ? (
                <SparrButton
                  label="Leave Club"
                  variant="outline"
                  loading={leaving}
                  onPress={handleLeave}
                  disabled={leaving}
                  fullWidth
                />
              ) : club?.join_status === 'requested' ? (
                <SparrButton
                  label="Requested"
                  variant="outline"
                  disabled
                  fullWidth
                />
              ) : (
                <SparrButton
                  label={(club?.join_policy || 'open') === 'open' ? 'Join Club' : 'Request to Join'}
                  variant="primary"
                  loading={joining}
                  onPress={handleJoin}
                  disabled={joining}
                  fullWidth
                />
              )}
            </>
          )}
        </View>

        {/* ── Tab bar ───────────────────────────────────────────── */}
        <View
          style={styles.tabBar}
          onLayout={(e) => setTabBarWidth(e.nativeEvent.layout.width)}
        >
          <View
            style={[
              styles.tabIndicator,
              {
                left: indicatorLeft,
                width: indicatorWidth,
              },
            ]}
          />
          {TABS.map((tab) => (
            <Pressable
              key={tab}
              style={styles.tabItem}
              onPress={() => handleTabPress(tab)}
            >
              <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Tab Content ───────────────────────────────────────── */}
        <View style={styles.tabContent}>
          {activeTab === 'Posts' && (
            <PostsTab
              posts={posts}
              loading={postsLoading}
            />
          )}
          {activeTab === 'Schedule' && (
            <ScheduleTab
              plans={plans}
              loading={plansLoading}
              isMember={isMember}
              copyingPlan={copyingPlan}
              onCopy={handleCopyPlan}
              calendar={calendar}
              calendarEvents={buildCalendarEvents}
              resolvedTrainings={resolvedTrainings}
              isRestDay={dayTrainings.length === 0 || dayTrainings.every((it: any) => !it.id_trainings)}
              selectedDate={selectedDate}
              todayDate={todayDate}
              onDateChange={setSelectedDate}
            />
          )}
          {activeTab === 'Members' && (
            <MembersTab members={members} loading={membersLoading} navigation={navigation} />
          )}
          {activeTab === 'About' && (
            <AboutTab club={club} />
          )}
        </View>
      </ScrollView>
      {!!club?.can_manage && (
        <Pressable
          onPress={() => navigation.navigate('CreatePost', { clubId })}
          style={styles.fab}
        >
          <Ionicons name="add" size={26} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tab sub-components
// ---------------------------------------------------------------------------

function PostsTab({ posts, loading }: { posts: any[]; loading: boolean }) {
  return (
    <>
      {loading ? <LoadingSpinner /> : (
        posts.length === 0 ? (
          <EmptyState icon="newspaper-outline" title="No posts yet" subtitle="This club hasn't shared anything yet." />
        ) : (
          posts.map((post) => (
            <FeedPost key={String(post.id_posts)} post={post} />
          ))
        )
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Calendar date-resolution helpers
// ---------------------------------------------------------------------------

function dayOfWeekFromDate(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const jsDay = new Date(y!, m! - 1, d).getDay();
  return (jsDay + 6) % 7; // 0=Mon
}

function daysBetween(d1: string, d2: string): number {
  const a = new Date(d1 + 'T00:00:00');
  const b = new Date(d2 + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function calculateDuration(components: any[]): string {
  if (!components || components.length === 0) return '—';
  let totalSeconds = 0;
  components.forEach((c: any) => {
    if (c.length !== undefined && c.length !== null) {
      const len = Number(c.length);
      if (!isNaN(len)) totalSeconds += len;
    } else {
      const sets = c.sets !== undefined && c.sets !== null ? Number(c.sets) : 1;
      const reps = c.reps !== undefined && c.reps !== null ? Number(c.reps) : 0;
      if (!isNaN(sets) && !isNaN(reps) && reps > 0) totalSeconds += sets * reps * 3;
    }
  });
  if (totalSeconds === 0) return '—';
  if (totalSeconds >= 3600) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (totalSeconds >= 60) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  return `${totalSeconds}s`;
}

function ScheduleTab({ plans, loading, isMember, copyingPlan, onCopy, calendar, calendarEvents, resolvedTrainings, isRestDay, selectedDate, todayDate, onDateChange }: {
  plans: any[]; loading: boolean; isMember: boolean; copyingPlan: number | null; onCopy: (id: number) => void;
  calendar: any; calendarEvents: Record<string, { color: string; count: number }>; resolvedTrainings: TimelineTraining[]; isRestDay: boolean; selectedDate: string; todayDate: string; onDateChange: (d: string) => void;
}) {
  if (loading) return <LoadingSpinner />;

  const handleDateSelect = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    onDateChange(`${y}-${m}-${d}`);
  };

  return (
    <>
      {/* Calendar preview */}
      {calendar && (
        <>
          {/* Calendar header — matches CalendarScreen */}
          <View style={schedStyles.calendarHeader}>
            <View>
              <Text style={schedStyles.calendarTitle}>{calendar.title || 'Club Calendar'}</Text>
              <Text style={schedStyles.calendarMonth}>
                {new Date(selectedDate).toLocaleString(undefined, { month: 'long', year: 'numeric' })}
              </Text>
              <Text style={schedStyles.calendarTypeBadge}>
                {calendar.calendar_type === 'day' ? '📅 Day-based' : '🔁 Order-based'}
                {calendar.calendar_type === 'day' && calendar.num_weeks > 1 && ` · ${calendar.num_weeks}wk rotation`}
              </Text>
            </View>
            {selectedDate !== todayDate && (
              <Pressable style={schedStyles.backToTodayBtn} onPress={() => onDateChange(todayDate)}>
                <Text style={schedStyles.backToTodayText}>Today</Text>
              </Pressable>
            )}
          </View>

          <WeeklyCalendar initialDate={selectedDate} events={calendarEvents} onSelect={handleDateSelect} />

          {/* Training card / timeline or rest state */}
          <View style={{ marginTop: 10 }}>
            {isRestDay ? (
              <GlassCard variant="medium" radius={14} padding={16}>
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <Ionicons name="moon-outline" size={24} color={colors.text.tertiary} />
                  <Text style={{ color: colors.text.tertiary, fontSize: 13 }}>Rest day — no training scheduled</Text>
                </View>
              </GlassCard>
            ) : resolvedTrainings.length === 0 ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator color={colors.primary.main} size="small" />
              </View>
            ) : resolvedTrainings.length === 1 ? (
              <TrainingCard
                title={resolvedTrainings[0].title}
                description={resolvedTrainings[0].description || ''}
                length={resolvedTrainings[0].duration || ''}
                start_time={resolvedTrainings[0].start_time ?? null}
                components={resolvedTrainings[0].components}
                trainingComponents={resolvedTrainings[0].trainingComponents}
                trainingName={resolvedTrainings[0].trainingName}
                isEmpty={false}
              />
            ) : (
              <DayTimelineView trainings={resolvedTrainings} />
            )}
          </View>
        </>
      )}

      {/* Training plans list */}
      <Text style={styles.sectionTitle}>Training Plans</Text>
      {plans.length === 0 ? (
        <EmptyState icon="calendar-outline" title="No training plans" subtitle="This club hasn't published any plans yet." />
      ) : (
        plans.map((plan) => (
          <GlassCard key={String(plan.id_training_calendar)} variant="medium" radius={14} padding={14} style={styles.planCard}>
            <View style={styles.planRow}>
              <View style={styles.planIconWrap}>
                <Ionicons name="barbell-outline" size={20} color={colors.primary.main} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.planTitle}>{plan.title}</Text>
                <Text style={styles.planSub}>{plan.trainings_count ?? 0} training sessions</Text>
              </View>
              {isMember && (
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => onCopy(Number(plan.id_training_calendar))}
                  disabled={copyingPlan === Number(plan.id_training_calendar)}
                >
                  {copyingPlan === Number(plan.id_training_calendar)
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="copy-outline" size={16} color="#fff" />
                  }
                </TouchableOpacity>
              )}
            </View>
          </GlassCard>
        ))
      )}
    </>
  );
}

function MembersTab({ members, loading, navigation }: { members: any[]; loading: boolean; navigation: any }) {
  if (loading) return <LoadingSpinner />;
  if (members.length === 0) return <EmptyState icon="people-outline" title="No members yet" />;
  return (
    <>
      {members.map((m) => {
        const role = (m.role_title ?? 'member').toLowerCase();
        const roleColor = ROLE_COLORS[role] ?? colors.text.tertiary;
        return (
          <TouchableOpacity
            key={String(m.id_profiles)}
            onPress={() => navigation.navigate('ForeignProfile', { foreign_profile_id: m.id_profiles })}
            style={styles.memberRow}
          >
            <Avatar size="sm">
              <AvatarFallbackText>{m.display_name?.[0] ?? '?'}</AvatarFallbackText>
              <AvatarImage source={m.avatar_url ? { uri: m.avatar_url } : undefined} />
            </Avatar>
            <View style={styles.flex1}>
              <Text style={styles.memberName}>{m.display_name || m.username}</Text>
              {!!m.location && <Text style={styles.memberLocation}>{m.location}</Text>}
            </View>
            <View style={[styles.roleBadge, { borderColor: roleColor + '55', backgroundColor: roleColor + '18' }]}>
              <Text style={[styles.roleBadgeText, { color: roleColor }]}>{m.role_title ?? 'Member'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.text.tertiary} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        );
      })}
    </>
  );
}

function AboutTab({ club }: { club: any }) {
  if (!club) return null;
  return (
    <View style={styles.aboutBlock}>
      {!!club.bio && (
        <GlassCard variant="medium" radius={14} padding={16} style={styles.aboutCard}>
          <Text style={styles.aboutSectionTitle}>About</Text>
          <Text style={styles.aboutBio}>{club.bio}</Text>
        </GlassCard>
      )}
      <GlassCard variant="medium" radius={14} padding={16} style={styles.aboutCard}>
        <Text style={styles.aboutSectionTitle}>Details</Text>
        {!!club.location && (
          <View style={styles.aboutRow}>
            <Ionicons name="location-outline" size={16} color={colors.text.secondary} />
            <Text style={styles.aboutRowText}>{club.location}</Text>
          </View>
        )}
        <View style={styles.aboutRow}>
          <Ionicons name="people-outline" size={16} color={colors.text.secondary} />
          <Text style={styles.aboutRowText}>{club.members_count ?? 0} members</Text>
        </View>
        <View style={styles.aboutRow}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.text.secondary} />
          <Text style={styles.aboutRowText}>{club.join_policy === 'open' ? 'Open membership' : 'Approval required'}</Text>
        </View>
      </GlassCard>
      {(club.instagram_url || club.website_url) && (
        <GlassCard variant="medium" radius={14} padding={16} style={styles.aboutCard}>
          <Text style={styles.aboutSectionTitle}>Links</Text>
          {!!club.instagram_url && (
            <TouchableOpacity
              style={styles.aboutRow}
              onPress={() => Linking.openURL(club.instagram_url.startsWith('http') ? club.instagram_url : `https://instagram.com/${club.instagram_url.replace('@', '')}`)}
            >
              <Ionicons name="logo-instagram" size={16} color="#E1306C" />
              <Text style={[styles.aboutRowText, styles.linkText]}>{club.instagram_url}</Text>
              <Ionicons name="open-outline" size={12} color={colors.text.tertiary} />
            </TouchableOpacity>
          )}
          {!!club.website_url && (
            <TouchableOpacity
              style={styles.aboutRow}
              onPress={() => Linking.openURL(club.website_url.startsWith('http') ? club.website_url : `https://${club.website_url}`)}
            >
              <Ionicons name="globe-outline" size={16} color={colors.info.main} />
              <Text style={[styles.aboutRowText, styles.linkText]}>{club.website_url}</Text>
              <Ionicons name="open-outline" size={12} color={colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </GlassCard>
      )}
    </View>
  );
}

function LoadingSpinner() {
  return (
    <View style={styles.spinnerWrap}>
      <ActivityIndicator color={colors.primary.main} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root:               { flex: 1, backgroundColor: colors.background.secondary },
  center:             { alignItems: 'center', justifyContent: 'center' },

  // Cover
  coverWrapper:       { position: 'relative' },
  cover:              { width: '100%', height: COVER_HEIGHT },
  coverImage:         { resizeMode: 'cover' },
  coverFallback:      { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  coverFallbackInner: {
    flex: 1,
    backgroundColor: colors.background.tertiary,
    borderBottomWidth: 1, borderBottomColor: colors.border.light,
  },
  coverGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  headerBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 8,
  },
  headerRight:        { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  manageIconBtn:      { borderColor: colors.primary.main + '60', backgroundColor: colors.glass.redSurface },

  // Avatar
  avatarAnchor: {
    position: 'absolute',
    bottom: -(AVATAR_SIZE / 2 + AVATAR_OVERLAP / 2),
    left: 20,
  },
  avatarRing: {
    borderRadius: (AVATAR_SIZE / 2) + 4,
    borderWidth: 3,
    borderColor: colors.primary.main,
    padding: 2,
    backgroundColor: colors.background.secondary,
  },
  verifiedBadge: {
    position: 'absolute', bottom: 2, right: -4,
    backgroundColor: colors.background.secondary,
    borderRadius: 10, padding: 1,
  },

  // Identity
  identityBlock: {
    paddingTop: AVATAR_SIZE / 2 + AVATAR_OVERLAP / 2 + 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  identityLeft:       { flex: 1 },
  clubName:           { color: colors.text.primary, fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  locationRow:        { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locationText:       { color: colors.text.tertiary, fontSize: 12 },
  policyChip: {
    marginTop: 6, alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1,
    borderColor: colors.glass.border,
    backgroundColor: colors.glass.surface,
  },
  policyChipText:     { color: colors.text.tertiary, fontSize: 11, fontWeight: '600' },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16, marginTop: 14,
    borderWidth: 1, borderColor: colors.glass.border,
    borderRadius: 14,
    backgroundColor: colors.glass.surface,
    overflow: 'hidden',
  },
  statItem:           { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statItemMiddle: {
    borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: colors.glass.border,
  },
  statValue:          { color: colors.text.primary, fontSize: 18, fontWeight: '800' },
  statLabel:          { color: colors.text.tertiary, fontSize: 11, marginTop: 2 },

  // CTA
  ctaRow:             { paddingHorizontal: 16, marginTop: 12 },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 12,
    backgroundColor: colors.glass.surface,
    borderWidth: 1, borderColor: colors.glass.border,
    overflow: 'hidden',
    position: 'relative',
    height: 44,
  },
  tabIndicator: {
    position: 'absolute', bottom: 0, height: 2,
    backgroundColor: colors.primary.main,
    borderRadius: 2,
  },
  tabItem:            { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  tabLabel:           { color: colors.text.tertiary, fontSize: 13, fontWeight: '600' },
  tabLabelActive:     { color: colors.text.primary, fontWeight: '700' },

  // Tab content
  tabContent:         { paddingHorizontal: 16, marginTop: 12, gap: 10 },

  // Posts
  postCard:           { marginBottom: 0 },
  postHeader:         { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  postAuthor:         { color: colors.text.primary, fontWeight: '700', fontSize: 14 },
  postTime:           { color: colors.text.tertiary, fontSize: 11, marginTop: 2 },
  postBody:           { color: colors.text.secondary, fontSize: 14, lineHeight: 20 },
  postStats:          { flexDirection: 'row', gap: 14, marginTop: 10 },
  postStat:           { flexDirection: 'row', alignItems: 'center', gap: 4 },
  postStatText:       { color: colors.text.tertiary, fontSize: 12 },

  // FAB
  fab: {
    position: 'absolute', bottom: 24, right: 20, width: 52, height: 52,
    borderRadius: 26, backgroundColor: colors.primary.main,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 4,
  },

  // Schedule
  planCard:           { marginBottom: 0 },
  planRow:            { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.glass.redSurface,
    borderWidth: 1, borderColor: colors.glass.redBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  planTitle:          { color: colors.text.primary, fontWeight: '700', fontSize: 14 },
  planSub:            { color: colors.text.tertiary, fontSize: 12, marginTop: 2 },
  sectionTitle:       { color: colors.text.secondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4, marginTop: 8 },
  copyBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.primary.main,
    alignItems: 'center', justifyContent: 'center',
  },

  // Members
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.glass.surface,
    borderWidth: 1, borderColor: colors.glass.border,
    marginBottom: 0,
  },
  memberName:         { color: colors.text.primary, fontWeight: '600', fontSize: 14 },
  memberLocation:     { color: colors.text.tertiary, fontSize: 11, marginTop: 2 },
  roleBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1,
  },
  roleBadgeText:      { fontSize: 11, fontWeight: '700' },

  // About
  aboutBlock:         { gap: 10 },
  aboutCard:          { marginBottom: 0 },
  aboutSectionTitle:  { color: colors.text.secondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  aboutBio:           { color: colors.text.secondary, fontSize: 14, lineHeight: 21 },
  aboutRow:           { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  aboutRowText:       { color: colors.text.secondary, fontSize: 14, flex: 1 },
  linkText:           { color: colors.info.main },

  // Misc
  flex1:              { flex: 1 },
  spinnerWrap:        { paddingVertical: 40, alignItems: 'center' },
});

const schedStyles = StyleSheet.create({
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendarTitle: { color: colors.text.primary, fontSize: 17, fontWeight: '800' },
  calendarMonth: { color: colors.primary.main, fontSize: 13, fontWeight: '600' },
  calendarTypeBadge: { color: colors.text.tertiary, fontSize: 11, fontWeight: '600', marginTop: 2 },
  backToTodayBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: colors.glass.redSurface, borderWidth: 1, borderColor: colors.glass.redBorder,
  },
  backToTodayText: { color: colors.primary.main, fontSize: 12, fontWeight: '700' },
});
