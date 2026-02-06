import React, { useCallback, useEffect, useState } from 'react';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { colors, theme } from '../theme';
import {
  createCalendar,
  selectCalendar,
  getTrainings,
  addTrainingToCalendar,
} from '../api/trainingCalendars';
import { useNavigation } from '@react-navigation/native';
import { FlatList, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import { ChevronDownIcon } from '@/components/ui/icon';

/* ---------------------------------- Types --------------------------------- */
type SelectedTraining =
  | {
      type: 'training';
      id_trainings: number;
      title: string;
    }
  | {
      type: 'none';
      title: 'None';
    };

/* -------------------------------- Component ------------------------------- */
export default function CreateCalendarScreen() {
  const nav = useNavigation();

  const [title, setTitle] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('private');

  const [trainings, setTrainings] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedExistingTraining, setSelectedExistingTraining] =
    useState<number | 'none' | null>(null);

  const [selectedTrainings, setSelectedTrainings] = useState<SelectedTraining[]>([]);

  const [creatingCalendarLoading, setCreatingCalendarLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedTrainingLabel, setSelectedTrainingLabel] = useState<string>('');

  /* ------------------------------ Load Trainings ---------------------------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoadingData(true);
        const resp = await getTrainings();
        if (mounted) setTrainings(resp?.trainings || []);
      } catch {
        setError('Failed to load trainings.');
      } finally {
        if (mounted) setLoadingData(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  /* ---------------------------- Add to local list --------------------------- */
  const addTrainingToList = useCallback(() => {
    resetMessages();

    if (!selectedExistingTraining) {
      setError('Select a training option.');
      return;
    }

    if (selectedExistingTraining === 'none') {
      setSelectedTrainings((prev) => [...prev, { type: 'none', title: 'None' }]);
      setSelectedExistingTraining(null);
      return;
    }

    const training = trainings.find(
      (t) => t.id_trainings === selectedExistingTraining
    );

    if (!training) return;

    setSelectedTrainings((prev) => [
      ...prev,
      {
        type: 'training',
        id_trainings: training.id_trainings,
        title: training.title,
      },
    ]);

    setSelectedExistingTraining(null);
  }, [selectedExistingTraining, trainings]);

  /* ------------------------------ Remove ----------------------------------- */
  const removeTraining = (index: number) => {
    setSelectedTrainings((prev) => prev.filter((_, i) => i !== index));
  };

  /* ------------------------------ Reorder ---------------------------------- */
  const moveTraining = (index: number, direction: 'up' | 'down') => {
    setSelectedTrainings((prev) => {
      const list = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= list.length) return prev;
      [list[index], list[target]] = [list[target], list[index]];
      return list;
    });
  };

  /* ---------------------------- Final Submit -------------------------------- */
  const finalizeCalendarCreation = useCallback(async () => {
    resetMessages();

    if (!title.trim()) {
      setError('Please enter a calendar title.');
      return;
    }

    if (selectedTrainings.length === 0) {
      setError('Add at least one item.');
      return;
    }

    try {
      setCreatingCalendarLoading(true);

      const resp = await createCalendar({
        title: title.trim(),
        privacy,
      });

      const calendarId = resp?.calendar?.id_training_calendar;
      if (!calendarId) throw new Error('Invalid calendar');

      await selectCalendar(calendarId);

      let order = 1;

      for (const item of selectedTrainings) {
        if (item.type === 'none') {
          order += 1; // 🔑 skip this order number
          continue;
        }

        await addTrainingToCalendar(calendarId, {
          id_trainings: item.id_trainings,
          order,
        });

        order += 1;
      }

      setSuccess('Calendar created successfully!');
      nav.goBack();
    } catch (e) {
      console.warn(e);
      setError('Failed to create calendar.');
    } finally {
      setCreatingCalendarLoading(false);
    }
  }, [title, privacy, selectedTrainings, nav]);

  /* -------------------------------- Render --------------------------------- */
  return (
    <Box className="flex-1 bg-gradient-to-b from-gray-50 to-white">
      <VStack className="flex-1">
        {/* Header */}
        <Box className="bg-white border-b border-gray-100 px-6 py-6 shadow-sm">
          <Text className="text-3xl font-bold text-gray-900">New Calendar</Text>
          <Text className="text-gray-500 mt-1">Build your training program</Text>
        </Box>

        {/* Main Content */}
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={false}
          scrollEnabled={true}
        >
          <VStack className="gap-8">
            {/* Title Input Section */}
            <VStack className="gap-3">
              <VStack className="gap-1">
                <Text className="text-lg font-semibold text-gray-900">
                  Calendar Name
                </Text>
                <Text className="text-sm text-gray-500">
                  Give your calendar a meaningful name
                </Text>
              </VStack>
              <Box className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                <Input className="bg-white">
                  <InputField
                    placeholder="e.g., Boxing Program, Summer Training"
                    value={title}
                    onChangeText={setTitle}
                    className="px-4 py-1 text-base"
                  />
                </Input>
              </Box>
            </VStack>

            {/* Privacy Section */}
            <VStack className="gap-3">
              <VStack className="gap-1">
                <Text className="text-lg font-semibold text-gray-900">
                  Privacy
                </Text>
                <Text className="text-sm text-gray-500">
                  Choose who can view your calendar
                </Text>
              </VStack>
              <HStack className="gap-3">
                {(['private', 'public'] as const).map((p) => (
                  <Pressable
                    key={p}
                    className={`flex-1 rounded-lg px-4 py-3 border-2 transition-all ${
                      privacy === p
                        ? 'bg-gray-900 border-gray-900'
                        : 'bg-white border-gray-200'
                    }`}
                    onPress={() => setPrivacy(p)}
                  >
                    <Text
                      className={`text-center font-semibold capitalize ${
                        privacy === p
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}
                    >
                      {p === 'private' ? 'Private' : 'Public'}
                    </Text>
                  </Pressable>
                ))}
              </HStack>
            </VStack>

            {/* Add Training Section */}
            <VStack className="gap-3">
              <VStack className="gap-1">
                <Text className="text-lg font-semibold text-gray-900">
                  Build Your Program
                </Text>
                <Text className="text-sm text-gray-500">
                  Add trainings in order (you can skip days)
                </Text>
              </VStack>

              <Box className="bg-gradient-to-br from-blue-50 to-blue-50 border border-blue-100 rounded-lg p-4 gap-3">
                <VStack className="gap-3">
                  {/* Training Dropdown */}
                  <Pressable
                    className="border border-blue-200 bg-white rounded-lg px-4 py-3 flex-row justify-between items-center"
                    onPress={() => setDropdownOpen(true)}
                  >
                    <Text className={`text-base ${selectedTrainingLabel ? 'text-gray-900' : 'text-gray-500'}`}>
                      {selectedTrainingLabel || 'Select a training…'}
                    </Text>
                  </Pressable>

                  {/* Dropdown Modal */}
                  <Modal
                    visible={dropdownOpen}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setDropdownOpen(false)}
                  >
                    <Pressable
                      className="flex-1"
                      onPress={() => setDropdownOpen(false)}
                    >
                      <VStack className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-96 overflow-hidden">
                        <VStack className="p-4 border-b border-gray-200">
                          <Text className="text-lg font-semibold text-gray-900">Select Training</Text>
                        </VStack>
                        <FlatList
                          data={[
                            { label: 'None (skip this day)', value: 'none' },
                            ...trainings.map((t) => ({
                              label: t.title,
                              value: String(t.id_trainings),
                            })),
                          ]}
                          keyExtractor={(item) => String(item.value)}
                          renderItem={({ item }) => (
                            <Pressable
                              className="px-4 py-3 border-b border-gray-100 active:bg-blue-50"
                              onPress={() => {
                                setSelectedExistingTraining(
                                  item.value === 'none' ? 'none' : Number(item.value)
                                );
                                setSelectedTrainingLabel(item.label);
                                setDropdownOpen(false);
                              }}
                            >
                              <Text className="text-gray-900 text-base">{item.label}</Text>
                            </Pressable>
                          )}
                        />
                      </VStack>
                    </Pressable>
                  </Modal>

                  <Pressable
                    className="rounded-lg px-4 py-4 items-center justify-center active:scale-95 transition-all"
                    style={{
                      backgroundColor: selectedExistingTraining ? colors.primary.main : colors.neutral[300],
                      opacity: selectedExistingTraining ? 1 : 0.5,
                      transform: [{ scale: selectedExistingTraining ? 1.02 : 1 }],
                    }}
                    onPress={addTrainingToList}
                    disabled={!selectedExistingTraining}
                  >
                    <Text className="text-white font-bold text-base">
                      Add to Schedule
                    </Text>
                  </Pressable>
                </VStack>
              </Box>
            </VStack>

            {/* Selected Trainings List */}
            <VStack className="gap-3">
              <VStack className="gap-1">
                <Text className="text-lg font-semibold text-gray-900">
                  Your Schedule ({selectedTrainings.length})
                </Text>
                {selectedTrainings.length === 0 && (
                  <Text className="text-sm text-gray-400">
                    Add trainings to build your calendar
                  </Text>
                )}
              </VStack>

              {selectedTrainings.length > 0 ? (
                <VStack className="gap-2 bg-gray-50 rounded-xl p-4 border border-gray-100">
                  {selectedTrainings.map((t, i) => (
                    <HStack
                      key={i}
                      className="justify-between items-center bg-white rounded-lg px-4 py-3 border border-gray-100 active:bg-gray-50"
                    >
                      <HStack className="flex-1 items-center gap-3">
                        <Box className="w-8 h-8 rounded-full bg-blue-600 items-center justify-center">
                          <Text className="text-white font-bold text-sm">
                            {i + 1}
                          </Text>
                        </Box>
                        <VStack className="flex-1">
                          <Text className="font-semibold text-gray-900">
                            {t.title}
                          </Text>
                          {t.type === 'none' && (
                            <Text className="text-xs text-gray-500 mt-0.5">
                              Rest day - order skipped
                            </Text>
                          )}
                        </VStack>
                      </HStack>

                      <HStack className="gap-2">
                        <Pressable
                          className={`px-3 py-2 rounded-lg transition-all font-semibold ${
                            i > 0
                              ? 'active:opacity-90'
                              : 'opacity-60'
                          }`}
                          style={{
                            backgroundColor: i > 0 ? colors.neutral[600] : colors.neutral[300],
                          }}
                          onPress={() => moveTraining(i, 'up')}
                          disabled={i === 0}
                        >
                          <Text className="text-white text-sm">▲</Text>
                        </Pressable>
                        <Pressable
                          className={`px-3 py-2 rounded-lg transition-all font-semibold ${
                            i < selectedTrainings.length - 1
                              ? 'active:opacity-90'
                              : 'opacity-60'
                          }`}
                          style={{
                            backgroundColor: i < selectedTrainings.length - 1 ? colors.neutral[600] : colors.neutral[300],
                          }}
                          onPress={() => moveTraining(i, 'down')}
                          disabled={i === selectedTrainings.length - 1}
                        >
                          <Text className="text-white text-sm">▼</Text>
                        </Pressable>
                        <Pressable
                          className="px-3 py-2 rounded-lg active:opacity-90 transition-opacity"
                          style={{
                            backgroundColor: colors.error.main,
                          }}
                          onPress={() => removeTraining(i)}
                        >
                          <Text className="text-white font-semibold text-sm">×</Text>
                        </Pressable>
                      </HStack>
                    </HStack>
                  ))}
                </VStack>
              ) : (
                <Box className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-dashed border-gray-300 items-center justify-center py-8">
                  <Text className="text-gray-600 font-semibold">
                    No trainings yet
                  </Text>
                  <Text className="text-gray-500 text-sm mt-1 text-center">
                    Add your first training to get started
                  </Text>
                </Box>
              )}
            </VStack>

            {/* Error/Success Messages */}
            {error && (
              <Box className="bg-red-50 border border-red-200 rounded-lg p-4">
                <Text className="text-red-700 font-semibold">{error}</Text>
              </Box>
            )}

            {success && (
              <Box className="bg-green-50 border border-green-200 rounded-lg p-4">
                <Text className="text-green-700 font-semibold">
                  {success}
                </Text>
              </Box>
            )}

            {/* Create Button */}
            <VStack className="gap-2 mt-4">
              <Pressable
                className="rounded-xl px-6 py-5 items-center justify-center"
                style={{
                  backgroundColor: creatingCalendarLoading || selectedTrainings.length === 0
                    ? colors.neutral[300]
                    : colors.success.dark,
                  opacity: creatingCalendarLoading || selectedTrainings.length === 0 ? 0.65 : 1,
                }}
                onPress={finalizeCalendarCreation}
                disabled={
                  creatingCalendarLoading || selectedTrainings.length === 0
                }
              >
                {creatingCalendarLoading ? (
                  <HStack className="gap-3 items-center justify-center">
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text className="text-white font-bold text-base">Creating…</Text>
                  </HStack>
                ) : (
                  <Text className="text-white font-bold text-lg">
                    Create Calendar
                  </Text>
                )}
              </Pressable>
              <Pressable
                className="rounded-lg px-6 py-3 items-center justify-center"
                style={{
                  backgroundColor: colors.neutral[200],
                  opacity: creatingCalendarLoading ? 0.5 : 1,
                }}
                onPress={() => nav.goBack()}
                disabled={creatingCalendarLoading}
              >
                <Text style={{ color: colors.text.primary }} className="font-semibold">Cancel</Text>
              </Pressable>
            </VStack>
          </VStack>
        </ScrollView>
      </VStack>
    </Box>
  );
}
