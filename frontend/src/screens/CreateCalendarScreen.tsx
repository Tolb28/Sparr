import React, { useCallback, useEffect, useState } from 'react';
import { Text } from '@/components/ui/text';
import { GlassCard } from '@/components/ui/glass-card';
import { SparrButton } from '@/components/ui/sparr-button';
import { colors } from '@/src/theme/colors';
import {
  createCalendar,
  selectCalendar,
  getTrainings,
  addTrainingToCalendar,
} from '../api/trainingCalendars';
import { useNavigation } from '@react-navigation/native';
import { FlatList, ActivityIndicator, Modal, ScrollView, TextInput, View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TrainingPreviewCard from '../components/TrainingPreviewCard';
import DatePickerField from '../components/DatePickerField';
import CalendarTypeSelector from '../components/CalendarTypeSelector';
import WeekDayGrid, { DaySlot } from '../components/WeekDayGrid';
import OrderSlotGroup, { OrderSlotData, OrderSlotTraining } from '../components/OrderSlotGroup';

/* ---------------------------------- Types --------------------------------- */
type ScheduleSlot =
  | { type: 'training'; id_trainings: number; title: string; component_count: number; estimated_duration_seconds: number }
  | { type: 'rest'; title: 'Rest Day' };

const START_DATE_OPTIONS = [
  { key: 'today', label: 'Today' },
  { key: 'year_start', label: 'Start of Year' },
  { key: 'custom', label: 'Choose Date' },
] as const;

/* -------------------------------- Component ------------------------------- */
export default function CreateCalendarScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('private');
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
        // Adding another training to existing order slot
        setOrderSlots(prev => prev.map(s =>
          s.order === pickerContext.order ? { ...s, trainings: [...s.trainings, slot] } : s
        ));
      } else {
        // New order slot
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

      const resp = await createCalendar({
        title: title.trim(),
        privacy,
        calendar_type: calendarType,
        num_weeks: calendarType === 'day' ? numWeeks : 1,
        order_start_date: orderStartDate,
      });
      const calendarId = resp?.calendar?.id_training_calendar;
      if (!calendarId) throw new Error('Invalid calendar');

      await selectCalendar(calendarId);

      if (calendarType === 'order') {
        for (const slot of orderSlots) {
          if (slot.type === 'rest') {
            // Persist rest day as a row with no training
            await addTrainingToCalendar(calendarId, {
              order: slot.order,
            });
            continue;
          }
          for (const t of slot.trainings) {
            await addTrainingToCalendar(calendarId, {
              id_trainings: t.id_trainings,
              order: slot.order,
              start_time: t.start_time,
            });
          }
        }
      } else {
        // Day-oriented
        for (const [weekStr, weekData] of Object.entries(daySchedule)) {
          const weekNumber = Number(weekStr);
          for (const [dayStr, slots] of Object.entries(weekData)) {
            const dayOfWeek = Number(dayStr);
            for (let i = 0; i < slots.length; i++) {
              const s = slots[i];
              await addTrainingToCalendar(calendarId, {
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
  }, [title, privacy, calendarType, orderSlots, daySchedule, numWeeks, startDateOption, customStartDate, nav]);

  /* -------------------------------- Render --------------------------------- */
  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: (insets.top || 0) + 8 }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>New Calendar</Text>
          <Text style={styles.headerSub}>Build your training program</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Calendar Name */}
        <GlassCard variant="medium" radius={14} padding={16}>
          <Text style={styles.label}>Calendar Name</Text>
          <Text style={styles.hint}>Give your calendar a meaningful name</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Boxing Program, Summer Training"
            placeholderTextColor={colors.text.tertiary}
          />
        </GlassCard>

        {/* Privacy */}
        <GlassCard variant="medium" radius={14} padding={16}>
          <Text style={styles.label}>Privacy</Text>
          <Text style={styles.hint}>Choose who can view your calendar</Text>
          <View style={styles.privacyRow}>
            {(['private', 'public'] as const).map((p) => (
              <Pressable
                key={p}
                style={[styles.privacyBtn, privacy === p && styles.privacyBtnActive]}
                onPress={() => setPrivacy(p)}
              >
                <Text style={[styles.privacyText, privacy === p && styles.privacyTextActive]}>
                  {p === 'private' ? '🔒 Private' : '🌐 Public'}
                </Text>
              </Pressable>
            ))}
          </View>
        </GlassCard>

        {/* Calendar Type Selector */}
        <CalendarTypeSelector value={calendarType} onChange={setCalendarType} />

        {/* =================== ORDER-ORIENTED BUILDER =================== */}
        {calendarType === 'order' && (
          <>
            {/* Start Date */}
            <GlassCard variant="medium" radius={14} padding={16}>
              <Text style={styles.label}>Start Date</Text>
              <Text style={styles.hint}>When does the cycle begin counting?</Text>
              <View style={styles.startDateRow}>
                {START_DATE_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={[styles.startDateBtn, startDateOption === opt.key && styles.startDateBtnActive]}
                    onPress={() => setStartDateOption(opt.key)}
                  >
                    <Text style={[styles.startDateText, startDateOption === opt.key && styles.startDateTextActive]}>
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
                  <Text style={styles.label}>Your Schedule ({orderSlots.length} days)</Text>
                  <Text style={styles.hint}>Add trainings in order — you can add rest days</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <Pressable style={styles.addBtn} onPress={() => openPickerForOrder()}>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.addBtnText}>Add Training</Text>
                </Pressable>
                <Pressable style={styles.restBtn} onPress={addRestDay}>
                  <Ionicons name="bed-outline" size={16} color={colors.text.secondary} />
                  <Text style={styles.restBtnText}>Rest Day</Text>
                </Pressable>
                <Pressable style={styles.createBtn} onPress={() => (nav as any).navigate('CreateTraining')}>
                  <Ionicons name="hammer-outline" size={16} color={colors.primary.main} />
                  <Text style={styles.createBtnText}>New</Text>
                </Pressable>
              </View>

              {orderSlots.length === 0 ? (
                <View style={styles.emptySchedule}>
                  <Ionicons name="calendar-outline" size={32} color={colors.text.tertiary} />
                  <Text style={styles.emptyScheduleTitle}>No days yet</Text>
                  <Text style={styles.emptyScheduleSub}>Add trainings to build your program</Text>
                </View>
              ) : (
                orderSlots.map((slot, i) => (
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
                ))
              )}
            </GlassCard>
          </>
        )}

        {/* =================== DAY-ORIENTED BUILDER =================== */}
        {calendarType === 'day' && (
          <>
            {/* Number of weeks */}
            <GlassCard variant="medium" radius={14} padding={16}>
              <Text style={styles.label}>Rotation Length</Text>
              <Text style={styles.hint}>How many weeks before the schedule repeats?</Text>
              <View style={styles.stepperRow}>
                <Pressable
                  style={[styles.stepperBtn, numWeeks <= 1 && styles.stepperBtnDisabled]}
                  onPress={() => { if (numWeeks > 1) setNumWeeks(numWeeks - 1); }}
                  disabled={numWeeks <= 1}
                >
                  <Text style={styles.stepperBtnText}>−</Text>
                </Pressable>
                <Text style={styles.stepperValue}>{numWeeks} week{numWeeks > 1 ? 's' : ''}</Text>
                <Pressable
                  style={[styles.stepperBtn, numWeeks >= 8 && styles.stepperBtnDisabled]}
                  onPress={() => { if (numWeeks < 8) setNumWeeks(numWeeks + 1); }}
                  disabled={numWeeks >= 8}
                >
                  <Text style={styles.stepperBtnText}>+</Text>
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
          label="Create Calendar"
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
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Select Training</Text>
              <Pressable onPress={() => setPickerOpen(false)}>
                <Ionicons name="close" size={22} color={colors.text.secondary} />
              </Pressable>
            </View>

            {/* Search */}
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color={colors.text.tertiary} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search trainings…"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            {loadingData ? (
              <ActivityIndicator style={{ marginVertical: 24 }} color={colors.primary.main} />
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
                    <Text style={styles.emptyScheduleTitle}>No trainings found</Text>
                    <Text style={styles.emptyScheduleSub}>Create a training first</Text>
                  </View>
                }
                style={{ maxHeight: 400 }}
                contentContainerStyle={{ padding: 12, gap: 4 }}
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.secondary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border.light,
  },
  headerText: { flex: 1, alignItems: 'center' },
  headerTitle: { color: colors.text.primary, fontSize: 18, fontWeight: '800' },
  headerSub: { color: colors.text.tertiary, fontSize: 12, marginTop: 2 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.glass.surface, borderWidth: 1, borderColor: colors.glass.border,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { padding: 16, gap: 12 },
  label: { color: colors.text.primary, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  hint: { color: colors.text.tertiary, fontSize: 12, marginBottom: 10 },
  input: {
    backgroundColor: colors.glass.surface, borderRadius: 10, borderWidth: 1,
    borderColor: colors.glass.border, color: colors.text.primary,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginTop: 4,
  },
  privacyRow: { flexDirection: 'row', gap: 10 },
  privacyBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: colors.glass.border, backgroundColor: colors.glass.surface,
  },
  privacyBtnActive: { borderColor: colors.primary.main, backgroundColor: colors.glass.redSurface },
  privacyText: { color: colors.text.secondary, fontWeight: '600', fontSize: 13 },
  privacyTextActive: { color: colors.primary.main },
  sectionHeader: { marginBottom: 8 },
  actionRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.primary.main,
  },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  restBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.glass.surface, borderWidth: 1, borderColor: colors.glass.border,
  },
  restBtnText: { color: colors.text.secondary, fontSize: 12, fontWeight: '600' },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto',
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.glass.redSurface, borderWidth: 1, borderColor: colors.glass.redBorder,
  },
  createBtnText: { color: colors.primary.main, fontSize: 12, fontWeight: '700' },
  startDateRow: { flexDirection: 'row', gap: 8 },
  startDateBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: colors.glass.border, backgroundColor: colors.glass.surface,
  },
  startDateBtnActive: { borderColor: colors.primary.main, backgroundColor: colors.glass.redSurface },
  startDateText: { color: colors.text.secondary, fontSize: 12, fontWeight: '600' },
  startDateTextActive: { color: colors.primary.main },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 14, justifyContent: 'center' },
  stepperBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.glass.surface, borderWidth: 1, borderColor: colors.glass.border,
  },
  stepperBtnDisabled: { opacity: 0.3 },
  stepperBtnText: { color: colors.text.primary, fontSize: 18, fontWeight: '700' },
  stepperValue: { color: colors.text.primary, fontSize: 15, fontWeight: '700', minWidth: 80, textAlign: 'center' },
  emptySchedule: { alignItems: 'center', paddingVertical: 24 },
  emptyScheduleTitle: { color: colors.text.secondary, fontWeight: '600', fontSize: 14 },
  emptyScheduleSub: { color: colors.text.tertiary, fontSize: 12, marginTop: 4 },
  scheduleItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: colors.glass.border,
  },
  dayBadge: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary.main,
    alignItems: 'center', justifyContent: 'center',
  },
  dayBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  flex1: { flex: 1 },
  restSlot: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  restSlotText: { color: colors.text.tertiary, fontSize: 13, fontStyle: 'italic' },
  scheduleActions: { gap: 3 },
  moveBtn: {
    width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.glass.medium,
  },
  moveBtnDisabled: { opacity: 0.35 },
  moveBtnText: { color: colors.text.secondary, fontSize: 10 },
  removeBtn: {
    width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.glass.redSurface,
  },
  errorText: { color: '#fecaca', fontWeight: '600', fontSize: 13 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.background.secondary, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '70%', borderTopWidth: 1, borderTopColor: colors.border.light,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border.light,
  },
  modalHeaderTitle: { color: colors.text.primary, fontSize: 16, fontWeight: '700' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 10, marginBottom: 6,
    backgroundColor: colors.glass.surface, borderRadius: 10, borderWidth: 1,
    borderColor: colors.glass.border, paddingHorizontal: 10, paddingVertical: 8,
  },
  searchInput: { flex: 1, color: colors.text.primary, fontSize: 13 },
  pickerItem: { marginBottom: 2 },
});
