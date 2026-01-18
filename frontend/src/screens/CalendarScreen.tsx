import React, { useEffect, useState } from 'react';
import { ScrollView, View, Modal } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import MyTrainingCalendar from '../components/Calendar';
import TrainingCard from '../components/TrainingCard';
import { getSelectedCalendarForProfile, createCalendar, listPublicCalendars, selectCalendar, getTraining } from '../api/trainingCalendars';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import WeeklyCalendar from '../components/WeeklyCalendar';

export default function CalendarScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
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
  const [trainingDuration, setTrainingDuration] = useState<string>('—');

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
          // Always show sets (default to 1 if not specified)
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
        setGeneratedContent(content);
      } catch (e) {
        setCurrentTraining(null);
        setTrainingComponents([]);
        setGeneratedContent([]);
      }
    })();
  }, [selectedDate, items]);

  // Calculate duration whenever training components change
  useEffect(() => {
    setTrainingDuration(calculateDuration(trainingComponents));
  }, [trainingComponents]);

  const description =
    'No training selected for this day';
  const contentItems = [
    'Light stretching exercises',
    'Foam rolling for muscle relaxation',
    'Hydration and nutrition tips',
    'Breathing exercises for relaxation',
    'Short walk or light cardio',
  ];

  // Calculate training duration using 3 seconds per rep rule
  const calculateDuration = (components: any[]): string => {
    if (!components || components.length === 0) return '—';
    
    let totalSeconds = 0;
    
    components.forEach((c: any) => {
      // If component has explicit length, use that
      if (c.length !== undefined && c.length !== null) {
        const len = Number(c.length);
        if (!isNaN(len)) {
          totalSeconds += len;
        }
      } else {
        // Otherwise use 3 seconds per rep rule
        const sets = c.sets !== undefined && c.sets !== null ? Number(c.sets) : 1;
        const reps = c.reps !== undefined && c.reps !== null ? Number(c.reps) : 0;
        
        if (!isNaN(sets) && !isNaN(reps) && reps > 0) {
          totalSeconds += sets * reps * 3;
        }
      }
    });

    if (totalSeconds === 0) return '—';
    
    if (totalSeconds >= 3600) {
      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    } else if (totalSeconds >= 60) {
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    } else {
      return `${totalSeconds}s`;
    }
  };

  return (
    <Box className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} className="pt-5">
        <VStack className="px-4 pt-6 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-center flex-1">{calendar?.title || 'No Calendar Selected'}</Text>
          <Pressable
            className="p-2 active:bg-gray-100 rounded-full"
            onPress={() => setMenuOpen(true)}
          >
            <Text className="text-2xl font-bold text-gray-900">⋮</Text>
          </Pressable>
        </VStack>

        <Modal
          visible={menuOpen}
          transparent={true} // Keep transparent
          animationType="none" // "fade" often adds a flicker; "none" feels more like a tooltip
          onRequestClose={() => setMenuOpen(false)}
        >
          {/* The outer Pressable acts as a "backdrop" to close the menu. 
            By removing "bg-black/30", we get rid of the darkened effect.
          */}
          <Pressable
            className="flex-1" // Removed bg-black/30
            onPress={() => setMenuOpen(false)}
          >
            {/* Adjust 'top' to move the menu higher. 
              'top-16' or 'top-20' usually aligns better with the header icon.
            */}
            <VStack 
              className="absolute top-16 right-6 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden min-w-[160px]"
              style={{
                // Elevation for Android to ensure shadow shows without background darkening
                elevation: 5, 
              }}
            >
              <Pressable
                className="px-6 py-4 border-b border-gray-50 active:bg-gray-100"
                onPress={() => {
                  setMenuOpen(false);
                  (navigation as any).navigate('CreateCalendar');
                }}
              >
                <Text className="text-gray-900 font-medium">Create Calendar</Text>
              </Pressable>
              <Pressable
                className="px-6 py-4 active:bg-gray-100"
                onPress={() => {
                  setMenuOpen(false);
                  const rootNav = (navigation as any).getParent();
                  if (rootNav) {
                    rootNav.navigate('BrowseCalendars');
                  } else {
                    (navigation as any).navigate('BrowseCalendars');
                  }
                }}
              >
                <Text className="text-gray-900 font-medium">Select Calendar</Text>
              </Pressable>
            </VStack>
          </Pressable>
        </Modal>
        {/* Day header */}
        <VStack className="px-4 py-6 gap-4">
          <View>
            <WeeklyCalendar
              initialDate={selectedDate}
              events={items.length > 0 ? Object.fromEntries(
                items.map((item) => {
                  // Generate event colors based on order
                  const colors = ['#22c55e', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
                  const colorIndex = (Number(item.order) - 1) % colors.length;
                  return [item.date || '', { color: colors[colorIndex] }];
                }).filter(([date]) => date)
              ) : {}}
              onSelect={(date) => {
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                const iso = `${year}-${month}-${day}`;
                setSelectedDate(iso);
              }}
            />
          </View>
          {/* Training card */}
          <TrainingCard
            title={currentTraining ? currentTraining.title : items.length > 0 && calendar ? (() => {
              const dayNum = Number(selectedDate.substring(8, 10));
              const orders = Array.from(new Set(items.map((it) => it.order))).sort((a, b) => a - b);
              const n = orders.length || 1;
              const idx = ((dayNum - 1) % n) + 1;
              const found = items.find((it) => Number(it.order) === idx || it.order === String(idx));
              return found?.title || found?.tr?.title || found?.tct?.title || 'No Training';
            })() : 'No Training'}
            description={currentTraining ? (currentTraining.description || description) : items.length > 0 && calendar ? (() => {
              const dayNum = Number(selectedDate.substring(8, 10));
              const orders = Array.from(new Set(items.map((it) => it.order))).sort((a, b) => a - b);
              const n = orders.length || 1;
              const idx = ((dayNum - 1) % n) + 1;
              const found = items.find((it) => Number(it.order) === idx || it.order === String(idx));
              return found?.description || found?.tr?.description || description;
            })() : description}
            length={trainingDuration}
            components={generatedContent}
            isEmpty={items.length === 0}
            onStartPress={() => {}}
            onEditPress={() => {}}
          />
        </VStack>
      </ScrollView>
    </Box>
  );
}

