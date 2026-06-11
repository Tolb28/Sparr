import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Linking,
  Pressable,
  RefreshControl,
  Share,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Text as RNText,
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
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { showSuccessNotification, showErrorNotification } from '@/src/services/notificationService';
import ConfirmationModal from '@/src/components/ConfirmationModal';
import ClubHeader from '../components/ClubHeader';
import ClubUpcomingEvents from '../components/ClubUpcomingEvents';
import ClubReviewsLocation from '../components/ClubReviewsLocation';

type ClubProfileRouteProp = RouteProp<RootStackParamList, 'ClubProfile'>;

const COVER_HEIGHT = 200;
const AVATAR_SIZE = 84;
const AVATAR_OVERLAP = 40;
const TAB_INDICATOR_INSET = 8;
const TABS = ['Posts', 'Schedule', 'Members', 'About'] as const;
type Tab = typeof TABS[number];

const ROLE_COLORS_STATIC: Record<string, string | undefined> = {
  owner: '#f5c518',
  coach: '#06b6d4',
};

export default function ClubProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<ClubProfileRouteProp>();
  const { clubId } = route.params;
  const c = useThemeColors();

  const [club, setClub]             = useState<any | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining]       = useState(false);
  const [leaving, setLeaving]       = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [sharing, setSharing]       = useState(false);
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
  const [dayTrainingsLoading, setDayTrainingsLoading] = useState(false);
  const [dayTrainingsError, setDayTrainingsError] = useState<string | null>(null);
  const [todayResolvedTrainings, setTodayResolvedTrainings] = useState<TimelineTraining[]>([]);

  const todayDate = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const [tabBarWidth, setTabBarWidth] = useState(0);
  const tabWidth = tabBarWidth > 0 ? tabBarWidth / TABS.length : 0;
  const indicatorWidth = Math.max(0, tabWidth - TAB_INDICATOR_INSET * 2);
  const activeTabIndex = Math.max(0, TABS.indexOf(activeTab));
  const indicatorLeft = TAB_INDICATOR_INSET + activeTabIndex * tabWidth;

  const getErrorMessage = useCallback((error: any, fallback: string) => {
    const message = error?.message;
    return typeof message === 'string' && message.trim().length > 0 ? message : fallback;
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const clubData = await getClub(clubId);
      setClub(clubData);
    } catch (error: any) {
      if (!silent) {
        showErrorNotification(getErrorMessage(error, 'Please try again.'));
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [clubId, getErrorMessage]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  // Pre-load Schedule tab data (calendar) for the Today section
  useEffect(() => {
    if (plans.length === 0) {
      loadTabContent('Schedule').catch(() => {});
    }
  }, [clubId]);

  const handleTabPress = useCallback((tab: Tab) => {
    setActiveTab(tab);
  }, []);

  const loadTabContent = useCallback(async (tab: Tab, force = false) => {
    if (tab === 'Posts' && (force || posts.length === 0)) {
      setPostsLoading(true);
      try { const data = await getClubPosts(clubId); setPosts(data); } finally { setPostsLoading(false); }
    }
    if (tab === 'Schedule' && (force || plans.length === 0)) {
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
        } else if (force) {
          setCalendar(null);
          setCalendarItems([]);
        }
      } finally { setPlansLoading(false); }
    }
    if (tab === 'Members' && (force || members.length === 0)) {
      setMembersLoading(true);
      try { const data = await getClubMembers(clubId); setMembers(data); } finally { setMembersLoading(false); }
    }
  }, [clubId, members.length, plans.length, posts.length]);

  useEffect(() => {
    loadTabContent(activeTab).catch(() => {});
  }, [activeTab, loadTabContent]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const tasks: Promise<any>[] = [load(true)];
      if (activeTab !== 'About') tasks.push(loadTabContent(activeTab, true));
      await Promise.all(tasks);
    } catch (error: any) {
      showErrorNotification(getErrorMessage(error, 'Please try again.'));
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, getErrorMessage, load, loadTabContent]);

  const handleJoin = async () => {
    if (!club) return;
    try {
      setJoining(true);
      if ((club.join_policy || 'open') === 'open') {
        await joinClub(clubId);
        setClub((prev: any) => ({ ...prev, join_status: 'member' }));
        showSuccessNotification(`You are now a member of ${club.title ?? 'this club'}.`);
      } else {
        await requestJoinClub(clubId);
        setClub((prev: any) => ({ ...prev, join_status: 'requested' }));
        showSuccessNotification('Your join request is waiting for approval.');
      }
      await Promise.all([load(true), loadTabContent('Members', true)]);
    } catch (e: any) {
      showErrorNotification(getErrorMessage(e, 'Unable to update your membership.'));
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = () => setConfirmLeave(true);

  const doLeave = async () => {
    setConfirmLeave(false);
    try {
      setLeaving(true);
      await leaveClub(clubId);
      setClub((prev: any) => ({ ...prev, join_status: 'none' }));
      await Promise.all([load(true), loadTabContent('Members', true)]);
      showSuccessNotification(`You left ${club?.title ?? 'the club'}.`);
    } catch (e: any) {
      showErrorNotification(getErrorMessage(e, 'Unable to leave this club.'));
    } finally {
      setLeaving(false);
    }
  };

  const handleCopyPlan = async (planId: number) => {
    setCopyingPlan(planId);
    try {
      await copyClubTrainingPlan(clubId, planId);
      showSuccessNotification('Training plan added to your calendars.');
    } catch (e: any) {
      showErrorNotification(getErrorMessage(e, 'Unable to copy this training plan.'));
    } finally {
      setCopyingPlan(null);
    }
  };

  const handleShareClub = async () => {
    if (!club || sharing) return;
    const title = typeof club.title === 'string' && club.title.trim().length > 0 ? club.title.trim() : 'this club';
    const locationText = club.location ? ` in ${club.location}` : '';
    try {
      setSharing(true);
      await Share.share({
        message: `Check out ${title}${locationText} on Sparr.\nJoin me in the app to view plans, members, and updates.`,
        title: `${title} on Sparr`,
      });
    } catch (e: any) {
      showErrorNotification(getErrorMessage(e, 'Unable to share this club.'));
    } finally {
      setSharing(false);
    }
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

  // Get today's calendar items using the same rotation logic
  const todayTrainings = useMemo(() => {
    if (!calendar || calendarItems.length === 0) return [];

    if (calendar.calendar_type === 'order') {
      const startDate = calendar.order_start_date
        ? String(calendar.order_start_date).substring(0, 10)
        : calendar.created_at?.split('T')[0] || todayDate;
      if (!startDate) return [];
      const totalDays = daysBetween(startDate, todayDate);
      const uniqueOrders = [...new Set(calendarItems.filter((i: any) => i.order != null).map((i: any) => Number(i.order)))].sort((a, b) => a - b);
      if (uniqueOrders.length === 0) return [];
      const n = uniqueOrders.length;
      const cycleIndex = totalDays >= 0
        ? totalDays % n
        : ((n - (Math.abs(totalDays) % n)) % n);
      const targetOrder = uniqueOrders[cycleIndex];
      return calendarItems.filter((it: any) => it.order != null && Number(it.order) === targetOrder);
    } else {
      const dow = dayOfWeekFromDate(todayDate);
      const createdAt = calendar.created_at?.split('T')[0] || todayDate;
      const totalDays = daysBetween(createdAt, todayDate);
      const numWeeks = calendar.num_weeks || 1;
      const weekInRotation = totalDays >= 0
        ? (Math.floor(totalDays / 7) % numWeeks) + 1
        : ((numWeeks - (Math.floor(Math.abs(totalDays) / 7) % numWeeks)) % numWeeks) + 1;
      return calendarItems.filter((it: any) => Number(it.day_of_week) === dow && Number(it.week_number) === weekInRotation);
    }
  }, [calendar, calendarItems, todayDate]);

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
    const trainingsToResolve = dayTrainings.filter((it: any) => !!it.id_trainings);
    if (trainingsToResolve.length === 0) {
      setDayTrainingsLoading(false);
      setDayTrainingsError(null);
      setResolvedTrainings([]);
      return;
    }
    let cancelled = false;
    setDayTrainingsLoading(true);
    setDayTrainingsError(null);
    (async () => {
      const results: TimelineTraining[] = [];
      for (const item of trainingsToResolve) {
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
      if (!cancelled) {
        setResolvedTrainings(results);
        setDayTrainingsLoading(false);
        setDayTrainingsError(
          results.length === 0 ? 'Could not load training details for this day.' : null
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dayTrainings]);

  // Fetch full training details for today's sessions
  useEffect(() => {
    const trainingsToResolve = todayTrainings.filter((it: any) => !!it.id_trainings);
    if (trainingsToResolve.length === 0) {
      setTodayResolvedTrainings([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const results: TimelineTraining[] = [];
      for (const item of trainingsToResolve) {
        try {
          const resp = await getTraining(Number(item.id_trainings));
          const training = resp.training;
          const components = resp.components || [];
          results.push({
            id: item.id_training_calendar_trainings || item.id_trainings,
            title: training?.title || 'Training',
            description: training?.description,
            duration: calculateDuration(components),
            start_time: item.start_time || null,
            components: [],
            trainingComponents: components,
            trainingName: training?.title || '',
          });
        } catch { /* skip failed fetches */ }
      }
      if (!cancelled) {
        setTodayResolvedTrainings(results);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [todayTrainings]);

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: c.background.secondary }, styles.center]}>
        <ActivityIndicator color={c.primary.main} size="large" />
      </View>
    );
  }

  const canManageClub = !!club?.can_manage;
  const isMember = club?.join_status === 'member';

  return (
    <View style={[styles.root, { backgroundColor: c.background.secondary }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={c.primary.main}
          />
        }
      >

        {/* Injected ClubHeader component (new) */}
        <ClubHeader
          club={club}
          canManage={canManageClub}
          joining={joining}
          leaving={leaving}
          sharing={sharing}
          onJoin={handleJoin}
          onLeave={handleLeave}
          onManage={() => navigation.navigate('ManageClub', { clubId })}
          onShare={handleShareClub}
        />

        {/* Upcoming events preview */}
        <ClubUpcomingEvents clubId={clubId} calendarItems={todayTrainings} calendar={calendar} resolvedTrainings={todayResolvedTrainings} />




        {/* ── Tab bar ───────────────────────────────────────────── */}
        <View
          style={[styles.tabBar, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]}
          onLayout={(e) => setTabBarWidth(e.nativeEvent.layout.width)}
        >
          <View
            style={[
              styles.tabIndicator,
              {
                left: indicatorLeft,
                width: indicatorWidth,
                backgroundColor: c.primary.main,
              },
            ]}
          />
          {TABS.map((tab) => (
            <Pressable
              key={tab}
              style={styles.tabItem}
              onPress={() => handleTabPress(tab)}
            >
              <RNText
                style={{
                  fontSize: 13,
                  fontWeight: activeTab === tab ? '700' : '600',
                  color: activeTab === tab ? c.text.primary : c.text.tertiary,
                }}
              >
                {tab}
              </RNText>
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
              hasDayEntries={dayTrainings.length > 0}
              hasTrainingEntries={dayTrainings.some((it: any) => !!it.id_trainings)}
              dayTrainingsLoading={dayTrainingsLoading}
              dayTrainingsError={dayTrainingsError}
              selectedDate={selectedDate}
              todayDate={todayDate}
              onDateChange={setSelectedDate}
            />
          )}
          {activeTab === 'Members' && (
            <MembersTab
              members={members}
              loading={membersLoading}
              navigation={navigation}
              canManage={!!club?.can_manage}
              clubId={clubId}
            />
          )}
          {activeTab === 'About' && (
            <>
              <AboutTab club={club} />
              <ClubReviewsLocation club={club} reviews={club?.reviews ?? []} />
            </>
          )}
        </View>
      </ScrollView>
      {!!club?.can_manage && (
        <Pressable
          onPress={() => navigation.navigate('CreatePost', { clubId })}
          style={[styles.fab, { backgroundColor: c.primary.main }]}
        >
          <Ionicons name="add" size={26} color="#fff" />
        </Pressable>
      )}
      <ConfirmationModal
        visible={confirmLeave}
        title="Leave Club"
        message="Are you sure you want to leave this club?"
        confirmText="Leave"
        destructive
        onConfirm={doLeave}
        onCancel={() => setConfirmLeave(false)}
      />
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

function ScheduleTab({ plans, loading, isMember, copyingPlan, onCopy, calendar, calendarEvents, resolvedTrainings, hasDayEntries, hasTrainingEntries, dayTrainingsLoading, dayTrainingsError, selectedDate, todayDate, onDateChange }: {
  plans: any[]; loading: boolean; isMember: boolean; copyingPlan: number | null; onCopy: (id: number) => void;
  calendar: any; calendarEvents: Record<string, { color: string; count: number }>; resolvedTrainings: TimelineTraining[];
  hasDayEntries: boolean; hasTrainingEntries: boolean; dayTrainingsLoading: boolean; dayTrainingsError: string | null;
  selectedDate: string; todayDate: string; onDateChange: (d: string) => void;
}) {
  const c = useThemeColors();
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
      {calendar ? (
        <>
          {/* Calendar header — matches CalendarScreen */}
          <View style={schedStyles.calendarHeader}>
            <View>
              <Text style={[schedStyles.calendarTitle, { color: c.text.primary }]}>{calendar.title || 'Club Calendar'}</Text>
              <Text style={[schedStyles.calendarMonth, { color: c.primary.main }]}>
                {new Date(selectedDate).toLocaleString(undefined, { month: 'long', year: 'numeric' })}
              </Text>
              <Text style={[schedStyles.calendarTypeBadge, { color: c.text.tertiary }]}>
                {calendar.calendar_type === 'day' ? '📅 Day-based' : '🔁 Order-based'}
                {calendar.calendar_type === 'day' && calendar.num_weeks > 1 && ` · ${calendar.num_weeks}wk rotation`}
              </Text>
            </View>
            {selectedDate !== todayDate && (
              <Pressable style={[schedStyles.backToTodayBtn, { backgroundColor: c.glass.redSurface, borderColor: c.glass.redBorder }]} onPress={() => onDateChange(todayDate)}>
                <Text style={[schedStyles.backToTodayText, { color: c.primary.main }]}>Today</Text>
              </Pressable>
            )}
          </View>

          <WeeklyCalendar initialDate={selectedDate} events={calendarEvents} onSelect={handleDateSelect} />

          {/* Training card / timeline or rest state */}
          <View style={{ marginTop: 10 }}>
            {!hasDayEntries ? (
              <GlassCard variant="medium" radius={14} padding={16}>
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <Ionicons name="calendar-clear-outline" size={24} color={c.text.tertiary} />
                  <Text style={{ color: c.text.tertiary, fontSize: 13 }}>No sessions scheduled for this date</Text>
                </View>
              </GlassCard>
            ) : !hasTrainingEntries ? (
              <GlassCard variant="medium" radius={14} padding={16}>
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <Ionicons name="moon-outline" size={24} color={c.text.tertiary} />
                  <Text style={{ color: c.text.tertiary, fontSize: 13 }}>Rest day — no training scheduled</Text>
                </View>
              </GlassCard>
            ) : dayTrainingsLoading ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator color={c.primary.main} size="small" />
              </View>
            ) : dayTrainingsError ? (
              <GlassCard variant="medium" radius={14} padding={16}>
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <Ionicons name="alert-circle-outline" size={24} color={c.warning.main} />
                  <Text style={{ color: c.text.tertiary, fontSize: 13, textAlign: 'center' }}>{dayTrainingsError}</Text>
                </View>
              </GlassCard>
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
      ) : (
        <EmptyState
          icon="calendar-clear-outline"
          title="No active calendar selected"
          subtitle="This club has plans, but no schedule is selected yet."
        />
      )}

      {/* Training plans list */}
      <Text style={[styles.sectionTitle, { color: c.text.secondary }]}>Training Plans</Text>
      {plans.length === 0 ? (
        <EmptyState icon="calendar-outline" title="No training plans" subtitle="This club hasn't published any plans yet." />
      ) : (
        plans.map((plan) => (
          <GlassCard key={String(plan.id_training_calendar)} variant="medium" radius={14} padding={14} style={styles.planCard}>
            <View style={styles.planRow}>
              <View style={[styles.planIconWrap, { backgroundColor: c.glass.redSurface, borderColor: c.glass.redBorder }]}>
                <Ionicons name="barbell-outline" size={20} color={c.primary.main} />
              </View>
              <View style={styles.flex1}>
                <Text style={[styles.planTitle, { color: c.text.primary }]}>{plan.title}</Text>
                <Text style={[styles.planSub, { color: c.text.tertiary }]}>{plan.trainings_count ?? 0} training sessions</Text>
              </View>
              {isMember && (
                <TouchableOpacity
                  style={[styles.copyBtn, { backgroundColor: c.primary.main }]}
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

function MembersTab({
  members,
  loading,
  navigation,
  canManage,
  clubId,
}: {
  members: any[];
  loading: boolean;
  navigation: any;
  canManage: boolean;
  clubId: number;
}) {
  const c = useThemeColors();
  if (loading) return <LoadingSpinner />;
  if (members.length === 0) return <EmptyState icon="people-outline" title="No members yet" subtitle="Be the first to join this club." />;
  return (
    <>
      {canManage && (
        <SparrButton
          label="Manage Members"
          variant="outline"
          fullWidth
          style={{ marginBottom: 10 }}
          onPress={() => navigation.navigate('ClubMembers', { clubId, canManage: true })}
        />
      )}
      {members.map((m) => {
        const role = (m.role_title ?? 'member').toLowerCase();
        const roleColor = ROLE_COLORS_STATIC[role] ?? (role === 'admin' ? c.primary.main : c.text.tertiary);
        return (
          <TouchableOpacity
            key={String(m.id_profiles)}
            onPress={() => navigation.navigate('ForeignProfile', { foreign_profile_id: m.id_profiles })}
            style={[styles.memberRow, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]}
          >
            <Avatar size="sm">
              <AvatarFallbackText>{m.display_name?.[0] ?? '?'}</AvatarFallbackText>
              <AvatarImage source={m.avatar_url ? { uri: m.avatar_url } : undefined} />
            </Avatar>
            <View style={styles.flex1}>
              <Text style={[styles.memberName, { color: c.text.primary }]}>{m.display_name || m.username}</Text>
              {!!m.location && <Text style={[styles.memberLocation, { color: c.text.tertiary }]}>{m.location}</Text>}
            </View>
            <View style={[styles.roleBadge, { borderColor: roleColor + '55', backgroundColor: roleColor + '18' }]}>
              <Text style={[styles.roleBadgeText, { color: roleColor }]}>{m.role_title ?? 'Member'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={c.text.tertiary} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        );
      })}
    </>
  );
}

function AboutTab({ club }: { club: any }) {
  const c = useThemeColors();
  if (!club) return null;
  return (
    <View style={styles.aboutBlock}>
      {!!club.bio && (
        <GlassCard variant="medium" radius={14} padding={16} style={styles.aboutCard}>
          <Text style={[styles.aboutSectionTitle, { color: c.text.secondary }]}>About</Text>
          <Text style={[styles.aboutBio, { color: c.text.secondary }]}>{club.bio}</Text>
        </GlassCard>
      )}
      <GlassCard variant="medium" radius={14} padding={16} style={styles.aboutCard}>
        <Text style={[styles.aboutSectionTitle, { color: c.text.secondary }]}>Details</Text>
        {!!club.location && (
          <View style={styles.aboutRow}>
            <Ionicons name="location-outline" size={16} color={c.text.secondary} />
            <Text style={[styles.aboutRowText, { color: c.text.secondary }]}>{club.location}</Text>
          </View>
        )}
        <View style={styles.aboutRow}>
          <Ionicons name="people-outline" size={16} color={c.text.secondary} />
          <Text style={[styles.aboutRowText, { color: c.text.secondary }]}>{club.members_count ?? 0} members</Text>
        </View>
        <View style={styles.aboutRow}>
          <Ionicons name="lock-closed-outline" size={16} color={c.text.secondary} />
          <Text style={[styles.aboutRowText, { color: c.text.secondary }]}>{club.join_policy === 'open' ? 'Open membership' : 'Approval required'}</Text>
        </View>
      </GlassCard>
      {(club.instagram_url || club.website_url) && (
        <GlassCard variant="medium" radius={14} padding={16} style={styles.aboutCard}>
          <Text style={[styles.aboutSectionTitle, { color: c.text.secondary }]}>Links</Text>
          {!!club.instagram_url && (
            <TouchableOpacity
              style={styles.aboutRow}
              onPress={() => Linking.openURL(club.instagram_url.startsWith('http') ? club.instagram_url : `https://instagram.com/${club.instagram_url.replace('@', '')}`)}
            >
              <Ionicons name="logo-instagram" size={16} color="#E1306C" />
              <Text style={[styles.aboutRowText, styles.linkText, { color: c.info.main }]}>{club.instagram_url}</Text>
              <Ionicons name="open-outline" size={12} color={c.text.tertiary} />
            </TouchableOpacity>
          )}
          {!!club.website_url && (
            <TouchableOpacity
              style={styles.aboutRow}
              onPress={() => Linking.openURL(club.website_url.startsWith('http') ? club.website_url : `https://${club.website_url}`)}
            >
              <Ionicons name="globe-outline" size={16} color={c.info.main} />
              <Text style={[styles.aboutRowText, styles.linkText, { color: c.info.main }]}>{club.website_url}</Text>
              <Ionicons name="open-outline" size={12} color={c.text.tertiary} />
            </TouchableOpacity>
          )}
        </GlassCard>
      )}
    </View>
  );
}

function LoadingSpinner() {
  const c = useThemeColors();
  return (
    <View style={styles.spinnerWrap}>
      <ActivityIndicator color={c.primary.main} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root:               { flex: 1 },
  center:             { alignItems: 'center', justifyContent: 'center' },

  // Cover
  coverWrapper:       { position: 'relative' },
  cover:              { width: '100%', height: COVER_HEIGHT },
  coverImage:         { resizeMode: 'cover' },
  coverFallback:      { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  coverFallbackInner: { flex: 1 },
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
  manageIconBtn:      {},

  // Avatar
  avatarAnchor: {
    position: 'absolute',
    bottom: -(AVATAR_SIZE / 2 + AVATAR_OVERLAP / 2),
    left: 20,
  },
  avatarRing: {
    borderRadius: (AVATAR_SIZE / 2) + 4,
    borderWidth: 3,
    padding: 2,
  },
  verifiedBadge: {
    position: 'absolute', bottom: 2, right: -4,
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
  clubName:           { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  locationRow:        { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locationText:       { fontSize: 12 },
  policyChip: {
    marginTop: 6, alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1,
  },
  policyChipText:     { fontSize: 11, fontWeight: '600' },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16, marginTop: 14,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  statItem:           { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statItemMiddle: {
    borderLeftWidth: 1, borderRightWidth: 1,
  },
  statValue:          { fontSize: 18, fontWeight: '800' },
  statLabel:          { fontSize: 11, marginTop: 2 },

  // CTA
  ctaRow:             { paddingHorizontal: 16, marginTop: 12 },
  manageHintRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  manageHintText:     { fontSize: 13, fontWeight: '600' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    height: 44,
  },
  tabIndicator: {
    position: 'absolute', bottom: 0, height: 2,
    borderRadius: 2,
  },
  tabItem:            { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  tabLabel:           { fontSize: 13, fontWeight: '600' },
  tabLabelActive:     { fontWeight: '700' },

  // Tab content
  tabContent:         { paddingHorizontal: 16, marginTop: 12, gap: 10 },

  // Posts
  postCard:           { marginBottom: 0 },
  postHeader:         { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  postAuthor:         { fontWeight: '700', fontSize: 14 },
  postTime:           { fontSize: 11, marginTop: 2 },
  postBody:           { fontSize: 14, lineHeight: 20 },
  postStats:          { flexDirection: 'row', gap: 14, marginTop: 10 },
  postStat:           { flexDirection: 'row', alignItems: 'center', gap: 4 },
  postStatText:       { fontSize: 12 },

  // FAB
  fab: {
    position: 'absolute', bottom: 24, right: 20, width: 52, height: 52,
    borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 4,
  },

  // Schedule
  planCard:           { marginBottom: 0 },
  planRow:            { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  planTitle:          { fontWeight: '700', fontSize: 14 },
  planSub:            { fontSize: 12, marginTop: 2 },
  sectionTitle:       { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4, marginTop: 8 },
  copyBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },

  // Members
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 0,
  },
  memberName:         { fontWeight: '600', fontSize: 14 },
  memberLocation:     { fontSize: 11, marginTop: 2 },
  roleBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1,
  },
  roleBadgeText:      { fontSize: 11, fontWeight: '700' },

  // About
  aboutBlock:         { gap: 10 },
  aboutCard:          { marginBottom: 0 },
  aboutSectionTitle:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  aboutBio:           { fontSize: 14, lineHeight: 21 },
  aboutRow:           { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  aboutRowText:       { fontSize: 14, flex: 1 },
  linkText:           {},

  // Misc
  flex1:              { flex: 1 },
  spinnerWrap:        { paddingVertical: 40, alignItems: 'center' },
});

const schedStyles = StyleSheet.create({
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendarTitle: { fontSize: 17, fontWeight: '800' },
  calendarMonth: { fontSize: 13, fontWeight: '600' },
  calendarTypeBadge: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  backToTodayBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1,
  },
  backToTodayText: { fontSize: 12, fontWeight: '700' },
});
