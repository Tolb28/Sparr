import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import MyTrainingCalendar from '../components/Calendar';
import { getSelectedCalendarForProfile, createCalendar, listPublicCalendars, selectCalendar, getTraining } from '../api/trainingCalendars';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

export default function CalendarScreen() {
  const [descExpanded, setDescExpanded] = useState(false);
  const [contentExpanded, setContentExpanded] = useState(false);
  // default selected date (YYYY-MM-DD)
  const today: Date = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  const formattedDate = `${year}-${month}-${day}`;

  const [selectedDate, setSelectedDate] = useState<string>(() => formattedDate);
  const [calendar, setCalendar] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);

  const [currentTraining, setCurrentTraining] = useState<any | null>(null);
  const [trainingComponents, setTrainingComponents] = useState<any[]>([]);
  const [generatedContent, setGeneratedContent] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const selected = await getSelectedCalendarForProfile();
        setCalendar(selected.calendar);
        setItems(selected.items || []);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const navigation = useNavigation();

  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const selected = await getSelectedCalendarForProfile();
          if (!mounted) return;
          setCalendar(selected.calendar);
          setItems(selected.items || []);
        } catch (e) {
          // ignore
        }
      })();
      return () => {
        mounted = false;
      };
    }, [])
  );

  // whenever selected date or calendar items change, determine which training should show and fetch its components
  useEffect(() => {
    (async () => {
      if (!items || items.length === 0) {
        setCurrentTraining(null);
        setTrainingComponents([]);
        setGeneratedContent([]);
        return;
      }

      const dayNum = Number(selectedDate.substring(8, 10));
      const orders = Array.from(new Set(items.map((it) => Number(it.order)))).sort((a, b) => a - b);
      const n = orders.length || 1;
      const idx = ((dayNum - 1) % n) + 1;
      const found = items.find((it) => Number(it.order) === idx || String(it.order) === String(idx));
      if (!found || !found.id_trainings) {
        setCurrentTraining(null);
        setTrainingComponents([]);
        setGeneratedContent([]);
        return;
      }

      try {
        const resp = await getTraining(Number(found.id_trainings));
        const training = resp.training || resp?.training;
        const components = resp.components || resp?.components || [];
        setCurrentTraining(training || null);
        setTrainingComponents(components || []);

        // build display items using sets/reps/length
        const content = components.map((c: any) => {
          const label = c.drill_title || c.combination_title || c.title || 'Component';
          const details: string[] = [];
          if (c.sets !== undefined && c.sets !== null) details.push(`${c.sets} sets`);
          if (c.reps !== undefined && c.reps !== null) details.push(`${c.reps} reps`);
          if (c.length !== undefined && c.length !== null) {
            const len = Number(c.length);
            if (!isNaN(len)) {
              if (len >= 60) details.push(`${Math.round(len / 60)} min`);
              else details.push(`${len}s`);
            }
          }
          return details.length ? `${label} (${details.join(', ')})` : label;
        });
        setGeneratedContent(content);
      } catch (e) {
        setCurrentTraining(null);
        setTrainingComponents([]);
        setGeneratedContent([]);
      }
    })();
  }, [selectedDate, items]);

  const description =
    'No training selected for this day';
  const contentItems = [
    'Light stretching exercises',
    'Foam rolling for muscle relaxation',
    'Hydration and nutrition tips',
    'Breathing exercises for relaxation',
    'Short walk or light cardio',
  ];

  return (
    <Box className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <Text className="text-2xl font-bold px-4 pt-6 text-center">{calendar?.title || 'No Calendar Selected'}</Text>
        {/* Day header */}
        <VStack className="px-4 py-6 gap-4">
          <MyTrainingCalendar onSelectDate={(d) => setSelectedDate(d)} items={items} selectedDate={selectedDate} />
          <HStack className="gap-2">
            <Pressable
              className="flex-1 bg-blue-600 rounded px-4 py-2.5 items-center justify-center"
              onPress={() => (navigation as any).navigate('CreateCalendar') }
            >
              <Text className="text-white font-semibold">Create Calendar</Text>
            </Pressable>
            <Pressable
              className="flex-1 bg-gray-200 rounded px-4 py-2.5 items-center justify-center"
              onPress={() => (navigation as any).navigate('BrowseCalendars') }
            >
              <Text className="text-gray-800 font-semibold">Select Calendar</Text>
            </Pressable>
          </HStack>
          {/* Training card */}
          <Box className="bg-white rounded-lg p-3.5 border border-gray-200">
            <Text className="text-lg font-semibold text-center mb-3">
              {currentTraining ? currentTraining.title : items.length > 0 && calendar ? (() => {
                    // fallback: try to find a training title from items if currentTraining isn't set yet
                    const dayNum = Number(selectedDate.substring(8, 10));
                    const orders = Array.from(new Set(items.map((it) => it.order))).sort((a, b) => a - b);
                    const n = orders.length || 1;
                    const idx = ((dayNum - 1) % n) + 1;
                    const found = items.find((it) => Number(it.order) === idx || it.order === String(idx));
                    return found?.title || found?.tr?.title || found?.tct?.title || 'No Training';
                  })() : 'No Training'}
            </Text>

            <HStack className="mb-1.5">
              <Text className="font-semibold mr-2">Length:</Text>
              <Text className="text-gray-700">{items.length > 0 ? 'Varies' : '1h 12m'}</Text>
            </HStack>

            <HStack className="mb-2">
              <Text className="font-semibold mr-2">Description:</Text>
            </HStack>

            <Text className="text-gray-700 leading-5 mt-1">
              {currentTraining ? (currentTraining.description || description) : items.length > 0 && calendar ? (() => {
                    const dayNum = Number(selectedDate.substring(8, 10));
                    const orders = Array.from(new Set(items.map((it) => it.order))).sort((a, b) => a - b);
                    const n = orders.length || 1;
                    const idx = ((dayNum - 1) % n) + 1;
                    const found = items.find((it) => Number(it.order) === idx || it.order === String(idx));
                    return found?.description || found?.tr?.description || description;
                  })() : (descExpanded ? description : description.slice(0, 120) + '...')}
            </Text>
            {description.length > 120 && (
              <Pressable
                onPress={() => setDescExpanded((s) => !s)}
                className="mt-1"
              >
                <Text className="text-blue-500">
                  {descExpanded ? 'Show less' : 'Show more'}
                </Text>
              </Pressable>
            )}

            <VStack className="mt-3">
              <Text className="font-semibold mb-2">Content:</Text>
              {(contentExpanded ? generatedContent : generatedContent.slice(0, 3)).map(
                (c, i) => (
                  <Text key={i} className="text-gray-700 mt-1">
                    - {c}
                  </Text>
                )
              )}
              {generatedContent.length > 3 && (
                <Pressable
                  onPress={() => setContentExpanded((s) => !s)}
                  className="mt-2"
                >
                  <Text className="text-blue-500">
                    {contentExpanded ? 'Show less' : 'Show more'}
                  </Text>
                </Pressable>
              )}
            </VStack>

            <HStack className="mt-3 gap-2">
              <Pressable
                className="flex-1 bg-gray-800 rounded px-4 py-2.5 items-center justify-center"
                onPress={() => {}}
              >
                <Text className="text-white font-semibold">Start Training</Text>
              </Pressable>
              <Pressable
                className="bg-gray-200 rounded px-4 py-2.5 items-center justify-center min-w-max"
                onPress={() => {}}
              >
                <Text className="text-gray-800 font-semibold">Edit Training</Text>
              </Pressable>
            </HStack>
          </Box>
        </VStack>
      </ScrollView>
    </Box>
  );
}

