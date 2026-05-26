import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { GlassCard } from '@/components/ui/glass-card';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';

function dayOfWeekFromDate(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const jsDay = new Date(y, m - 1, d).getDay(); // 0=Sun
  return (jsDay + 6) % 7; // 0=Mon
}

function daysBetween(d1: string, d2: string): number {
  const a = new Date(d1 + 'T00:00:00');
  const b = new Date(d2 + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export default function ClubUpcomingEvents({
  clubId,
  calendarItems = [],
  calendar,
  resolvedTrainings = [],
}: {
  clubId: number;
  calendarItems?: any[];
  calendar?: any;
  resolvedTrainings?: any[];
}) {
  const todayDate = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const todaySessions = useMemo(() => {
    if (!calendar || calendarItems.length === 0) return [];

    const selectedDate = todayDate;
    const calendarType = calendar.calendar_type || 'order';

    if (calendarType === 'order') {
      // Order-based calendar
      const rawStart = calendar.order_start_date;
      const startDate = rawStart
        ? String(rawStart).substring(0, 10)
        : calendar.created_at?.split('T')[0] || todayDate;
      const totalDays = daysBetween(startDate, selectedDate);
      const uniqueOrders = [
        ...new Set(
          calendarItems
            .filter((i: any) => i.order != null)
            .map((i: any) => Number(i.order))
        ),
      ].sort((a, b) => a - b);
      if (uniqueOrders.length === 0) return [];
      const n = uniqueOrders.length;
      const cycleIndex = totalDays >= 0 ? totalDays % n : (n - (Math.abs(totalDays) % n)) % n;
      const targetOrder = uniqueOrders[cycleIndex];
      return calendarItems.filter((it: any) => it.order != null && Number(it.order) === targetOrder);
    } else {
      // Day-based calendar
      const dow = dayOfWeekFromDate(selectedDate);
      const createdAt = calendar.created_at?.split('T')[0] || todayDate;
      const totalDays = daysBetween(createdAt, selectedDate);
      const numWeeks = calendar.num_weeks || 1;
      const weekInRotation =
        totalDays >= 0
          ? (Math.floor(totalDays / 7) % numWeeks) + 1
          : (numWeeks - (Math.floor(Math.abs(totalDays) / 7) % numWeeks)) % numWeeks + 1;
      return calendarItems.filter(
        (it: any) =>
          Number(it.day_of_week) === dow && Number(it.week_number) === weekInRotation
      );
    }
  }, [calendar, calendarItems, todayDate]);

  if (todaySessions.length === 0) {
    return (
      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <Text style={{ color: colors.text.primary, fontWeight: '700', marginBottom: 8 }}>Today</Text>
        <GlassCard variant="medium" radius={14} padding={12}>
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Ionicons name="calendar-clear-outline" size={20} color={colors.text.tertiary} />
            <Text style={{ color: colors.text.tertiary, marginTop: 8, fontSize: 13 }}>
              No sessions scheduled for today
            </Text>
          </View>
        </GlassCard>
      </View>
    );
  }

  const list = todaySessions.slice(0, 3).map((session) => {
    // Try to find resolved training details for this session
    const resolved = resolvedTrainings.find(
      (r) => r.id === session.id_training_calendar_trainings || r.id === session.id_trainings
    );
    return { ...session, resolved };
  });

  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
      <Text style={{ color: colors.text.primary, fontWeight: '700', marginBottom: 8 }}>Today</Text>
      {list.map((ev) => (
        <GlassCard key={String(ev.id ?? Math.random())} variant="default" radius={12} padding={12} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.left}>
              <Text style={styles.title}>{ev.training_title || ev.event_title || ev.title || 'Session'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 12 }}>
                <Text style={styles.sub}>{formatEventTime(ev)}</Text>
                {ev.resolved?.duration ? (
                  <Text style={styles.sub}>• {ev.resolved.duration}</Text>
                ) : ev.component_count ? (
                  <Text style={styles.sub}>• {ev.component_count} exercise{ev.component_count !== 1 ? 's' : ''}</Text>
                ) : null}
              </View>
            </View>
          </View>
        </GlassCard>
      ))}
    </View>
  );
}

function formatEventTime(ev: any) {
  const dt = ev?.event_starts_at || ev?.start_time || ev?.starts_at || ev?.startsAt || ev?.date;
  if (!dt) return 'TBD';
  try {
    const d = new Date(dt);
    if (isNaN(d.getTime())) return String(dt);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return String(dt);
  }
}

const styles = StyleSheet.create({
  card: { marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  left: { flex: 1 },
  title: { color: colors.text.primary, fontWeight: '700' },
  sub: { color: colors.text.tertiary, marginTop: 4, fontSize: 12 },
});
