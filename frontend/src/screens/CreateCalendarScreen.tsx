import React, { useState, useEffect } from 'react';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { createCalendar, selectCalendar, getTrainings, listDrills, listCombinations, listTechniques, createTraining, addTrainingComponent, addTrainingToCalendar } from '../api/trainingCalendars';
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
} from "@/components/ui/select";
import { ChevronDownIcon } from '@/components/ui/icon';

export default function CreateCalendarScreen() {
  const [title, setTitle] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('private');
  const [createdCalendar, setCreatedCalendar] = useState<any | null>(null);

  const [trainings, setTrainings] = useState<any[]>([]);
  const [drills, setDrills] = useState<any[]>([]);
  const [combinations, setCombinations] = useState<any[]>([]);
  const [techniques, setTechniques] = useState<any[]>([]);

  const [selectedExistingTraining, setSelectedExistingTraining] = useState<number | null>(null);
  const [orderForExisting, setOrderForExisting] = useState<number>(1);
  const [iconNameForExisting, setIconNameForExisting] = useState<string | null>(null);

  // custom training state
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [components, setComponents] = useState<any[]>([]);
  const [componentType, setComponentType] = useState<'drill' | 'combination'>('drill');
  const [componentSelectedId, setComponentSelectedId] = useState<number | null>(null);
  const [componentMode, setComponentMode] = useState<'reps' | 'time'>('reps');
  const [componentRepsOrTime, setComponentRepsOrTime] = useState<number | null>(null);
  const [componentSets, setComponentSets] = useState<number | null>(null);
  const [orderForCustom, setOrderForCustom] = useState<number>(1);
  const [iconNameForCustom, setIconNameForCustom] = useState<string | null>(null);

  const nav = useNavigation();

  useEffect(() => {
    (async () => {
      try {
        const t = await getTrainings();
        setTrainings(t.trainings || []);
      } catch (e) {}
      try {
        const d = await listDrills();
        setDrills(d.drills || []);
      } catch (e) {}
      try {
        const c = await listCombinations();
        setCombinations(c.combinations || []);
      } catch (e) {}
      try {
        const tc = await listTechniques();
        setTechniques(tc.techniques || []);
      } catch (e) {}
    })();
  }, []);

  const createAndSelect = async () => {
    try {
      const resp = await createCalendar({ title, privacy });
      await selectCalendar(resp.calendar.id_training_calendar);
      setCreatedCalendar(resp.calendar);
    } catch (e) {}
  };

  const addExistingToCalendar = async () => {
    if (!createdCalendar || !selectedExistingTraining) return;
    try {
      await addTrainingToCalendar(createdCalendar.id_training_calendar, {
        id_trainings: selectedExistingTraining,
        order: orderForExisting,
        icon_name: iconNameForExisting,
      });
      nav.goBack();
    } catch (e) {}
  };

  const addComponentToLocal = () => {
    if (!componentSelectedId) return;
    setComponents((s) => [
      ...s,
      {
        type: componentType,
        id: componentSelectedId,
        mode: componentMode,
        value: componentRepsOrTime,
        sets: componentSets,
      },
    ]);
    // reset fields
    setComponentSelectedId(null);
    setComponentRepsOrTime(null);
    setComponentSets(null);
  };

  const createCustomTrainingAndAdd = async () => {
    if (!createdCalendar) return;
    try {
      const resp = await createTraining({ title: customTitle || 'Custom Training', description: customDescription });
      const trainingId = resp.training.id_trainings || resp.training.id;
      // add components
      for (const c of components) {
        const payload: any = {};
        if (c.type === 'drill') payload.id_drills = c.id;
        if (c.type === 'combination') payload.id_combinations = c.id;
        if (c.mode === 'reps') payload.reps = c.value;
        else payload.length = c.value; // seconds
        if (c.sets !== undefined && c.sets !== null) payload.sets = c.sets;
        await addTrainingComponent(Number(trainingId), payload);
      }
      // add to calendar
      await addTrainingToCalendar(createdCalendar.id_training_calendar, {
        id_trainings: Number(trainingId),
        order: orderForCustom,
        icon_name: iconNameForCustom,
      });
      nav.goBack();
    } catch (e) {}
  };

  return (
    <Box className="flex-1 bg-white px-4 py-4">
      <VStack className="gap-3">
        <Text className="text-lg font-semibold">Create Training Calendar</Text>
        <Input variant="outline" className="flex-1">
          <InputField placeholder="Calendar title" value={title} onChangeText={(v: string) => setTitle(v)} />
        </Input>

        <HStack className="gap-2">
          <Pressable className={`px-3 py-2 rounded ${privacy === 'private' ? 'bg-gray-800' : 'bg-gray-200'}`} onPress={() => setPrivacy('private')}>
            <Text className={`${privacy === 'private' ? 'text-white' : 'text-gray-800'}`}>Private</Text>
          </Pressable>
          <Pressable className={`px-3 py-2 rounded ${privacy === 'public' ? 'bg-gray-800' : 'bg-gray-200'}`} onPress={() => setPrivacy('public')}>
            <Text className={`${privacy === 'public' ? 'text-white' : 'text-gray-800'}`}>Public</Text>
          </Pressable>
        </HStack>

        <Pressable
          className="bg-blue-600 rounded px-4 py-2.5 items-center justify-center"
          onPress={createAndSelect}
        >
          <Text className="text-white">Create and continue</Text>
        </Pressable>

        {createdCalendar && (
          <>
            <Text className="text-base font-semibold">Add existing training to this calendar</Text>
            <HStack className="gap-2">
              <VStack>
                <Text>Select Training:</Text>
                <Select
                  selectedValue={selectedExistingTraining ? String(selectedExistingTraining) : ""}
                  onValueChange={(value) =>
                    setSelectedExistingTraining(value ? Number(value) : null)
                  }
                >
                  <SelectTrigger>
                    <SelectInput placeholder="-- select training --" />
                    <SelectIcon>
                      <ChevronDownIcon />
                    </SelectIcon>
                  </SelectTrigger>
                
                  <SelectPortal>
                    <SelectBackdrop />
                    <SelectContent>
                      <SelectItem label="-- select training --" value="" />
                      {trainings.map((t) => (
                        <SelectItem
                          key={t.id_trainings}
                          label={t.title}
                          value={String(t.id_trainings)}
                        />
                      ))}
                    </SelectContent>
                  </SelectPortal>
                </Select>
              </VStack>
              <VStack>
                <Text>Order:</Text>
                <Input className="flex-1">
                  <InputField placeholder="order" keyboardType="numeric" value={String(orderForExisting)} onChangeText={(v: string) => setOrderForExisting(Number(v || 1))} />
                </Input>
              </VStack>
              <VStack>
              <Text>Icon:</Text>
                <HStack className="gap-2">
                  <Input className="flex-1">
                    <InputField placeholder="icon name (optional)" value={iconNameForExisting || ''} onChangeText={(v: string) => setIconNameForExisting(v || null)} />
                  </Input>
                  <Pressable className="bg-blue-600 rounded px-3 py-2" onPress={addExistingToCalendar}><Text className="text-white">Add</Text></Pressable>
                </HStack>
              </VStack>
            </HStack>

            <Text className="text-base font-semibold mt-4">Or create a custom training</Text>
            <Input className="flex-1">
              <InputField placeholder="Training title" value={customTitle} onChangeText={(v: string) => setCustomTitle(v)} />
            </Input>
            <Input className="flex-1">
              <InputField placeholder="Description" value={customDescription} onChangeText={(v: string) => setCustomDescription(v)} />
            </Input>

            <HStack className="gap-2 items-center">
              <Text>Component type</Text>
              <Pressable className={`px-3 py-2 rounded ${componentType === 'drill' ? 'bg-gray-800' : 'bg-gray-200'}`} onPress={() => setComponentType('drill')}><Text className={`${componentType === 'drill' ? 'text-white' : 'text-gray-800'}`}>Drill</Text></Pressable>
              <Pressable className={`px-3 py-2 rounded ${componentType === 'combination' ? 'bg-gray-800' : 'bg-gray-200'}`} onPress={() => setComponentType('combination')}><Text className={`${componentType === 'combination' ? 'text-white' : 'text-gray-800'}`}>Combination</Text></Pressable>

              <Select
                selectedValue={componentSelectedId ? String(componentSelectedId) : ""}
                onValueChange={(value) =>
                  setComponentSelectedId(value ? Number(value) : null)
                }
              >
                <SelectTrigger>
                  <SelectInput placeholder="-- select --" />
                  <SelectIcon>
                    <ChevronDownIcon />
                  </SelectIcon>
                </SelectTrigger>
              
                <SelectPortal>
                  <SelectBackdrop />
                  <SelectContent>
                    <SelectItem label="-- select --" value="" />
              
                    {(componentType === "drill" ? drills : combinations).map((i) => {
                      const id =
                        componentType === "drill" ? i.id_drills : i.id_combinations;
                    
                      return (
                        <SelectItem
                          key={id}
                          value={String(id)}
                          label={i.title}
                        />
                      );
                    })}
                  </SelectContent>
                </SelectPortal>
              </Select>

              <Text>Mode</Text>
              <Pressable className={`px-2 py-1 rounded ${componentMode === 'reps' ? 'bg-gray-800' : 'bg-gray-200'}`} onPress={() => setComponentMode('reps')}><Text className={`${componentMode === 'reps' ? 'text-white' : 'text-gray-800'}`}>Reps</Text></Pressable>
              <Pressable className={`px-2 py-1 rounded ${componentMode === 'time' ? 'bg-gray-800' : 'bg-gray-200'}`} onPress={() => setComponentMode('time')}><Text className={`${componentMode === 'time' ? 'text-white' : 'text-gray-800'}`}>Time</Text></Pressable>

              <Input className="w-24">
                <InputField placeholder={componentMode === 'reps' ? 'reps' : 'seconds'} keyboardType="numeric" value={componentRepsOrTime ? String(componentRepsOrTime) : ''} onChangeText={(v: string) => setComponentRepsOrTime(Number(v || 0))} />
              </Input>
              <Input className="w-20">
                <InputField placeholder="sets" keyboardType="numeric" value={componentSets ? String(componentSets) : ''} onChangeText={(v: string) => setComponentSets(Number(v || 0))} />
              </Input>

              <Pressable className="bg-gray-800 rounded px-3 py-2" onPress={addComponentToLocal}><Text className="text-white">Add</Text></Pressable>
            </HStack>

            <VStack className="mt-3">
              <Text className="font-semibold mb-2">Components:</Text>
              {components.map((c, i) => (
                <Text key={i} className="text-gray-700 mt-1">- {(c.type === 'drill' ? (drills.find(d => d.id_drills === c.id)?.title) : (combinations.find(d => d.id_combinations === c.id)?.title))} {c.sets ? `(${c.sets} sets)` : ''} {c.mode === 'reps' ? ` ${c.value} reps` : ` ${c.value}s`}</Text>
              ))}
            </VStack>

            <HStack className="gap-2 items-center mt-3">
              <Input className="w-24">
                <InputField placeholder="order" keyboardType="numeric" value={String(orderForCustom)} onChangeText={(v: string) => setOrderForCustom(Number(v || 1))} />
              </Input>
              <Input className="flex-1">
                <InputField placeholder="icon name (optional)" value={iconNameForCustom || ''} onChangeText={(v: string) => setIconNameForCustom(v || null)} />
              </Input>
              <Pressable className="bg-blue-600 rounded px-3 py-2" onPress={createCustomTrainingAndAdd}><Text className="text-white">Create & Add</Text></Pressable>
            </HStack>
          </>
        )}
      </VStack>
    </Box>
  );
}
