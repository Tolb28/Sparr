import React, { useCallback, useEffect, useState } from 'react';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import {
  createCalendar,
  selectCalendar,
  getTrainings,
  addTrainingToCalendar,
} from '../api/trainingCalendars';
import { useNavigation } from '@react-navigation/native';
import {
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
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
    <Box className="flex-1 bg-white px-4 py-4">
      <VStack className="gap-4">
        <Text className="text-lg font-semibold">Create Training Calendar</Text>

        <Input>
          <InputField placeholder="Calendar title" value={title} onChangeText={setTitle} />
        </Input>

        <HStack className="gap-2">
          {(['private', 'public'] as const).map((p) => (
            <Pressable
              key={p}
              className={`px-3 py-2 rounded ${
                privacy === p ? 'bg-gray-800' : 'bg-gray-200'
              }`}
              onPress={() => setPrivacy(p)}
            >
              <Text className={privacy === p ? 'text-white' : 'text-gray-800'}>
                {p}
              </Text>
            </Pressable>
          ))}
        </HStack>

        {/* Add Training */}
        <VStack className="gap-2 bg-gray-50 p-3 rounded">
          <Text className="font-semibold">Add item</Text>

          <Select
            selectedValue={
              selectedExistingTraining ? String(selectedExistingTraining) : ''
            }
            onValueChange={(v) =>
              setSelectedExistingTraining(v === 'none' ? 'none' : Number(v))
            }
          >
            <SelectTrigger>
              <SelectInput placeholder="Select training or None" />
              <SelectIcon>
                <ChevronDownIcon />
              </SelectIcon>
            </SelectTrigger>

            <SelectPortal>
              <SelectBackdrop />
              <SelectContent>
                <SelectItem label="None (skip order)" value="none" />
                {trainings.map((t) => (
                  <SelectItem
                    key={t.id_trainings}
                    value={String(t.id_trainings)}
                    label={t.title}
                  />
                ))}
              </SelectContent>
            </SelectPortal>
          </Select>

          <Pressable className="bg-blue-600 rounded px-3 py-2" onPress={addTrainingToList}>
            <Text className="text-white">Add</Text>
          </Pressable>
        </VStack>

        {/* Selected list */}
        <VStack className="gap-2">
          <Text className="font-semibold">Calendar order</Text>

          {selectedTrainings.map((t, i) => (
            <HStack
              key={i}
              className="justify-between items-center bg-white p-2 rounded"
            >
              <Text>
                {i + 1}. {t.title}
                {t.type === 'none' ? ' (skips)' : ''}
              </Text>

              <HStack className="gap-1">
                <Pressable onPress={() => moveTraining(i, 'up')}>
                  <Text>↑</Text>
                </Pressable>
                <Pressable onPress={() => moveTraining(i, 'down')}>
                  <Text>↓</Text>
                </Pressable>
                <Pressable onPress={() => removeTraining(i)}>
                  <Text className="text-red-600">Remove</Text>
                </Pressable>
              </HStack>
            </HStack>
          ))}
        </VStack>

        <Pressable
          className={`rounded px-4 py-3 items-center ${
            creatingCalendarLoading ? 'bg-gray-300' : 'bg-green-600'
          }`}
          onPress={finalizeCalendarCreation}
        >
          <Text className="text-white">
            {creatingCalendarLoading ? 'Creating…' : 'Create Calendar'}
          </Text>
        </Pressable>

        {error && <Text className="text-red-600">{error}</Text>}
        {success && <Text className="text-green-600">{success}</Text>}
      </VStack>
    </Box>
  );
}
