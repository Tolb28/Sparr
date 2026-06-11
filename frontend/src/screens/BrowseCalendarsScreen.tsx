import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { listPublicCalendars, listUserCalendars } from '../api/trainingCalendars';
import { getClubTrainingPlans } from '../api/clubs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/glass-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

interface Calendar {
  id_training_calendar: number;
  title: string;
  privacy: string;
  id_created_by: number | null;
  training_count?: number;
  creator_name?: string;
  calendar_type?: string;
  num_weeks?: number;
}

export default function BrowseCalendarsScreen({ navigation }: { navigation: any }) {
  const route = useRoute<RouteProp<RootStackParamList, 'BrowseCalendars'>>();
  const clubId = route.params?.clubId;
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const [publicCalendars, setPublicCalendars] = useState<Calendar[]>([]);
  const [myCalendars, setMyCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      if (!refreshing) setLoading(true);
      const [pubResp, myResp] = await Promise.all([
        listPublicCalendars(),
        clubId
          ? getClubTrainingPlans(clubId).then((plans) => ({ calendars: plans })).catch(() => ({ calendars: [] }))
          : listUserCalendars().catch(() => ({ calendars: [] })),
      ]);
      setPublicCalendars(pubResp.calendars || []);
      setMyCalendars(myResp.calendars || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => { loadData(); });
    loadData();
    return unsubscribe;
  }, [navigation]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const CalendarCard = ({ calendar }: { calendar: Calendar }) => (
    <Pressable onPress={() => navigation.navigate('CalendarPreview', { calendarId: calendar.id_training_calendar, ...(clubId ? { clubId } : {}) })}>
      <GlassCard variant="medium" radius={12} padding={14} style={styles.calendarCard}>
        <View style={styles.calendarCardRow}>
          <View style={[styles.calendarIconWrap, { backgroundColor: c.glass.redSurface }]}>
            <Ionicons name="calendar" size={18} color={c.primary.main} />
          </View>
          <View style={styles.flex1}>
            <Text style={[styles.calendarTitle, { color: c.text.primary }]}>{calendar.title}</Text>
            <View style={styles.metaRow}>
              {calendar.training_count !== undefined && (
                <Text style={[styles.metaText, { color: c.text.tertiary }]}>
                  {calendar.training_count} training{calendar.training_count !== 1 ? 's' : ''}
                </Text>
              )}
              {calendar.creator_name && (
                <Text style={[styles.metaText, { color: c.text.tertiary }]}>by {calendar.creator_name}</Text>
              )}
              <Text style={[styles.metaText, { color: c.text.tertiary }]}>
                {calendar.calendar_type === 'day' ? '📅' : '🔁'}
              </Text>
              <Text style={[styles.metaText, { color: c.text.tertiary }]}>
                {calendar.privacy === 'private' ? '🔒' : '🌐'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={c.text.tertiary} />
        </View>
      </GlassCard>
    </Pressable>
  );

  const ProgramSection = ({ title, subtitle, data, empty }: any) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: c.text.primary }]}>{title}</Text>
      <Text style={[styles.sectionSub, { color: c.text.tertiary }]}>{subtitle}</Text>
      {data.length > 0 ? (
        <View style={styles.cardList}>
          {data.map((cal: Calendar) => (
            <CalendarCard key={cal.id_training_calendar} calendar={cal} />
          ))}
        </View>
      ) : (
        <EmptyState icon="calendar-outline" title={empty} style={styles.emptyState} />
      )}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: c.background.secondary }]}>
        <ActivityIndicator size="large" color={c.primary.main} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background.secondary }]}>
      <View style={[styles.header, { paddingTop: (insets.top || 0) + 8, borderBottomColor: c.border.light, backgroundColor: c.background.secondary }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={[styles.iconBtn, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]}>
            <Ionicons name="chevron-back" size={20} color={c.text.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: c.text.primary }]}>Browse Programs</Text>
          <View style={styles.iconBtn} />
        </View>
        <Text style={[styles.headerSub, { color: c.text.tertiary }]}>Tap a program to preview before selecting</Text>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.primary.main} />}
      >
        <ProgramSection
          title={clubId ? "Club Calendars" : "Your Programs"}
          subtitle={clubId ? "Calendars created for this club" : "Programs you've created"}
          data={myCalendars}
          empty="No personal programs yet"
        />
        <ProgramSection
          title="Community"
          subtitle="Public programs from the community"
          data={publicCalendars}
          empty="No community programs found"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerSub: { fontSize: 13, marginLeft: 48 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  sectionSub: { fontSize: 12, marginBottom: 12 },
  cardList: { gap: 8 },
  calendarCard: { marginBottom: 0 },
  calendarCardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  calendarIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  flex1: { flex: 1 },
  calendarTitle: { fontSize: 14, fontWeight: '600' },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 3 },
  metaText: { fontSize: 11 },
  emptyState: { paddingVertical: 24 },
});