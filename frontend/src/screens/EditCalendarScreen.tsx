import React, { useCallback, useEffect, useState } from 'react';
import {
  View, ScrollView, TextInput, Pressable, FlatList, Modal,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { GlassCard } from '@/components/ui/glass-card';
import { SparrButton } from '@/components/ui/sparr-button';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import {
  getCalendarPreview,
  updateCalendarApi,
  deleteCalendarApi,
  addTrainingToCalendar,
  removeTrainingFromCalendar,
  getTrainings,
} from '../api/trainingCalendars';
import TrainingPreviewCard from '../components/TrainingPreviewCard';
import CalendarTypeSelector from '../components/CalendarTypeSelector';
import WeekDayGrid, { DaySlot } from '../components/WeekDayGrid';
import OrderSlotGroup, { OrderSlotData, OrderSlotTraining } from '../components/OrderSlotGroup';
import DatePickerField from '../components/DatePickerField';
import { showSuccessNotification } from '@/src/services/notificationService';
import ConfirmationModal from '@/src/components/ConfirmationModal';

let _keyCounter = 0;
const nextKey = () => `ek_${++_keyCounter}`;

export default function EditCalendarScreen() {
  const nav = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'EditCalendar'>>();
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const { calendarId } = route.params;

  const [title, setTitle] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('private');
  const [calendarType, setCalendarType] = useState<'day' | 'order'>('order');
  const [originalType, setOriginalType] = useState<'day' | 'order'>('order');
  const [numWeeks, setNumWeeks] = useState(1);
  const [orderStartDate, setOrderStartDate] = useState<'today' | 'year_start' | 'custom' | string>('today');
  const [customStartDate, setCustomStartDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmTypeChange, setConfirmTypeChange] = useState<'day' | 'order' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isOwner, setIsOwner] = useState(true);

  // Day-oriented state
  const [daySchedule, setDaySchedule] = useState<Record<number, Record<number, DaySlot[]>>>({});
  const [activeWeek, setActiveWeek] = useState(1);

  // Order-oriented state
  const [orderSlots, setOrderSlots] = useState<OrderSlotData[]>([]);

  // Training picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loadingTrainings, setLoadingTrainings] = useState(false);
  const [pickerContext, setPickerContext] = useState<
    | { mode: 'day'; weekNumber: number; dayOfWeek: number }
    | { mode: 'order'; order?: number }
    | null
  >(null);

  /* ---- Load calendar data ---- */
  useEffect(() => {
    (async () => {
      try {
        const resp = await getCalendarPreview(calendarId);
        const cal = resp?.calendar;
        const rawItems: any[] = resp?.items || [];

        if (cal) {
          setTitle(cal.title || '');
          setPrivacy(cal.privacy || 'private');
          const type = cal.calendar_type === 'day' ? 'day' : 'order';
          setCalendarType(type);
          setOriginalType(type);
          setNumWeeks(cal.num_weeks || 1);

          if (cal.order_start_date) {
            const sd = typeof cal.order_start_date === 'string' ? cal.order_start_date.substring(0, 10) : cal.order_start_date;
            const todayStr = new Date().toISOString().substring(0, 10);
            const yearStartStr = `${new Date().getFullYear()}-01-01`;
            if (sd === todayStr) {
              setOrderStartDate('today');
            } else if (sd === yearStartStr) {
              setOrderStartDate('year_start');
            } else {
              setOrderStartDate('custom');
              setCustomStartDate(sd);
            }
          }
        }

        // Hydrate type-specific editor state from raw items
        const type = cal?.calendar_type === 'day' ? 'day' : 'order';
        if (type === 'day') {
          const sched: Record<number, Record<number, DaySlot[]>> = {};
          rawItems.forEach((it: any) => {
            const wn = Number(it.week_number) || 1;
            const dow = Number(it.day_of_week) ?? 0;
            if (!sched[wn]) sched[wn] = {};
            if (!sched[wn][dow]) sched[wn][dow] = [];
            sched[wn][dow].push({
              id_trainings: it.training?.id_trainings || it.id_trainings,
              title: it.training?.title || 'Training',
              component_count: it.training?.component_count ?? 0,
              estimated_duration_seconds: it.training?.estimated_duration_seconds ?? 0,
              start_time: it.start_time || null,
              _key: nextKey(),
            });
          });
          setDaySchedule(sched);
        } else {
          // Group by order
          const orderMap: Record<number, OrderSlotTraining[]> = {};
          rawItems.forEach((it: any) => {
            const ord = Number(it.order) || 1;
            if (!orderMap[ord]) orderMap[ord] = [];
            if (it.id_trainings || it.training) {
              orderMap[ord].push({
                id_trainings: it.training?.id_trainings || it.id_trainings,
                title: it.training?.title || 'Training',
                component_count: it.training?.component_count ?? 0,
                estimated_duration_seconds: it.training?.estimated_duration_seconds ?? 0,
                start_time: it.start_time || null,
                _key: nextKey(),
              });
            }
            // Rest day rows have no id_trainings — the order still appears in orderMap with empty array
          });
          const orders = Object.keys(orderMap).map(Number).sort((a, b) => a - b);
          const slots: OrderSlotData[] = orders.map((ord) => ({
            type: orderMap[ord].length > 0 ? 'training' : 'rest',
            order: ord,
            trainings: orderMap[ord],
          }));
          setOrderSlots(slots);
        }

        setIsOwner(resp?.is_owner !== false);
      } catch {
        setError('Failed to load calendar');
      }
      setLoading(false);
    })();
  }, [calendarId]);

  /* ---- Training picker ---- */
  const loadTrainings = useCallback(async () => {
    if (trainings.length > 0) return;
    setLoadingTrainings(true);
    try {
      const resp = await getTrainings();
      setTrainings(resp?.trainings || []);
    } catch { /* silent */ }
    setLoadingTrainings(false);
  }, [trainings.length]);

  const openPickerForDay = (weekNumber: number, dayOfWeek: number) => {
    setPickerContext({ mode: 'day', weekNumber, dayOfWeek });
    setPickerOpen(true);
    loadTrainings();
  };

  const openPickerForOrder = (order?: number) => {
    setPickerContext({ mode: 'order', order });
    setPickerOpen(true);
    loadTrainings();
  };

  const pickTraining = (training: any) => {
    setPickerOpen(false);
    const slot: DaySlot & OrderSlotTraining = {
      id_trainings: training.id_trainings,
      title: training.title,
      component_count: training.component_count ?? 0,
      estimated_duration_seconds: training.estimated_duration_seconds ?? 0,
      start_time: null,
      _key: nextKey(),
    };

    if (pickerContext?.mode === 'day') {
      const { weekNumber, dayOfWeek } = pickerContext;
      setDaySchedule((prev) => {
        const next = { ...prev };
        if (!next[weekNumber]) next[weekNumber] = {};
        if (!next[weekNumber][dayOfWeek]) next[weekNumber][dayOfWeek] = [];
        next[weekNumber] = { ...next[weekNumber] };
        next[weekNumber][dayOfWeek] = [...next[weekNumber][dayOfWeek], slot];
        return next;
      });
    } else if (pickerContext?.mode === 'order') {
      const { order } = pickerContext;
      if (order !== undefined) {
        // Adding to existing order slot
        setOrderSlots((prev) =>
          prev.map((s) =>
            s.order === order
              ? { ...s, type: 'training', trainings: [...s.trainings, slot] }
              : s
          )
        );
      } else {
        // New order slot
        const maxOrd = orderSlots.length > 0 ? Math.max(...orderSlots.map(s => s.order)) : 0;
        setOrderSlots((prev) => [...prev, { type: 'training', order: maxOrd + 1, trainings: [slot] }]);
      }
    }
    setPickerContext(null);
  };

  /* ---- Day-oriented handlers ---- */
  const handleDayRemoveSlot = (weekNumber: number, dayOfWeek: number, slotIndex: number) => {
    setDaySchedule((prev) => {
      const next = { ...prev };
      if (!next[weekNumber]?.[dayOfWeek]) return prev;
      next[weekNumber] = { ...next[weekNumber] };
      next[weekNumber][dayOfWeek] = next[weekNumber][dayOfWeek].filter((_, i) => i !== slotIndex);
      if (next[weekNumber][dayOfWeek].length === 0) {
        const { [dayOfWeek]: _, ...rest } = next[weekNumber];
        next[weekNumber] = rest;
      }
      return next;
    });
  };

  const handleDayTimeChange = (weekNumber: number, dayOfWeek: number, slotIndex: number, time: string | null) => {
    setDaySchedule((prev) => {
      const next = { ...prev };
      if (!next[weekNumber]?.[dayOfWeek]?.[slotIndex]) return prev;
      next[weekNumber] = { ...next[weekNumber] };
      next[weekNumber][dayOfWeek] = [...next[weekNumber][dayOfWeek]];
      next[weekNumber][dayOfWeek][slotIndex] = { ...next[weekNumber][dayOfWeek][slotIndex], start_time: time };
      return next;
    });
  };

  /* ---- Order-oriented handlers ---- */
  const addOrderSlot = () => {
    const maxOrder = orderSlots.length > 0 ? Math.max(...orderSlots.map((s) => s.order)) : 0;
    setOrderSlots((prev) => [...prev, { type: 'rest', order: maxOrder + 1, trainings: [] }]);
  };

  const handleOrderRemoveTraining = (order: number, trainingIdx: number) => {
    setOrderSlots((prev) =>
      prev.map((s) => {
        if (s.order !== order) return s;
        const trainings = s.trainings.filter((_, i) => i !== trainingIdx);
        return { ...s, type: trainings.length > 0 ? 'training' : 'rest', trainings };
      })
    );
  };

  const handleOrderTimeChange = (order: number, trainingIdx: number, time: string | null) => {
    setOrderSlots((prev) =>
      prev.map((s) => {
        if (s.order !== order) return s;
        const trainings = [...s.trainings];
        trainings[trainingIdx] = { ...trainings[trainingIdx], start_time: time };
        return { ...s, trainings };
      })
    );
  };

  const handleOrderMoveSlot = (index: number, direction: 'up' | 'down') => {
    setOrderSlots((prev) => {
      const list = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= list.length) return prev;
      [list[index], list[target]] = [list[target], list[index]];
      return list.map((s, i) => ({ ...s, order: i + 1 }));
    });
  };

  const handleOrderRemoveSlot = (index: number) => {
    setOrderSlots((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 })));
  };

  /* ---- Calendar type change ---- */
  const handleTypeChange = (type: 'day' | 'order') => {
    if (type === calendarType) return;
    const hasData =
      calendarType === 'day'
        ? Object.values(daySchedule).some((w) => Object.values(w).some((d) => d.length > 0))
        : orderSlots.some((s) => s.trainings.length > 0);

    if (hasData) {
      setConfirmTypeChange(type);
    } else {
      setCalendarType(type);
    }
  };

  /* ---- Num weeks change ---- */
  const handleNumWeeksChange = (delta: number) => {
    const next = Math.max(1, Math.min(8, numWeeks + delta));
    if (next < numWeeks) {
      // Removing weeks — strip data for removed weeks
      setDaySchedule((prev) => {
        const cleaned = { ...prev };
        for (let w = next + 1; w <= numWeeks; w++) {
          delete cleaned[w];
        }
        return cleaned;
      });
    }
    setNumWeeks(next);
  };

  /* ---- Save ---- */
  const handleSave = async () => {
    setError(null);
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    try {
      const startDate =
        orderStartDate === 'today'
          ? new Date().toISOString().substring(0, 10)
          : orderStartDate === 'year_start'
          ? `${new Date().getFullYear()}-01-01`
          : orderStartDate === 'custom'
          ? customStartDate
          : orderStartDate;

      const resp = await updateCalendarApi(calendarId, {
        title: title.trim(),
        privacy,
        calendar_type: calendarType,
        num_weeks: calendarType === 'day' ? numWeeks : 1,
        order_start_date: calendarType === 'order' ? startDate : undefined,
        replace_trainings: true,
      });

      if (resp?.forked) {
        showSuccessNotification('A personal version of this program has been created and set as your active calendar.');
      }

      // Always re-submit all current slots (backend cleared them via replace_trainings)
      const targetId = resp?.calendar?.id_training_calendar || calendarId;
      if (calendarType === 'day') {
        for (const [wn, days] of Object.entries(daySchedule)) {
          for (const [dow, slots] of Object.entries(days)) {
            for (let i = 0; i < slots.length; i++) {
              const s = slots[i];
              await addTrainingToCalendar(targetId, {
                id_trainings: s.id_trainings,
                order: i + 1,
                week_number: Number(wn),
                day_of_week: Number(dow),
                start_time: s.start_time || undefined,
              });
            }
          }
        }
      } else {
        for (const slot of orderSlots) {
          if (slot.type === 'rest' || slot.trainings.length === 0) {
            await addTrainingToCalendar(targetId, { order: slot.order });
            continue;
          }
          for (let i = 0; i < slot.trainings.length; i++) {
            const t = slot.trainings[i];
            await addTrainingToCalendar(targetId, {
              id_trainings: t.id_trainings,
              order: slot.order,
              start_time: t.start_time || undefined,
            });
          }
        }
      }

      nav.goBack();
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  /* ---- Delete ---- */
  const handleDelete = () => setConfirmDelete(true);

  const doDelete = async () => {
    setConfirmDelete(false);
    setDeleting(true);
    try {
      await deleteCalendarApi(calendarId);
      nav.goBack();
    } catch {
      setError('Failed to delete');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: c.background.secondary }]}>
        <ActivityIndicator size="large" color={c.text.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background.secondary }]}>
      <View style={[styles.header, { paddingTop: (insets.top || 0) + 8, borderBottomColor: c.border.light }]}>
        <Pressable onPress={() => nav.goBack()} style={[styles.iconBtn, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]}>
          <Ionicons name="chevron-back" size={20} color={c.text.primary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: c.text.primary }]}>Edit Calendar</Text>
        </View>
        <Pressable onPress={handleDelete} style={[styles.iconBtn, { backgroundColor: c.glass.surface, borderColor: c.glass.border }, !isOwner && { opacity: 0 }]} disabled={!isOwner}>
          <Ionicons name="trash-outline" size={18} color={c.text.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Non-owner banner */}
        {!isOwner && (
          <GlassCard variant="medium" radius={12} padding={12} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="information-circle-outline" size={20} color="#60a5fa" />
            <Text style={{ color: '#93c5fd', fontSize: 12, flex: 1, lineHeight: 16 }}>
              This is a community program. Saving will create a personal copy as your active calendar.
            </Text>
          </GlassCard>
        )}

        {/* Title & Privacy */}
        <GlassCard variant="medium" radius={14} padding={16}>
          <Text style={[styles.label, { color: c.text.primary }]}>Calendar Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.glass.surface, borderColor: c.glass.border, color: c.text.primary }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Calendar name"
            placeholderTextColor={c.text.tertiary}
          />
          <Text style={[styles.label, { marginTop: 12, color: c.text.primary }]}>Privacy</Text>
          <View style={styles.privacyRow}>
            {(['private', 'public'] as const).map((p) => (
              <Pressable
                key={p}
                style={[styles.privacyBtn, { borderColor: c.glass.border, backgroundColor: c.glass.surface }, privacy === p && { borderColor: c.primary.main, backgroundColor: c.glass.redSurface }]}
                onPress={() => setPrivacy(p)}
              >
                <Text style={[styles.privacyText, { color: c.text.secondary }, privacy === p && { color: c.primary.main }]}>
                  {p === 'private' ? '🔒 Private' : '🌐 Public'}
                </Text>
              </Pressable>
            ))}
          </View>
        </GlassCard>

        {/* Calendar Type */}
        <CalendarTypeSelector value={calendarType} onChange={handleTypeChange} />

        {/* Type-specific config */}
        {calendarType === 'day' ? (
          <>
            {/* Num weeks stepper */}
            <GlassCard variant="medium" radius={14} padding={16}>
              <Text style={[styles.label, { color: c.text.primary }]}>Rotation Length</Text>
              <View style={styles.stepperRow}>
                <Pressable
                  style={[styles.stepperBtn, { backgroundColor: c.glass.surface, borderColor: c.glass.border }, numWeeks <= 1 && styles.stepperBtnDisabled]}
                  onPress={() => handleNumWeeksChange(-1)}
                  disabled={numWeeks <= 1}
                >
                  <Text style={[styles.stepperBtnText, { color: c.text.primary }]}>−</Text>
                </Pressable>
                <Text style={[styles.stepperValue, { color: c.text.primary }]}>
                  {numWeeks} week{numWeeks !== 1 ? 's' : ''}
                </Text>
                <Pressable
                  style={[styles.stepperBtn, { backgroundColor: c.glass.surface, borderColor: c.glass.border }, numWeeks >= 8 && styles.stepperBtnDisabled]}
                  onPress={() => handleNumWeeksChange(1)}
                  disabled={numWeeks >= 8}
                >
                  <Text style={[styles.stepperBtnText, { color: c.text.primary }]}>+</Text>
                </Pressable>
              </View>
            </GlassCard>

            {/* Week/Day grid */}
            <WeekDayGrid
              numWeeks={numWeeks}
              schedule={daySchedule}
              activeWeek={activeWeek}
              onWeekChange={setActiveWeek}
              onAddTraining={openPickerForDay}
              onRemoveSlot={handleDayRemoveSlot}
              onTimeChange={handleDayTimeChange}
            />
          </>
        ) : (
          <>
            {/* Start date selector */}
            <GlassCard variant="medium" radius={14} padding={16}>
              <Text style={[styles.label, { color: c.text.primary }]}>Cycle Start Date</Text>
              <Text style={[styles.hint, { color: c.text.tertiary }]}>When does the training order begin cycling from?</Text>
              <View style={styles.startDateRow}>
                {[
                  { key: 'today', label: 'Today' },
                  { key: 'year_start', label: 'Jan 1' },
                  { key: 'custom', label: 'Choose Date' },
                ].map((opt) => {
                  const active = orderStartDate === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      style={[styles.startDateBtn, { borderColor: c.glass.border, backgroundColor: c.glass.surface }, active && { borderColor: c.primary.main, backgroundColor: c.glass.redSurface }]}
                      onPress={() => setOrderStartDate(opt.key)}
                    >
                      <Text style={[styles.startDateText, { color: c.text.secondary }, active && { color: c.primary.main }]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {orderStartDate === 'custom' && (
                <View style={{ marginTop: 10 }}>
                  <DatePickerField
                    value={customStartDate}
                    onChange={setCustomStartDate}
                    placeholder="Tap to select date"
                  />
                </View>
              )}
              <Text style={[styles.startDateInfo, { color: c.text.tertiary }]}>Start: {orderStartDate === 'custom' ? (customStartDate || '—') : orderStartDate === 'today' ? 'Today' : 'Start of Year'}</Text>
            </GlassCard>

            {/* Order slots */}
            <GlassCard variant="medium" radius={14} padding={16}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.label, { color: c.text.primary }]}>Schedule ({orderSlots.length} days)</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable style={styles.addBtn} onPress={() => openPickerForOrder()}>
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.addBtnText}>Add Training</Text>
                  </Pressable>
                  <Pressable style={[styles.restBtn, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]} onPress={addOrderSlot}>
                    <Ionicons name="bed-outline" size={16} color={c.text.secondary} />
                    <Text style={[styles.restBtnText, { color: c.text.secondary }]}>Rest Day</Text>
                  </Pressable>
                </View>
              </View>

              {orderSlots.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="calendar-outline" size={32} color={c.text.tertiary} />
                  <Text style={[styles.emptyTitle, { color: c.text.secondary }]}>No days yet</Text>
                  <Text style={[styles.emptySub, { color: c.text.tertiary }]}>Tap "Add Day" to build your schedule</Text>
                </View>
              ) : (
                orderSlots.map((slot, i) => (
                  <OrderSlotGroup
                    key={`${slot.order}-${i}`}
                    slot={slot}
                    index={i}
                    total={orderSlots.length}
                    onAddTraining={openPickerForOrder}
                    onRemoveTraining={handleOrderRemoveTraining}
                    onTimeChange={handleOrderTimeChange}
                    onMoveSlot={handleOrderMoveSlot}
                    onRemoveSlot={handleOrderRemoveSlot}
                  />
                ))
              )}
            </GlassCard>
          </>
        )}

        {error && (
          <GlassCard variant="red" radius={12} padding={14}>
            <Text style={styles.errorText}>{error}</Text>
          </GlassCard>
        )}

        <SparrButton
          label={isOwner ? 'Save Changes' : 'Save as My Copy'}
          variant="primary"
          loading={saving}
          disabled={saving || deleting}
          onPress={handleSave}
          fullWidth
        />
      </ScrollView>

      {/* Training picker modal */}
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
              <Text style={[styles.modalTitle, { color: c.text.primary }]}>Select Training</Text>
              <Pressable onPress={() => setPickerOpen(false)}>
                <Ionicons name="close" size={22} color={c.text.secondary} />
              </Pressable>
            </View>
            {loadingTrainings ? (
              <ActivityIndicator style={{ marginVertical: 24 }} color={c.primary.main} />
            ) : (
              <FlatList
                data={trainings}
                keyExtractor={(t: any) => String(t.id_trainings)}
                renderItem={({ item }) => (
                  <Pressable style={styles.pickerItem} onPress={() => pickTraining(item)}>
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
                  <View style={styles.empty}>
                    <Text style={[styles.emptyTitle, { color: c.text.secondary }]}>No trainings available</Text>
                    <Text style={[styles.emptySub, { color: c.text.tertiary }]}>Create a training first</Text>
                  </View>
                }
                style={{ maxHeight: 400 }}
                contentContainerStyle={{ padding: 12, gap: 6 }}
              />
            )}
          </View>
        </Pressable>
      </Modal>
      <ConfirmationModal
        visible={!!confirmTypeChange}
        title="Change Calendar Type"
        message="Changing the type will remove all training assignments. Continue?"
        confirmText="Change"
        destructive
        onConfirm={() => {
          if (confirmTypeChange) {
            setCalendarType(confirmTypeChange);
            setDaySchedule({});
            setOrderSlots([]);
          }
          setConfirmTypeChange(null);
        }}
        onCancel={() => setConfirmTypeChange(null)}
      />
      <ConfirmationModal
        visible={confirmDelete}
        title="Delete Calendar"
        message="This will permanently delete this calendar and remove it from all profiles."
        confirmText="Delete"
        destructive
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  hint: { fontSize: 12, marginBottom: 10 },
  input: {
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  privacyRow: { flexDirection: 'row', gap: 10 },
  privacyBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    borderWidth: 1,
  },
  privacyText: { fontWeight: '600', fontSize: 13 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  stepperBtn: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  stepperBtnDisabled: { opacity: 0.3 },
  stepperBtnText: { fontSize: 18, fontWeight: '700' },
  stepperValue: { fontSize: 16, fontWeight: '700', minWidth: 80, textAlign: 'center' },
  startDateRow: { flexDirection: 'row', gap: 8 },
  startDateBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    borderWidth: 1,
  },
  startDateText: { fontWeight: '600', fontSize: 13 },
  startDateInfo: { fontSize: 11, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#c0392b',
  },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  restBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1,
  },
  restBtnText: { fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  emptyTitle: { fontWeight: '600', fontSize: 14 },
  emptySub: { fontSize: 12 },
  errorText: { color: '#fecaca', fontWeight: '600', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '65%', borderTopWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  pickerItem: { marginBottom: 2 },
});
