import React, { useEffect, useState } from 'react';
import { View, ScrollView, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { GlassCard } from '@/components/ui/glass-card';
import { SparrButton } from '@/components/ui/sparr-button';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getCalendarPreview, selectCalendar } from '../api/trainingCalendars';
import { selectClubCalendar } from '../api/clubs';
import TrainingPreviewCard from '../components/TrainingPreviewCard';

export default function CalendarPreviewScreen() {
  const nav = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'CalendarPreview'>>();
  const insets = useSafeAreaInsets();
  const { calendarId, clubId } = route.params;

  const [calendar, setCalendar] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const resp = await getCalendarPreview(calendarId);
        setCalendar(resp?.calendar || null);
        setItems(resp?.items || []);
      } catch {
        setError('Failed to load calendar');
      } finally {
        setLoading(false);
      }
    })();
  }, [calendarId]);

  const handleSelect = async () => {
    setSelecting(true);
    try {
      if (clubId) {
        await selectClubCalendar(clubId, calendarId);
        (nav as any).navigate('ManageClub', { clubId });
      } else {
        await selectCalendar(calendarId);
        (nav as any).navigate('Main', { screen: 'Calendar' });
      }
    } catch {
      setError('Failed to select calendar');
    } finally {
      setSelecting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: (insets.top || 0) + 8 }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {calendar?.title || 'Calendar Preview'}
          </Text>
          {calendar?.creator_name && (
            <Text style={styles.headerSub}>by {calendar.creator_name}</Text>
          )}
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Info card */}
        <GlassCard variant="medium" radius={14} padding={16}>
          <View style={styles.infoRow}>
            <View style={styles.infoBadge}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary.main} />
              <Text style={styles.infoBadgeText}>{items.length} day{items.length !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.infoBadge}>
              <Ionicons
                name={calendar?.privacy === 'public' ? 'globe-outline' : 'lock-closed-outline'}
                size={14} color={colors.text.tertiary}
              />
              <Text style={styles.infoBadgeText}>
                {calendar?.privacy === 'public' ? 'Public' : 'Private'}
              </Text>
            </View>
            <View style={styles.infoBadge}>
              <Text style={styles.infoBadgeText}>
                {calendar?.calendar_type === 'day' ? '📅 Day-based' : '🔁 Order-based'}
              </Text>
            </View>
            {calendar?.calendar_type === 'day' && calendar?.num_weeks > 1 && (
              <View style={styles.infoBadge}>
                <Text style={styles.infoBadgeText}>{calendar.num_weeks}wk rotation</Text>
              </View>
            )}
          </View>
        </GlassCard>

        {/* Day-by-day schedule */}
        <Text style={styles.sectionTitle}>Schedule</Text>
        {items.length === 0 ? (
          <GlassCard variant="medium" radius={12} padding={20}>
            <Text style={styles.emptyText}>No trainings in this calendar yet.</Text>
          </GlassCard>
        ) : calendar?.calendar_type === 'day' ? (
          /* Day-oriented: group by week_number + day_of_week */
          (() => {
            const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const numWeeks = calendar?.num_weeks || 1;
            const grouped: Record<string, any[]> = {};
            items.forEach((item: any) => {
              const wn = item.week_number ?? 1;
              const dow = item.day_of_week ?? 0;
              const key = `${wn}-${dow}`;
              if (!grouped[key]) grouped[key] = [];
              grouped[key].push(item);
            });
            const sortedKeys = Object.keys(grouped).sort((a, b) => {
              const [aw, ad] = a.split('-').map(Number);
              const [bw, bd] = b.split('-').map(Number);
              return aw !== bw ? aw - bw : ad - bd;
            });
            return sortedKeys.map((key) => {
              const [wn, dow] = key.split('-').map(Number);
              const slots = grouped[key];
              return (
                <View key={key} style={styles.dayRow}>
                  <View style={styles.dayBadge}>
                    <Text style={styles.dayBadgeText}>{DAY_LABELS[dow]}</Text>
                  </View>
                  <View style={styles.dayContent}>
                    {numWeeks > 1 && (
                      <Text style={{ color: colors.text.tertiary, fontSize: 10, fontWeight: '600', marginBottom: 2 }}>
                        Week {wn}
                      </Text>
                    )}
                    {slots.map((item: any, idx: number) => (
                      <View key={item.id_training_calendar_trainings || idx}>
                        {item.training ? (
                          <TrainingPreviewCard
                            title={item.training.title}
                            description={item.training.description}
                            componentCount={item.training.component_count}
                            estimatedDurationSeconds={item.training.estimated_duration_seconds}
                          />
                        ) : (
                          <GlassCard variant="default" radius={10} padding={12}>
                            <Text style={styles.restText}>Rest Day</Text>
                          </GlassCard>
                        )}
                        {item.start_time && (
                          <Text style={{ color: colors.text.tertiary, fontSize: 10, marginTop: 2 }}>
                            ⏰ {item.start_time.substring(0, 5)}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              );
            });
          })()
        ) : (
          /* Order-oriented: show order number with optional time */
          items.map((item: any, idx: number) => (
            <View key={item.id_training_calendar_trainings || idx} style={styles.dayRow}>
              <View style={styles.dayBadge}>
                <Text style={styles.dayBadgeText}>{item.order ?? idx + 1}</Text>
              </View>
              <View style={styles.dayContent}>
                {item.training ? (
                  <TrainingPreviewCard
                    title={item.training.title}
                    description={item.training.description}
                    componentCount={item.training.component_count}
                    estimatedDurationSeconds={item.training.estimated_duration_seconds}
                  />
                ) : (
                  <GlassCard variant="default" radius={10} padding={12}>
                    <Text style={styles.restText}>Rest Day</Text>
                  </GlassCard>
                )}
                {item.start_time && (
                  <Text style={{ color: colors.text.tertiary, fontSize: 10, marginTop: 2 }}>
                    ⏰ {item.start_time.substring(0, 5)}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}

        {error && (
          <GlassCard variant="red" radius={12} padding={14}>
            <Text style={styles.errorText}>{error}</Text>
          </GlassCard>
        )}
      </ScrollView>

      {/* Sticky bottom button */}
      <View style={[styles.bottomBar, { paddingBottom: (insets.bottom || 0) + 12 }]}>
        <SparrButton
          label={clubId ? "Select for Club" : "Select This Calendar"}
          variant="primary"
          loading={selecting}
          disabled={selecting}
          onPress={handleSelect}
          fullWidth
        />
      </View>
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
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: colors.text.primary, fontSize: 18, fontWeight: '800' },
  headerSub: { color: colors.text.tertiary, fontSize: 12, marginTop: 2 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.glass.surface, borderWidth: 1, borderColor: colors.glass.border,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { padding: 16, gap: 12, paddingBottom: 100 },
  infoRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  infoBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  infoBadgeText: { color: colors.text.secondary, fontSize: 13, fontWeight: '600' },
  sectionTitle: { color: colors.text.primary, fontSize: 15, fontWeight: '700', marginTop: 4 },
  dayRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  dayBadge: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primary.main, alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
  },
  dayBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  dayContent: { flex: 1 },
  restText: { color: colors.text.tertiary, fontSize: 13, fontStyle: 'italic' },
  emptyText: { color: colors.text.tertiary, fontSize: 13, textAlign: 'center' },
  errorText: { color: '#fecaca', fontWeight: '600', fontSize: 13 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: colors.background.secondary,
    borderTopWidth: 1, borderTopColor: colors.border.light,
  },
});
