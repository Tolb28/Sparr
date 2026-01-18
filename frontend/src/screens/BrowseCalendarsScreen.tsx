import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { listPublicCalendars, selectCalendar } from '../api/trainingCalendars';
import { getUserProfile } from '../api/profile';

interface Calendar {
  id_training_calendar: number;
  title: string;
  privacy: string;
  id_created_by: number | null;
}

// We accept navigation as a prop instead of using useNavigation()
export default function BrowseCalendarsScreen({ navigation }: { navigation: any }) {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      if (!refreshing) setLoading(true);
      const profile = await getUserProfile();
      setCurrentUserId(profile?.id_profiles || null);
      const resp = await listPublicCalendars();
      setCalendars(resp.calendars || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Replaces useFocusEffect: Standard listener for when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    loadData(); // Initial load
    return unsubscribe;
  }, [navigation]);

  const handleSelectCalendar = async (calendarId: number) => {
    try {
      await selectCalendar(calendarId);
      navigation.goBack(); // Use prop directly
    } catch (e) {
      console.error('Error selecting calendar:', e);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Components for sections
  const CalendarCard = ({ calendar }: { calendar: Calendar }) => (
    <Pressable
      className="bg-white border border-gray-200 rounded-lg p-4 mb-2 active:bg-gray-50"
      onPress={() => handleSelectCalendar(calendar.id_training_calendar)}
    >
      <HStack className="justify-between items-start">
        <VStack className="flex-1">
          <Text className="text-base font-semibold text-gray-900">{calendar.title}</Text>
          <Text className="text-xs text-gray-500 mt-1">
            {calendar.privacy === 'private' ? 'Private' : 'Public'}
          </Text>
        </VStack>
      </HStack>
    </Pressable>
  );

  const CategorySection = ({ title, subtitle, data, empty }: any) => (
    <VStack className="gap-3 mb-8">
      <VStack className="gap-1">
        <Text className="text-lg font-semibold text-gray-900">{title}</Text>
        <Text className="text-sm text-gray-500">{subtitle}</Text>
      </VStack>
      {data.length > 0 ? (
        <VStack className="gap-2">
          {data.map((cal: Calendar) => (
            <CalendarCard key={cal.id_training_calendar} calendar={cal} />
          ))}
        </VStack>
      ) : (
        <Box className="bg-gray-50 rounded-lg p-6 border border-gray-200 items-center justify-center py-8">
          <Text className="text-gray-600 font-medium">{empty}</Text>
        </Box>
      )}
    </VStack>
  );

  if (loading && !refreshing) {
    return (
      <Box className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#4f46e5" />
      </Box>
    );
  }

  return (
    <Box className="flex-1 bg-white">
      <VStack className="flex-1">
        <Box className="bg-white border-b border-gray-100 px-6 py-6">
          <Text className="text-3xl font-bold text-gray-900">Browse Programs</Text>
          <Text className="text-gray-500 mt-1">Select a training program</Text>
        </Box>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          <CategorySection
            title="Featured Programs"
            subtitle="Programs created by the developer"
            data={calendars.filter(c => c.id_created_by === currentUserId)}
            empty="No featured programs found"
          />
          <CategorySection
            title="Community"
            subtitle="Public programs"
            data={calendars.filter(c => c.id_created_by !== currentUserId)}
            empty="No other programs found"
          />
        </ScrollView>
      </VStack>
    </Box>
  );
}