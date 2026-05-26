import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Modal, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import ProgressRing from '../components/ProgressRing';
import { getUserProfile } from '../api/profile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TrainingCard from '../components/TrainingCard';
import DayTimelineView, { TimelineTraining } from '../components/DayTimelineView';
import { getSelectedCalendarForProfile, getTraining } from '../api/trainingCalendars';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import WeeklyCalendar from '../components/WeeklyCalendar';
import { GlassCard } from '@/components/ui/glass-card';
import { colors } from '@/src/theme/colors';
import { useProgress } from '@/src/context/ProgressContext';
import ProgressHeaderCard from '../components/ProgressHeaderCard';
import MetricCardsRow from '../components/MetricCardsRow';
import StatsBreakdownModal from '../components/StatsBreakdownModal';
import BadgeProgressWidget from '../components/BadgeProgressWidget';
import { SkeletonLoader } from '@/components/ui/skeleton-loader';

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Return 0-6 (Mon=0 … Sun=6) for a YYYY-MM-DD string. */
function dayOfWeekFromDate(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const jsDay = new Date(y, m - 1, d).getDay(); // 0=Sun
  return (jsDay + 6) % 7; // 0=Mon
}

/** Days between two YYYY-MM-DD dates (d2 - d1). */
function daysBetween(d1: string, d2: string): number {
  const a = new Date(d1 + 'T00:00:00');
  const b = new Date(d2 + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** Calculate training duration from components. */
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

export default function CalendarScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  const today = new Date();
  const formattedDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today
    .getDate()
    .toString()
    .padStart(2, '0')}`;

  const [selectedDate, setSelectedDate] = useState<string>(() => formattedDate);
  const [calendar, setCalendar] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);

  // Multiple trainings for timeline view
  const [dayTrainings, setDayTrainings] = useState<TimelineTraining[]>([]);
  // Single training fallback for backward compat
  const [currentTraining, setCurrentTraining] = useState<any | null>(null);
  const [trainingComponents, setTrainingComponents] = useState<any[]>([]);
  const [generatedContent, setGeneratedContent] = useState<string[]>([]);
  const [trainingDuration, setTrainingDuration] = useState<string>('—');
  // Track whether the selected day is an explicit rest day (slot exists with null training)
  const [isRestDay, setIsRestDay] = useState<boolean>(false);

  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;
  const [profile, setProfile] = useState<any | null>(null);

  const [weekPercent, setWeekPercent] = useState<number>(0);
  const [weekCompleted, setWeekCompleted] = useState<number>(0);
  const [weekScheduled, setWeekScheduled] = useState<number>(0);
  const { refresh: refreshProgress, badges, loading: progressLoading, error: progressError } = useProgress();

  const upcomingBadges = useMemo(() => {
    if (!badges || badges.length === 0) return [];
    return badges
      .filter((badge) => !badge.earned)
      .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
  }, [badges]);

  const previewBadges = useMemo(() => upcomingBadges.slice(0, 3), [upcomingBadges]);
  const handleMetricTap = useCallback((metricKey: string) => setExpandedChart(metricKey), []);
  const handleProgressRetry = useCallback(() => {
    refreshProgress(true).catch(() => {});
  }, [refreshProgress]);

  const getMetricLabel = (metricKey: string) => {
    switch (metricKey) {
      case 'workouts_completed':
        return 'Sessions';
      case 'total_hours':
        return 'Hours';
      case 'streak_days':
        return 'Streak';
      case 'club_sessions':
        return 'Club Sessions';
      case 'interactions_count':
        return 'Interactions';
      case 'score':
        return 'Score';
      case 'skill_level':
        return 'Skill';
      case 'intensity':
        return 'Intensity';
      default:
        return 'Metric';
    }
  };

  const loadProfile = async () => {
    try {
      const data = await getUserProfile();
      setProfile(data?.profile ?? data);
    } catch {
      setProfile(null);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const selected = await getSelectedCalendarForProfile();
        setCalendar(selected.calendar);
        setItems(selected.items || []);
      } catch {
        setCalendar(null);
        setItems([]);
      }
    })();
    loadProfile();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const selected = await getSelectedCalendarForProfile();
          if (!mounted) return;
          setCalendar(selected.calendar);
          setItems(selected.items || []);
        } catch {
          if (mounted) {
            setCalendar(null);
            setItems([]);
          }
        }
      })();
      loadProfile();
      return () => {
        mounted = false;
      };
    }, [])
  );

  useFocusEffect(
    React.useCallback(() => {
      refreshProgress().catch(() => {});
    }, [refreshProgress])
  );

  /* ------------- Resolve which trainings belong to selected date ----------- */
  useEffect(() => {
    (async () => {
      if (!items || items.length === 0 || !calendar) {
        setDayTrainings([]);
        setCurrentTraining(null);
        setTrainingComponents([]);
        setGeneratedContent([]);
        setIsRestDay(false);
        return;
      }

      let matchedItems: any[] = [];
      const calType: string = calendar.calendar_type || 'order';

      if (calType === 'day') {
        // Day-oriented: match by day_of_week and week_number in the rotation
        const dow = dayOfWeekFromDate(selectedDate);
        const numWeeks = calendar.num_weeks || 1;
        // Determine which rotation week the selected date falls into
        // Use calendar created_at as anchor, or a fixed reference
        const createdAt = calendar.created_at
          ? calendar.created_at.substring(0, 10)
          : formattedDate;
        const totalDays = daysBetween(createdAt, selectedDate);
        const weekInRotation = totalDays >= 0
          ? (Math.floor(totalDays / 7) % numWeeks) + 1
          : ((numWeeks - (Math.floor(Math.abs(totalDays) / 7) % numWeeks)) % numWeeks) + 1;

        matchedItems = items.filter(
          (it: any) => Number(it.day_of_week) === dow && Number(it.week_number) === weekInRotation
        );
      } else {
        // Order-oriented: cycle via order + start date
        const rawStart = calendar.order_start_date;
        const startDate = rawStart ? String(rawStart).substring(0, 10) : formattedDate;
        const totalDays = daysBetween(startDate, selectedDate);
        const uniqueOrders = [...new Set(items.filter((it: any) => it.order != null).map((it: any) => Number(it.order)))].sort((a, b) => a - b);
        const n = uniqueOrders.length || 1;
        const cycleIndex = totalDays >= 0
          ? totalDays % n
          : ((n - (Math.abs(totalDays) % n)) % n);
        const targetOrder = uniqueOrders[cycleIndex];
        matchedItems = items.filter((it: any) => it.order != null && Number(it.order) === targetOrder);
      }

      // If no trainings matched (rest day for order-oriented, unassigned day for day-oriented)
      // Rest day: slot exists but all have null id_trainings
      // No slot: matchedItems.length === 0
      const hasSlotWithNullTraining = matchedItems.length > 0 && matchedItems.every((it: any) => !it.id_trainings);
      if (matchedItems.length === 0 || hasSlotWithNullTraining) {
        setDayTrainings([]);
        setCurrentTraining(null);
        setTrainingComponents([]);
        setGeneratedContent([]);
        setIsRestDay(hasSlotWithNullTraining);
        return;
      }

      setIsRestDay(false);

      // Fetch full details for each matched training
      const loadedTrainings: TimelineTraining[] = [];
      let firstTraining: any = null;
      let firstComponents: any[] = [];
      let firstContent: string[] = [];

      for (const item of matchedItems) {
        if (!item.id_trainings) continue;
        try {
          const resp = await getTraining(Number(item.id_trainings));
          const training = resp.training || resp?.training;
          const components = resp.components || resp?.components || [];

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

          loadedTrainings.push({
            id: item.id_training_calendar_trainings || item.id_trainings,
            title: training?.title || 'Training',
            description: training?.description,
            duration: calculateDuration(components),
            start_time: item.start_time || null,
            components: content,
            trainingComponents: components,
            trainingName: training?.title || '',
          });

          if (!firstTraining) {
            firstTraining = training;
            firstComponents = components;
            firstContent = content;
          }
        } catch {
          /* skip failed fetches */
        }
      }

      setDayTrainings(loadedTrainings);
      setCurrentTraining(firstTraining || null);
      setTrainingComponents(firstComponents);
      setGeneratedContent(firstContent);
    })();
  }, [selectedDate, items, calendar]);

  useEffect(() => {
    setTrainingDuration(calculateDuration(trainingComponents));
  }, [trainingComponents]);

  /* ------------- Weekly progress calculation ----------- */
  useEffect(() => {
    if (!calendar || !items || items.length === 0) {
      setWeekScheduled(0);
      setWeekCompleted(0);
      setWeekPercent(0);
      return;
    }

    try {
      const selected = new Date(selectedDate);
      const dayIndex = (selected.getDay() + 6) % 7;
      const weekStart = new Date(selected);
      weekStart.setDate(selected.getDate() - dayIndex);

      const calType: string = calendar.calendar_type || 'order';
      let scheduled = 0;

      if (calType === 'day') {
        const numWeeks = calendar.num_weeks || 1;
        const createdAt = calendar.created_at
          ? calendar.created_at.substring(0, 10)
          : formattedDate;

        for (let d = 0; d < 7; d++) {
          const dayDate = new Date(weekStart);
          dayDate.setDate(weekStart.getDate() + d);
          const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
          const dow = dayOfWeekFromDate(dateStr);
          const totalDays = daysBetween(createdAt, dateStr);
          const weekInRotation = totalDays >= 0
            ? (Math.floor(totalDays / 7) % numWeeks) + 1
            : ((numWeeks - (Math.floor(Math.abs(totalDays) / 7) % numWeeks)) % numWeeks) + 1;
          const count = items.filter(
            (it: any) => Number(it.day_of_week) === dow && Number(it.week_number) === weekInRotation
          ).length;
          if (count > 0) scheduled++;
        }
      } else {
        const rawStart = calendar.order_start_date;
        const startDate = rawStart ? String(rawStart).substring(0, 10) : formattedDate;
        const uniqueOrders = [...new Set(items.map((it: any) => Number(it.order)))].sort((a, b) => a - b);
        const n = uniqueOrders.length || 1;

        for (let d = 0; d < 7; d++) {
          const dayDate = new Date(weekStart);
          dayDate.setDate(weekStart.getDate() + d);
          const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
          const totalDays = daysBetween(startDate, dateStr);
          const cycleIdx = totalDays >= 0 ? totalDays % n : ((n - (Math.abs(totalDays) % n)) % n);
          const targetOrder = uniqueOrders[cycleIdx];
          const hasTraining = items.some((it: any) => Number(it.order) === targetOrder && it.id_trainings);
          if (hasTraining) scheduled++;
        }
      }

      const now = new Date();
      // Count completed days as days before today within this week
      let completed = 0;
      for (let d = 0; d < 7; d++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + d);
        if (dayDate > now) break;
        // Check if this day has trainings
        const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
        let dayHasTraining = false;
        if (calType === 'day') {
          const dow = dayOfWeekFromDate(dateStr);
          const numWeeks = calendar.num_weeks || 1;
          const createdAt = calendar.created_at ? calendar.created_at.substring(0, 10) : formattedDate;
          const totalDays = daysBetween(createdAt, dateStr);
          const weekInRotation = totalDays >= 0
            ? (Math.floor(totalDays / 7) % numWeeks) + 1
            : ((numWeeks - (Math.floor(Math.abs(totalDays) / 7) % numWeeks)) % numWeeks) + 1;
          dayHasTraining = items.some(
            (it: any) => Number(it.day_of_week) === dow && Number(it.week_number) === weekInRotation
          );
        } else {
          const rawStart = calendar.order_start_date;
          const startDate = rawStart ? String(rawStart).substring(0, 10) : formattedDate;
          const uniqueOrders = [...new Set(items.map((it: any) => Number(it.order)))].sort((a, b) => a - b);
          const n = uniqueOrders.length || 1;
          const totalDays = daysBetween(startDate, dateStr);
          const cycleIdx = totalDays >= 0 ? totalDays % n : ((n - (Math.abs(totalDays) % n)) % n);
          const targetOrder = uniqueOrders[cycleIdx];
          dayHasTraining = items.some((it: any) => Number(it.order) === targetOrder && it.id_trainings);
        }
        if (dayHasTraining) completed++;
      }

      const percent = scheduled > 0 ? (completed / scheduled) * 100 : 0;
      setWeekScheduled(scheduled);
      setWeekCompleted(completed);
      setWeekPercent(percent);
    } catch {
      setWeekScheduled(0);
      setWeekCompleted(0);
      setWeekPercent(0);
    }
  }, [items, selectedDate, calendar]);

  /* ------------- Build events map for WeeklyCalendar ----------- */
  const buildEvents = () => {
    if (!calendar || !items || items.length === 0) return {};

    const events: Record<string, { color: string; count: number }> = {};
    const calType: string = calendar.calendar_type || 'order';

    // Build events for a ±15 day range around selected date
    const center = new Date(selectedDate);
    for (let offset = -15; offset <= 15; offset++) {
      const d = new Date(center);
      d.setDate(center.getDate() + offset);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      let count = 0;
      if (calType === 'day') {
        const dow = dayOfWeekFromDate(dateStr);
        const numWeeks = calendar.num_weeks || 1;
        const createdAt = calendar.created_at ? calendar.created_at.substring(0, 10) : formattedDate;
        const totalDays = daysBetween(createdAt, dateStr);
        const weekInRotation = totalDays >= 0
          ? (Math.floor(totalDays / 7) % numWeeks) + 1
          : ((numWeeks - (Math.floor(Math.abs(totalDays) / 7) % numWeeks)) % numWeeks) + 1;
        count = items.filter(
          (it: any) => Number(it.day_of_week) === dow && Number(it.week_number) === weekInRotation
        ).length;
      } else {
        const rawStart = calendar.order_start_date;
        const startDate = rawStart ? String(rawStart).substring(0, 10) : formattedDate;
        const uniqueOrders = [...new Set(items.filter((it: any) => it.order != null).map((it: any) => Number(it.order)))].sort((a, b) => a - b);
        const n = uniqueOrders.length || 1;
        const totalDays = daysBetween(startDate, dateStr);
        const cycleIdx = totalDays >= 0 ? totalDays % n : ((n - (Math.abs(totalDays) % n)) % n);
        const targetOrder = uniqueOrders[cycleIdx];
        count = items.filter((it: any) => it.order != null && Number(it.order) === targetOrder && it.id_trainings).length;
      }

      if (count > 0) {
        events[dateStr] = { color: '#f20d0d', count };
      }
    }
    return events;
  };

  const CALENDAR_EVENT_COLORS = ['#22c55e', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 + (insets.bottom || 0) }}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: (insets?.top ?? 0) + 10 }]}>
          <View style={styles.profileRow}>
            <Avatar size="md">
              <AvatarImage source={{ uri: profile?.avatar_url || 'https://i.pravatar.cc/100' }} />
            </Avatar>
            <View style={styles.profileText}>
              <Text style={styles.profileWelcome}>Welcome back,</Text>
              <Text style={styles.profileName}>{profile?.display_name || 'Champ'}</Text>
            </View>
          </View>
          <Pressable style={styles.menuBtn} onPress={() => setMenuOpen(true)}>
            <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
          </Pressable>
        </View>

        {/* Context menu */}
        <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setMenuOpen(false)}>
            <View style={[styles.menuCard, { top: (insets.top || 0) + 44 }]}>
              {calendar && (
                <>
                  <Pressable
                    style={styles.menuItem}
                    onPress={() => { setMenuOpen(false); (navigation as any).navigate('EditCalendar', { calendarId: calendar.id_training_calendar }); }}
                  >
                    <Text style={styles.menuItemText}>Edit Calendar</Text>
                  </Pressable>
                  <View style={styles.menuDivider} />
                </>
              )}
              <Pressable
                style={styles.menuItem}
                onPress={() => { setMenuOpen(false); (navigation as any).navigate('CreateCalendar'); }}
              >
                <Text style={styles.menuItemText}>Create Calendar</Text>
              </Pressable>
              <View style={styles.menuDivider} />
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  const rootNav = (navigation as any).getParent();
                  if (rootNav) rootNav.navigate('BrowseCalendars');
                  else (navigation as any).navigate('BrowseCalendars');
                }}
              >
                <Text style={styles.menuItemText}>Select Calendar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        <View style={[styles.body, isSmallScreen && styles.bodyCompact]}>
          <ProgressHeaderCard onRefresh={refreshProgress} />
          <MetricCardsRow onMetricTap={handleMetricTap} />
          {progressError ? (
            <GlassCard variant="medium" radius={14} padding={12} style={styles.inlineErrorCard}>
              <Text style={styles.inlineErrorText}>Failed to load progress data. Please try again.</Text>
              <Pressable
                style={styles.inlineErrorButton}
                onPress={handleProgressRetry}
                accessibilityRole="button"
                accessibilityLabel="Retry loading progress data"
                testID="CalendarScreen_ProgressRetry"
              >
                <Ionicons name="reload" size={14} color={colors.primary.main} />
                <Text style={styles.inlineErrorButtonText}>Retry</Text>
              </Pressable>
            </GlassCard>
          ) : null}
          <View style={styles.badgeSection}>
            <Text style={styles.badgeSectionTitle}>BADGES ON THE HORIZON</Text>
            {progressError ? (
              <GlassCard variant="medium" radius={14} padding={12}>
                <Text style={styles.badgeEmptyText}>Badge progress unavailable right now.</Text>
              </GlassCard>
            ) : progressLoading ? (
              <ScrollView
                horizontal
                bounces={false}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.badgeScroll}
              >
                {[0, 1, 2].map((idx) => (
                  <GlassCard key={`badge-skel-${idx}`} variant="medium" radius={14} padding={12} style={styles.badgeSkeleton}>
                    <SkeletonLoader width={90} height={12} borderRadius={6} />
                    <View style={styles.badgeSkeletonRow}>
                      <SkeletonLoader width={70} height={12} borderRadius={6} />
                      <SkeletonLoader width={40} height={40} borderRadius={20} />
                    </View>
                    <SkeletonLoader width={80} height={10} borderRadius={6} />
                  </GlassCard>
                ))}
              </ScrollView>
            ) : upcomingBadges.length === 0 ? (
              <GlassCard variant="medium" radius={14} padding={12}>
                <Text style={styles.badgeEmptyText}>All badges unlocked! 🎉</Text>
              </GlassCard>
            ) : (
              <ScrollView
                horizontal
                bounces={false}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.badgeScroll}
              >
                {previewBadges.map((badge) => (
                  <BadgeProgressWidget key={String(badge.id_badges)} badge={badge} />
                ))}
                <Pressable
                  onPress={() => (navigation as any).navigate('Profile')}
                  accessibilityRole="button"
                  accessibilityLabel="View all badges"
                  testID="CalendarScreen_ViewAllBadges"
                >
                  <GlassCard variant="medium" radius={14} padding={12} style={styles.viewAllCard}>
                    <Ionicons name="trophy-outline" size={22} color={colors.text.primary} />
                    <Text style={styles.viewAllText}>View All</Text>
                  </GlassCard>
                </Pressable>
              </ScrollView>
            )}
          </View>
          <StatsBreakdownModal
            isVisible={expandedChart !== null}
            onClose={() => setExpandedChart(null)}
            metricKey={expandedChart ?? ''}
            metricLabel={getMetricLabel(expandedChart ?? '')}
          />
          {/* Calendar header */}
          <View style={styles.calendarHeader}>
            <View>
              <Text style={styles.calendarTitle}>{calendar?.title ?? 'Training Schedule'}</Text>
              <Text style={styles.calendarMonth}>
                {new Date(selectedDate).toLocaleString(undefined, { month: 'long', year: 'numeric' })}
              </Text>
              {calendar && (
                <Text style={styles.calendarTypeBadge}>
                  {calendar.calendar_type === 'day' ? '📅 Day-based' : '🔁 Order-based'}
                  {calendar.calendar_type === 'day' && calendar.num_weeks > 1 && ` · ${calendar.num_weeks}wk rotation`}
                </Text>
              )}
            </View>
            {selectedDate !== formattedDate && (
              <Pressable
                style={styles.backToTodayBtn}
                onPress={() => setSelectedDate(formattedDate)}
              >
                <Text style={styles.backToTodayText}>Today</Text>
              </Pressable>
            )}
          </View>

          {/* Weekly calendar strip */}
          <WeeklyCalendar
            initialDate={selectedDate}
            events={buildEvents()}
            onSelect={(date) => {
              const year = date.getFullYear();
              const month = (date.getMonth() + 1).toString().padStart(2, '0');
              const day = date.getDate().toString().padStart(2, '0');
              setSelectedDate(`${year}-${month}-${day}`);
            }}
          />

          {/* Weekly progress */}
          <GlassCard variant="medium" radius={16} padding={16} style={styles.progressCard}>
            <View style={styles.progressRow}>
              <ProgressRing
                percent={Math.min(100, Math.round(weekPercent || 0))}
                accessibilityLabel={`Weekly goal completion ${Math.min(100, Math.round(weekPercent || 0))}%`}
              />
              <View style={styles.progressInfo}>
                <Text style={styles.progressTitle}>Weekly Goal</Text>
                <Text style={styles.progressSub}>
                  {weekScheduled > 0
                    ? `${weekCompleted} of ${weekScheduled} sessions completed`
                    : 'No sessions scheduled this week.'}
                </Text>
                <View style={styles.progressStats}>
                  <View style={styles.progressStat}>
                    <Text style={styles.progressNum}>12</Text>
                    <Text style={styles.progressLabel}>ROUNDS</Text>
                  </View>
                  <View style={styles.progressDivider} />
                  <View style={styles.progressStat}>
                    <Text style={styles.progressNum}>840</Text>
                    <Text style={styles.progressLabel}>KCAL</Text>
                  </View>
                </View>
              </View>
            </View>
          </GlassCard>

          {/* Training card / timeline or empty state */}
          {!calendar || items.length === 0 ? (
            <GlassCard variant="medium" radius={16} padding={24} style={{ alignItems: 'center', gap: 12 }}>
              <Ionicons name="calendar-outline" size={40} color={colors.text.tertiary} />
              <Text style={{ color: colors.text.primary, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
                No calendar selected
              </Text>
              <Text style={{ color: colors.text.tertiary, fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
                Create your own training program or browse public ones from the community.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <Pressable
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primary.main }}
                  onPress={() => (navigation as any).navigate('CreateCalendar')}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Create</Text>
                </Pressable>
                <Pressable
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.glass.surface, borderWidth: 1, borderColor: colors.glass.border }}
                  onPress={() => {
                    const rootNav = (navigation as any).getParent();
                    if (rootNav) rootNav.navigate('BrowseCalendars');
                    else (navigation as any).navigate('BrowseCalendars');
                  }}
                >
                  <Ionicons name="search" size={16} color={colors.text.secondary} />
                  <Text style={{ color: colors.text.secondary, fontSize: 13, fontWeight: '600' }}>Browse</Text>
                </Pressable>
              </View>
            </GlassCard>
          ) : dayTrainings.length > 1 ? (
            /* Multiple trainings → Timeline view */
            <DayTimelineView
              trainings={dayTrainings}
              onStartPress={(t) => {
                if (t.trainingComponents && t.trainingComponents.length > 0) {
                  (navigation as any).navigate('Training', { components: t.trainingComponents, trainingName: t.trainingName });
                }
              }}
              onEditPress={(t) => {
                const idMatch = String(t.id).match(/^\d+$/);
                if (idMatch) {
                  (navigation as any).navigate('EditTraining', { trainingId: Number(t.id) });
                }
              }}
            />
          ) : (
            /* Single training or rest day → classic TrainingCard */
            <TrainingCard
              title={currentTraining?.title || 'Rest Day'}
              description={currentTraining?.description || (dayTrainings.length === 0 ? 'Rest day — no training scheduled' : 'No training selected for this day')}
              length={trainingDuration}
              start_time={dayTrainings[0]?.start_time ?? null}
              components={generatedContent}
              trainingComponents={trainingComponents}
              trainingName={currentTraining?.title || ''}
              isEmpty={!currentTraining && !isRestDay}
              isRestDay={isRestDay}
              onStartPress={() => {}}
              onEditPress={currentTraining ? () => (navigation as any).navigate('EditTraining', { trainingId: currentTraining.id_trainings }) : () => {}}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.secondary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border.light,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  profileText: { gap: 2 },
  profileWelcome: { color: colors.text.tertiary, fontSize: 11 },
  profileName: { color: colors.text.primary, fontSize: 14, fontWeight: '700' },
  menuBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.glass.surface, alignItems: 'center', justifyContent: 'center',
  },
  modalOverlay: { flex: 1 },
  menuCard: {
    position: 'absolute', right: 16,
    backgroundColor: colors.background.primary,
    borderRadius: 14, borderWidth: 1, borderColor: colors.border.light,
    minWidth: 180, elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  menuItem: { paddingHorizontal: 20, paddingVertical: 14 },
  menuItemText: { color: colors.text.primary, fontSize: 14, fontWeight: '500' },
  menuDivider: { height: 1, backgroundColor: colors.border.light },
  body: { paddingHorizontal: 16, paddingVertical: 20, gap: 16 },
  bodyCompact: { paddingHorizontal: 12 },
  inlineErrorCard: {
    gap: 10,
  },
  inlineErrorText: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  inlineErrorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.glass.redBorder,
    backgroundColor: colors.glass.redSurface,
  },
  inlineErrorButtonText: {
    color: colors.primary.main,
    fontSize: 12,
    fontWeight: '700',
  },
  badgeSection: { gap: 10, minHeight: 150 },
  badgeSectionTitle: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  badgeScroll: {
    paddingVertical: 4,
    gap: 12,
    paddingHorizontal: 2,
  },
  badgeSkeleton: {
    width: 170,
    gap: 10,
  },
  badgeSkeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeEmptyText: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  viewAllCard: {
    width: 140,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  viewAllText: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendarTitle: { color: colors.text.primary, fontSize: 17, fontWeight: '800' },
  calendarMonth: { color: colors.primary.main, fontSize: 13, fontWeight: '600' },
  calendarTypeBadge: { color: colors.text.tertiary, fontSize: 11, fontWeight: '600', marginTop: 2 },
  backToTodayBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: colors.glass.redSurface, borderWidth: 1, borderColor: colors.glass.redBorder,
  },
  backToTodayText: { color: colors.primary.main, fontSize: 12, fontWeight: '700' },
  progressCard: { marginVertical: 4 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  progressInfo: { flex: 1, gap: 4 },
  progressTitle: { color: colors.text.primary, fontSize: 15, fontWeight: '700' },
  progressSub: { color: colors.text.secondary, fontSize: 11, lineHeight: 16 },
  progressStats: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  progressStat: { alignItems: 'center' },
  progressNum: { color: colors.text.primary, fontSize: 16, fontWeight: '800' },
  progressLabel: { color: colors.text.tertiary, fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  progressDivider: { width: 1, height: 28, backgroundColor: colors.border.light },
});
