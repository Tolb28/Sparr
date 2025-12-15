import React, { useEffect, useState } from 'react';
import { FlatList } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { listPublicCalendars, selectCalendar } from '../api/trainingCalendars';
import { useNavigation } from '@react-navigation/native';

export default function BrowseCalendarsScreen() {
  const [calendars, setCalendars] = useState<any[]>([]);
  const nav = useNavigation();

  useEffect(() => {
    (async () => {
      try {
        const resp = await listPublicCalendars();
        setCalendars(resp.calendars || []);
      } catch (e) {}
    })();
  }, []);

  return (
    <Box className="flex-1 bg-white px-4 py-4">
      <VStack className="gap-3">
        <Text className="text-lg font-semibold">Public Training Calendars</Text>
        <FlatList
          data={calendars}
          keyExtractor={(i) => String(i.id_training_calendar)}
          renderItem={({ item }) => (
            <HStack className="items-center justify-between bg-white p-3 rounded border border-gray-200">
              <VStack>
                <Text className="font-semibold">{item.title}</Text>
                <Text className="text-gray-600">{item.privacy}</Text>
              </VStack>
              <HStack className="gap-2">
                <Pressable
                  className="bg-blue-600 rounded px-3 py-2"
                  onPress={async () => {
                    try {
                      await selectCalendar(item.id_training_calendar);
                      nav.goBack();
                    } catch (e) {}
                  }}
                >
                  <Text className="text-white">Select</Text>
                </Pressable>
              </HStack>
            </HStack>
          )}
        />
      </VStack>
    </Box>
  );
}
