import React, { useCallback, useEffect, useState } from 'react';
import { Text } from '@/components/ui/text';
import { GlassCard } from '@/components/ui/glass-card';
import { SparrButton } from '@/components/ui/sparr-button';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { getTrainings } from '../api/trainingCalendars';
import { createClubCalendarFull } from '../api/clubs';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { FlatList, ActivityIndicator, Modal, ScrollView, TextInput, View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TrainingPreviewCard from '../components/TrainingPreviewCard';
import DatePickerField from '../components/DatePickerField';
import CalendarTypeSelector from '../components/CalendarTypeSelector';
import WeekDayGrid, { DaySlot } from '../components/WeekDayGrid';
import OrderSlotGroup, { OrderSlotData, OrderSlotTraining } from '../components/OrderSlotGroup';
import { RootStackParamList } from '../navigation/AppNavigator';

/* ---------------------------------- Types --------------------------------- */
type RouteType = RouteProp<RootStackParamList, 'CreateClubCalendar'>;

type ScheduleSlot =
  | { type: 'training'; id_trainings: number; title: string; component_count: number; estimated_duration_seconds: number }
  | { type: 'rest'; title: 'Rest Day' }
  | { type: 'special_event'; event_title: string; event_description: string; event_starts_at: string; event_ends_at: string };

const START_DATE_OPTIONS = [
  { key: 'today', label: 'Today' },
  { key: 'year_start', label: 'Start of Year' },
  { key: 'custom', label: 'Choose Date' },
] as const;

/* -------------------------------- Component ------------------------------- */
export default function CreateClubCalendarScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const route = useRoute<RouteType>();
  const { clubId } = route.params;

  const [title, setTitle] = useState('');
  const [calendarType, setCalendarType] = useState<'day' | 'order'>('order');

  // Order-oriented state
  const [orderSlots, setOrderSlots] = useState<OrderSlotData[]>([]);
  const [startDateOption, setStartDateOption] = useState<'today' | 'year_start' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState('');

  // Day-oriented state
  const [numWeeks, setNumWeeks] = useState(1);
  const [activeWeek, setActiveWeek] = useState(1);
  const [daySchedule, setDaySchedule] = useState<Record<number, Record<number, DaySlot[]>>>({});

  const [trainings, setTrainings] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [creatingCalendarLoading, setCreatingCalendarLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Context for which slot the picker is adding to
  const [pickerContext, setPickerContext] = useState<
    | { mode: 'order'; order?: number }
    | { mode: 'day'; weekNumber: number; dayOfWeek: number }
    | null
  >(null);

  // Special event modal
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventStartsAt, setEventStartsAt] = useState('');
  const [eventEndsAt, setEventEndsAt] = useState('');

  /* ------------------------------ Load Trainings ---------------------------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingData(true);
        const resp = await getTrainings();
        if (mounted) setTrainings(resp?.trainings || []);
      } catch { setError('Failed to load trainings.'); }
      finally { if (mounted) setLoadingData(false); }
    })();
    return () => { mounted = false; };
  }, []);

  /* ------------------------------ Picker helpers ----------------------------- */
  const filteredTrainings = trainings.filter(t =>
    !searchQuery.trim() || t.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openPickerForOrder = (order?: number) => {
    setPickerContext({ mode: 'order', order });
    setPickerOpen(true);
    setSearchQuery('');
  };

  const openPickerForDay = (weekNumber: number, dayOfWeek: number) => {
    setPickerContext({ mode: 'day', weekNumber, dayOfWeek });
    setPickerOpen(true);
    setSearchQuery('');
  };

  const handlePickTraining = (training: any) => {
    const slot: OrderSlotTraining & DaySlot = {
      id_trainings: training.id_trainings,
      title: training.title,
      component_count: training.component_count ?? 0,
      estimated_duration_seconds: training.estimated_duration_seconds ?? 0,
      start_time: null,
      _key: `${training.id_trainings}-${Date.now()}`,
    };

    if (pickerContext?.mode === 'order') {
      if (pickerContext.order !== undefined) {
        setOrderSlots(prev => prev.map(s =>
          s.order === pickerContext.order ? { ...s, trainings: [...s.trainings, slot] } : s
        ));
      } else {
        const nextOrder = orderSlots.length > 0 ? Math.max(...orderSlots.map(s => s.order)) + 1 : 1;
        setOrderSlots(prev => [...prev, { type: 'training', order: nextOrder, trainings: [slot] }]);
      }
    } else if (pickerContext?.mode === 'day') {
      const { weekNumber, dayOfWeek } = pickerContext;
      setDaySchedule(prev => {
        const updated = { ...prev };
        if (!updated[weekNumber]) updated[weekNumber] = {};
        if (!updated[weekNumber][dayOfWeek]) updated[weekNumber][dayOfWeek] = [];
        updated[weekNumber] = { ...updated[weekNumber] };
        updated[weekNumber][dayOfWeek] = [...updated[weekNumber][dayOfWeek], slot];
        return updated;
      });
    }
    setPickerOpen(false);
  };

  /* ------------------------------ Order helpers ----------------------------- */
  const addRestDay = () => {
    const nextOrder = orderSlots.length > 0 ? Math.max(...orderSlots.map(s => s.order)) + 1 : 1;
    setOrderSlots(prev => [...prev, { type: 'rest', order: nextOrder, trainings: [] }]);
  };

  const openSpecialEventModal = () => {
    setEventTitle('');
    setEventDescription('');
    setEventStartsAt('');
    setEventEndsAt('');
    setEventModalOpen(true);
  };

  const handleAddSpecialEvent = () => {
    if (!eventTitle.trim()) return;
    const nextOrder = orderSlots.length > 0 ? Math.max(...orderSlots.map(s => s.order)) + 1 : 1;
    setOrderSlots(prev => [...prev, {
      type: 'special_event' as const,
      order: nextOrder,
      trainings: [],
      event_title: eventTitle.trim(),
      event_description: eventDescription.trim(),
      event_starts_at: eventStartsAt.trim(),
      event_ends_at: eventEndsAt.trim(),
    } as any]);
    setEventModalOpen(false);
  };

  const moveOrderSlot = (index: number, direction: 'up' | 'down') => {
    setOrderSlots(prev => {
      const list = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= list.length) return prev;
      [list[index], list[target]] = [list[target], list[index]];
      return list.map((s, i) => ({ ...s, order: i + 1 }));
    });
  };

  const removeOrderSlot = (index: number) => {
    setOrderSlots(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 })));
  };

  const removeOrderTraining = (order: number, trainingIdx: number) => {
    setOrderSlots(prev => prev.map(s => {
      if (s.order !== order) return s;
      const updated = s.trainings.filter((_, i) => i !== trainingIdx);
      return { ...s, trainings: updated };
    }));
  };

  const handleOrderTimeChange = (order: number, trainingIdx: number, time: string | null) => {
    setOrderSlots(prev => prev.map(s => {
      if (s.order !== order) return s;
      const trainingsUpdated = s.trainings.map((t, i) => i === trainingIdx ? { ...t, start_time: time } : t);
      return { ...s, trainings: trainingsUpdated };
    }));
  };

  /* ------------------------------ Day helpers ------------------------------- */
  const removeDaySlot = (weekNumber: number, dayOfWeek: number, slotIndex: number) => {
    setDaySchedule(prev => {
      const updated = { ...prev };
      if (!updated[weekNumber]?.[dayOfWeek]) return prev;
      updated[weekNumber] = { ...updated[weekNumber] };
      updated[weekNumber][dayOfWeek] = updated[weekNumber][dayOfWeek].filter((_, i) => i !== slotIndex);
      if (updated[weekNumber][dayOfWeek].length === 0) {
        const { [dayOfWeek]: _, ...rest } = updated[weekNumber];
        updated[weekNumber] = rest;
      }
      return updated;
    });
  };

  const handleDayTimeChange = (weekNumber: number, dayOfWeek: number, slotIndex: number, time: string | null) => {
    setDaySchedule(prev => {
      const updated = { ...prev };
      if (!updated[weekNumber]?.[dayOfWeek]) return prev;
      updated[weekNumber] = { ...updated[weekNumber] };
      updated[weekNumber][dayOfWeek] = updated[weekNumber][dayOfWeek].map((s, i) =>
        i === slotIndex ? { ...s, start_time: time } : s
      );
      return updated;
    });
  };

  /* ------------------------------ Compute start date ----------------------- */
  const computeOrderStartDate = (): string | null => {
    if (startDateOption === 'today') {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    if (startDateOption === 'year_start') {
      return `${new Date().getFullYear()}-01-01`;
    }
    if (startDateOption === 'custom' && customStartDate.trim()) {
      return customStartDate.trim();
    }
    return null;
  };

  /* ------------------------------ Count helpers ----------------------------- */
  const dayScheduleCount = Object.values(daySchedule).reduce(
    (total, week) => total + Object.values(week).reduce((wt, slots) => wt + slots.length, 0), 0
  );

  /* ---------------------------- Submit -------------------------------- */
  const finalizeCalendarCreation = useCallback(async () => {
    setError(null);
    if (!title.trim()) { setError('Please enter a calendar title.'); return; }

    if (calendarType === 'order' && orderSlots.length === 0) {
      setError('Add at least one day.'); return;
    }
    if (calendarType === 'order' && startDateOption === 'custom' && !customStartDate.trim()) {
      setError('Please select a start date.'); return;
    }
    if (calendarType === 'day' && dayScheduleCount === 0) {
      setError('Add at least one training to a day.'); return;
    }

    try {
      setCreatingCalendarLoading(true);
      const orderStartDate = calendarType === 'order' ? computeOrderStartDate() : null;

      // Build the slots array for the full creation endpoint
      const slots: any[] = [];

      if (calendarType === 'order') {
        for (const slot of orderSlots) {
          if ((slot as any).type === 'special_event') {
            const se = slot as any;
            slots.push({
              type: 'special_event',
              order: slot.order,
              event_title: se.event_title,
              event_description: se.event_description,
              event_starts_at: se.event_starts_at || undefined,
              event_ends_at: se.event_ends_at || undefined,
            });
            continue;
          }
          if (slot.type === 'rest') {
            slots.push({ type: 'rest', order: slot.order });
            continue;
          }
          for (const t of slot.trainings) {
            slots.push({
              type: 'training',
              id_trainings: t.id_trainings,
              order: slot.order,
              start_time: t.start_time,
            });
          }
        }
      } else {
        for (const [weekStr, weekData] of Object.entries(daySchedule)) {
          const weekNumber = Number(weekStr);
          for (const [dayStr, daySlots] of Object.entries(weekData)) {
            const dayOfWeek = Number(dayStr);
            for (let i = 0; i < daySlots.length; i++) {
              const s = daySlots[i];
              slots.push({
                type: 'training',
                id_trainings: s.id_trainings,
                week_number: weekNumber,
                day_of_week: dayOfWeek,
                order: i + 1,
                start_time: s.start_time,
              });
            }
          }
        }
      }

      await createClubCalendarFull(clubId, {
        title: title.trim(),
        calendar_type: calendarType,
        num_weeks: calendarType === 'day' ? numWeeks : 1,
        order_start_date: orderStartDate,
        slots,
      });

      nav.goBack();
    } catch (e: any) {
      console.warn(e);
      const msg = e?.message || '';
      if (msg.includes('title')) setError('Calendar title is required.');
      else if (msg.includes('training')) setError('Please add at least one training.');
      else setError(msg || 'Something went wrong. Check that all fields are filled in.');
    } finally {
      setCreatingCalendarLoading(false);
    }
  }, [title, calendarType, orderSlots, daySchedule, numWeeks, startDateOption, customStartDate, nav, clubId]);

  /* -------------------------------- Render --------------------------------- */
  return (
    <View style={[styles.root, { backgroundColor: c.background.secondary }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: (insets.top || 0) + 8, borderBottomColor: c.border.light }]}>
        <Pressable onPress={() => nav.goBack()} style={[styles.iconBtn, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]}>
          <Ionicons name="chevron-back" size={20} color={c.text.primary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: c.text.primary }]}>New Club Calendar</Text>
          <Text style={[styles.headerSub, { color: c.text.tertiary }]}>Build a training plan for your club</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Calendar Name */}
        <GlassCard variant="medium" radius={14} padding={16}>
          <Text style={[styles.label, { color: c.text.primary }]}>Calendar Name</Text>
          <Text style={[styles.hint, { color: c.text.tertiary }]}>Give your club calendar a meaningful name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.glass.surface, borderColor: c.glass.border, color: c.text.primary }]}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Beginner Boxing 8-Week, Summer Camp"
            placeholderTextColor={c.text.tertiary}
          />
        </GlassCard>

        {/* Calendar Type Selector */}
        <CalendarTypeSelector value={calendarType} onChange={setCalendarType} />

        {/* =================== ORDER-ORIENTED BUILDER =================== */}
        {calendarType === 'order' && (
          <>
            {/* Start Date */}
            <GlassCard variant="medium" radius={14} padding={16}>
              <Text style={[styles.label, { color: c.text.primary }]}>Start Date</Text>
              <Text style={[styles.hint, { color: c.text.tertiary }]}>When does the cycle begin counting?</Text>
              <View style={styles.startDateRow}>
                {START_DATE_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={[
                      styles.startDateBtn,
                      { borderColor: c.glass.border, backgroundColor: c.glass.surface },
                      startDateOption === opt.key && { borderColor: c.primary.main, backgroundColor: c.glass.redSurface },
                    ]}
                    onPress={() => setStartDateOption(opt.key)}
                  >
                    <Text style={[
                      styles.startDateText,
                      { color: c.text.secondary },
                      startDateOption === opt.key && { color: c.primary.main },
                    ]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {startDateOption === 'custom' && (
                <View style={{ marginTop: 10 }}>
                  <DatePickerField
                    value={customStartDate}
                    onChange={setCustomStartDate}
                    placeholder="Tap to select date"
                  />
                </View>
              )}
            </GlassCard>

            {/* Schedule Builder */}
            <GlassCard variant="medium" radius={14} padding={16}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.label, { color: c.text.primary }]}>Your Schedule ({orderSlots.length} days)</Text>
                  <Text style={[styles.hint, { color: c.text.tertiary }]}>Add trainings, rest days, or special events</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <Pressable style={[styles.addBtn, { backgroundColor: c.primary.main }]} onPress={() => openPickerForOrder()}>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.addBtnText}>Add Training</Text>
                </Pressable>
                <Pressable style={[styles.restBtn, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]} onPress={addRestDay}>
                  <Ionicons name="bed-outline" size={16} color={c.text.secondary} />
                  <Text style={[styles.restBtnText, { color: c.text.secondary }]}>Rest Day</Text>
                </Pressable>
                <Pressable style={[styles.eventBtn, { backgroundColor: c.glass.redSurface, borderColor: c.glass.redBorder }]} onPress={openSpecialEventModal}>
                  <Ionicons name="star-outline" size={16} color={c.primary.main} />
                  <Text style={[styles.eventBtnText, { color: c.primary.main }]}>Special Event</Text>
                </Pressable>
              </View>

              {orderSlots.length === 0 ? (
                <View style={styles.emptySchedule}>
                  <Ionicons name="calendar-outline" size={32} color={c.text.tertiary} />
                  <Text style={[styles.emptyScheduleTitle, { color: c.text.secondary }]}>No days yet</Text>
                  <Text style={[styles.emptyScheduleSub, { color: c.text.tertiary }]}>Add trainings to build your program</Text>
                </View>
              ) : (
                orderSlots.map((slot, i) => {
                  if ((slot as any).type === 'special_event') {
                    const se = slot as any;
                    return (
                      <GlassCard key={`event-${slot.order}`} variant="medium" radius={10} padding={12}>
                        <View style={styles.eventSlotRow}>
                          <View style={styles.eventBadge}>
                            <Ionicons name="star" size={14} color="#fff" />
                          </View>
                          <View style={styles.flex1}>
                            <Text style={[styles.eventSlotTitle, { color: c.text.primary }]}>⭐ {se.event_title}</Text>
                            {se.event_description ? <Text style={[styles.eventSlotSub, { color: c.text.secondary }]}>{se.event_description}</Text> : null}
                            {se.event_starts_at ? <Text style={[styles.eventSlotTime, { color: c.text.tertiary }]}>{se.event_starts_at}</Text> : null}
                          </View>
                          <View style={styles.scheduleActions}>
                            <Pressable
                              style={[styles.moveBtn, { backgroundColor: c.glass.medium }, i === 0 && styles.moveBtnDisabled]}
                              onPress={() => moveOrderSlot(i, 'up')}
                              disabled={i === 0}
                            >
                              <Ionicons name="chevron-up" size={12} color={c.text.secondary} />
                            </Pressable>
                            <Pressable
                              style={[styles.moveBtn, { backgroundColor: c.glass.medium }, i === orderSlots.length - 1 && styles.moveBtnDisabled]}
                              onPress={() => moveOrderSlot(i, 'down')}
                              disabled={i === orderSlots.length - 1}
                            >
                              <Ionicons name="chevron-down" size={12} color={c.text.secondary} />
                            </Pressable>
                            <Pressable style={[styles.removeBtn, { backgroundColor: c.glass.redSurface }]} onPress={() => removeOrderSlot(i)}>
                              <Ionicons name="close" size={12} color={c.primary.main} />
                            </Pressable>
                          </View>
                        </View>
                      </GlassCard>
                    );
                  }

                  return (
                    <OrderSlotGroup
                      key={`order-${slot.order}`}
                      slot={slot}
                      index={i}
                      total={orderSlots.length}
                      onAddTraining={(order) => openPickerForOrder(order)}
                      onRemoveTraining={removeOrderTraining}
                      onTimeChange={handleOrderTimeChange}
                      onMoveSlot={moveOrderSlot}
                      onRemoveSlot={removeOrderSlot}
                    />
                  );
                })
              )}
            </GlassCard>
          </>
        )}

        {/* =================== DAY-ORIENTED BUILDER =================== */}
        {calendarType === 'day' && (
          <>
            {/* Number of weeks */}
            <GlassCard variant="medium" radius={14} padding={16}>
              <Text style={[styles.label, { color: c.text.primary }]}>Rotation Length</Text>
              <Text style={[styles.hint, { color: c.text.tertiary }]}>How many weeks before the schedule repeats?</Text>
              <View style={styles.stepperRow}>
                <Pressable
                  style={[styles.stepperBtn, { backgroundColor: c.glass.surface, borderColor: c.glass.border }, numWeeks <= 1 && styles.stepperBtnDisabled]}
                  onPress={() => { if (numWeeks > 1) setNumWeeks(numWeeks - 1); }}
                  disabled={numWeeks <= 1}
                >
                  <Text style={[styles.stepperBtnText, { color: c.text.primary }]}>−</Text>
                </Pressable>
                <Text style={[styles.stepperValue, { color: c.text.primary }]}>{numWeeks} week{numWeeks > 1 ? 's' : ''}</Text>
                <Pressable
                  style={[styles.stepperBtn, { backgroundColor: c.glass.surface, borderColor: c.glass.border }, numWeeks >= 8 && styles.stepperBtnDisabled]}
                  onPress={() => { if (numWeeks < 8) setNumWeeks(numWeeks + 1); }}
                  disabled={numWeeks >= 8}
                >
                  <Text style={[styles.stepperBtnText, { color: c.text.primary }]}>+</Text>
                </Pressable>
              </View>
            </GlassCard>

            <WeekDayGrid
              numWeeks={numWeeks}
              schedule={daySchedule}
              activeWeek={activeWeek}
              onWeekChange={setActiveWeek}
              onAddTraining={openPickerForDay}
              onRemoveSlot={removeDaySlot}
              onTimeChange={handleDayTimeChange}
            />
          </>
        )}

        {/* Error */}
        {error && (
          <GlassCard variant="red" radius={12} padding={14}>
            <Text style={styles.errorText}>{error}</Text>
          </GlassCard>
        )}

        {/* Actions */}
        <SparrButton
          label="Create Club Calendar"
          variant="primary"
          loading={creatingCalendarLoading}
          disabled={calendarType === 'order' ? orderSlots.length === 0 : dayScheduleCount === 0}
          onPress={finalizeCalendarCreation}
          fullWidth
        />
        <SparrButton
          label="Cancel"
          variant="ghost"
          disabled={creatingCalendarLoading}
          onPress={() => nav.goBack()}
          fullWidth
        />
      </ScrollView>

      {/* Training Picker Modal */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPickerOpen(false)}>
          <View style={[styles.modalSheet, { backgroundColor: c.background.secondary, borderTopColor: c.border.light }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.modalHeader, { borderBottomColor: c.border.light }]}>
              <Text style={[styles.modalHeaderTitle, { color: c.text.primary }]}>Select Training</Text>
              <Pressable onPress={() => setPickerOpen(false)}>
                <Ionicons name="close" size={22} color={c.text.secondary} />
              </Pressable>
            </View>

            {/* Search */}
            <View style={[styles.searchWrap, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]}>
              <Ionicons name="search" size={16} color={c.text.tertiary} />
              <TextInput
                style={[styles.searchInput, { color: c.text.primary }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search trainings…"
                placeholderTextColor={c.text.tertiary}
              />
            </View>

            {loadingData ? (
              <ActivityIndicator style={{ marginVertical: 24 }} color={c.primary.main} />
            ) : (
              <FlatList
                data={filteredTrainings}
                keyExtractor={(item) => String(item.id_trainings)}
                renderItem={({ item }) => (
                  <Pressable style={styles.pickerItem} onPress={() => handlePickTraining(item)}>
                    <TrainingPreviewCard
                      title={item.title}
                      description={item.description}
                      componentCount={item.component_count}
                      estimatedDurationSeconds={item.estimated_duration_seconds}
                      compact
                    />
                  </Pressable>
                )}
                ListEmptyComponent={
                  <View style={styles.emptySchedule}>
                    <Text style={[styles.emptyScheduleTitle, { color: c.text.secondary }]}>No trainings found</Text>
                    <Text style={[styles.emptyScheduleSub, { color: c.text.tertiary }]}>Create a training first</Text>
                  </View>
                }
                style={{ maxHeight: 400 }}
                contentContainerStyle={{ padding: 12, gap: 4 }}
              />
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Special Event Modal */}
      <Modal
        visible={eventModalOpen}
        transparent
        animationType="slide"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setEventModalOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setEventModalOpen(false)}>
          <View style={[styles.modalSheet, { backgroundColor: c.background.secondary, borderTopColor: c.border.light }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.modalHeader, { borderBottomColor: c.border.light }]}>
              <Text style={[styles.modalHeaderTitle, { color: c.text.primary }]}>Add Special Event</Text>
              <Pressable onPress={() => setEventModalOpen(false)}>
                <Ionicons name="close" size={22} color={c.text.secondary} />
              </Pressable>
            </View>

            <View style={styles.eventModalBody}>
              <Text style={[styles.label, { color: c.text.primary }]}>Event Title *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.glass.surface, borderColor: c.glass.border, color: c.text.primary }]}
                value={eventTitle}
                onChangeText={setEventTitle}
                placeholder="e.g., Cross Club Sparring Day"
                placeholderTextColor={c.text.tertiary}
                autoFocus
              />

              <Text style={[styles.label, { color: c.text.primary, marginTop: 12 }]}>Description (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.glass.surface, borderColor: c.glass.border, color: c.text.primary, height: 70, textAlignVertical: 'top', paddingTop: 10 }]}
                value={eventDescription}
                onChangeText={setEventDescription}
                placeholder="What is this event about?"
                placeholderTextColor={c.text.tertiary}
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.label, { color: c.text.primary, marginTop: 12 }]}>Start Date/Time (optional)</Text>
              <DatePickerField
                value={eventStartsAt}
                onChange={setEventStartsAt}
                placeholder="Tap to select start date"
              />

              <Text style={[styles.label, { color: c.text.primary, marginTop: 12 }]}>End Date/Time (optional)</Text>
              <DatePickerField
                value={eventEndsAt}
                onChange={setEventEndsAt}
                placeholder="Tap to select end date"
              />

              <SparrButton
                label="Add Event"
                variant="primary"
                disabled={!eventTitle.trim()}
                onPress={handleAddSpecialEvent}
                fullWidth
              />
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerText: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 2 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { padding: 16, gap: 12 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  hint: { fontSize: 12, marginBottom: 10 },
  input: {
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginTop: 4,
  },
  sectionHeader: { marginBottom: 8 },
  actionRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8,
  },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  restBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1,
  },
  restBtnText: { fontSize: 12, fontWeight: '600' },
  eventBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1,
  },
  eventBtnText: { fontSize: 12, fontWeight: '700' },
  startDateRow: { flexDirection: 'row', gap: 8 },
  startDateBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
    borderWidth: 1,
  },
  startDateBtnActive: {},
  startDateText: { fontSize: 12, fontWeight: '600' },
  startDateTextActive: {},
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 14, justifyContent: 'center' },
  stepperBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  stepperBtnDisabled: { opacity: 0.3 },
  stepperBtnText: { fontSize: 18, fontWeight: '700' },
  stepperValue: { fontSize: 15, fontWeight: '700', minWidth: 80, textAlign: 'center' },
  emptySchedule: { alignItems: 'center', paddingVertical: 24 },
  emptyScheduleTitle: { fontWeight: '600', fontSize: 14 },
  emptyScheduleSub: { fontSize: 12, marginTop: 4 },
  flex1: { flex: 1 },
  scheduleActions: { gap: 3 },
  moveBtn: {
    width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
  },
  moveBtnDisabled: { opacity: 0.35 },
  removeBtn: {
    width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
  },
  // Special event slot
  eventSlotRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eventBadge: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#f59e0b',
    alignItems: 'center', justifyContent: 'center',
  },
  eventSlotTitle: { fontWeight: '700', fontSize: 14 },
  eventSlotSub: { fontSize: 12, marginTop: 2 },
  eventSlotTime: { fontSize: 11, marginTop: 2 },
  // Event modal
  eventModalBody: { padding: 16, gap: 4 },
  errorText: { color: '#fecaca', fontWeight: '600', fontSize: 13 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '70%', borderTopWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1,
  },
  modalHeaderTitle: { fontSize: 16, fontWeight: '700' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 10, marginBottom: 6,
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 13 },
  pickerItem: { marginBottom: 2 },
});
