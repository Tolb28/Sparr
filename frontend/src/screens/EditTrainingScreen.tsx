import React, { useCallback, useEffect, useState } from 'react';
import {
  View, ScrollView, TextInput, Pressable, FlatList, Modal,
  ActivityIndicator, StyleSheet, Text as RNText,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { GlassCard } from '@/components/ui/glass-card';
import { SparrButton } from '@/components/ui/sparr-button';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import ConfirmationModal from '@/src/components/ConfirmationModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import {
  getTraining,
  updateTrainingApi,
  deleteTrainingApi,
  addTrainingComponent,
  deleteTrainingComponent,
  listDrills,
  listCombinations,
  listTechniques,
} from '../api/trainingCalendars';

type Tab = 'drills' | 'combinations' | 'techniques';

interface LocalComponent {
  key: string;
  serverId?: number; // id_trainings_components, if exists on server
  type: Tab;
  refId: number;
  title: string;
  sets: number;
  reps: number;
  length: number;
  isNew?: boolean;
}

const TAB_META: Record<Tab, { label: string; icon: string; color: string }> = {
  drills:       { label: 'Drills',     icon: 'fitness-outline',  color: '#22c55e' },
  combinations: { label: 'Combos',     icon: 'flash-outline',   color: '#f59e0b' },
  techniques:   { label: 'Techniques', icon: 'school-outline',  color: '#8b5cf6' },
};

export default function EditTrainingScreen() {
  const nav = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'EditTraining'>>();
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const { trainingId } = route.params;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [components, setComponents] = useState<LocalComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [removedServerIds, setRemovedServerIds] = useState<number[]>([]);

  // Picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('drills');
  const [search, setSearch] = useState('');
  const [catalog, setCatalog] = useState<Record<Tab, any[]>>({
    drills: [], combinations: [], techniques: [],
  });
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Load training data
  useEffect(() => {
    (async () => {
      try {
        const resp = await getTraining(trainingId);
        const t = resp?.training;
        if (t) { setTitle(t.title || ''); setDescription(t.description || ''); }
        const comps = (resp?.components || []).map((comp: any, i: number) => {
          const type: Tab = comp.id_drills ? 'drills' : comp.id_combinations ? 'combinations' : 'techniques';
          return {
            key: `srv-${comp.id_trainings_components}`,
            serverId: comp.id_trainings_components,
            type,
            refId: comp.id_drills || comp.id_combinations || comp.id_techniques || 0,
            title: comp.drill_title || comp.combination_title || comp.technique_title || comp.title || 'Exercise',
            sets: comp.sets ?? 1,
            reps: comp.reps ?? 0,
            length: comp.length ?? 0,
          } as LocalComponent;
        });
        setComponents(comps);
      } catch { setError('Failed to load training'); }
      setLoading(false);
    })();
  }, [trainingId]);

  const loadCatalog = useCallback(async () => {
    if (catalog.drills.length > 0) return;
    setLoadingCatalog(true);
    try {
      const [d, co, t] = await Promise.all([listDrills(), listCombinations(), listTechniques()]);
      setCatalog({
        drills: d?.drills || d || [],
        combinations: co?.combinations || co || [],
        techniques: t?.techniques || t || [],
      });
    } catch { /* silent */ }
    setLoadingCatalog(false);
  }, [catalog.drills.length]);

  const openPicker = () => { setPickerOpen(true); loadCatalog(); setSearch(''); };

  const filteredItems = (catalog[activeTab] || []).filter((item: any) => {
    if (!search.trim()) return true;
    return item.title?.toLowerCase().includes(search.toLowerCase());
  });

  const addFromPicker = (item: any) => {
    const refKey = activeTab === 'drills' ? 'id_drills'
      : activeTab === 'combinations' ? 'id_combinations' : 'id_techniques';
    const comp: LocalComponent = {
      key: `${activeTab}-${item[refKey]}-${Date.now()}`,
      type: activeTab,
      refId: item[refKey],
      title: item.title,
      sets: 1, reps: 0, length: 0,
      isNew: true,
    };
    setComponents(prev => [...prev, comp]);
    setPickerOpen(false);
  };

  const updateComp = (key: string, field: keyof LocalComponent, value: number) => {
    setComponents(prev => prev.map(comp => comp.key === key ? { ...comp, [field]: value } : comp));
  };

  const removeComp = (key: string) => {
    const comp = components.find(comp => comp.key === key);
    if (comp?.serverId) setRemovedServerIds(prev => [...prev, comp.serverId!]);
    setComponents(prev => prev.filter(comp => comp.key !== key));
  };

  const moveComp = (index: number, dir: 'up' | 'down') => {
    setComponents(prev => {
      const list = [...prev];
      const target = dir === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= list.length) return prev;
      [list[index], list[target]] = [list[target], list[index]];
      return list;
    });
  };

  const totalDuration = components.reduce((acc, comp) => {
    if (comp.length > 0) return acc + comp.length * (comp.sets || 1);
    if (comp.reps > 0) return acc + (comp.sets || 1) * comp.reps * 3;
    return acc;
  }, 0);

  const formatDur = (s: number) => {
    if (s <= 0) return '—';
    if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
    if (s >= 60) return `${Math.floor(s / 60)}m`;
    return `${s}s`;
  };

  const handleSave = async () => {
    setError(null);
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    try {
      await updateTrainingApi(trainingId, { title: title.trim(), description: description.trim() || undefined });

      // Delete removed server components
      for (const id of removedServerIds) {
        await deleteTrainingComponent(id);
      }

      // Add new components
      for (const comp of components.filter(comp => comp.isNew)) {
        const payload: any = { sets: comp.sets || 1 };
        if (comp.type === 'drills') payload.id_drills = comp.refId;
        else if (comp.type === 'combinations') payload.id_combinations = comp.refId;
        else payload.id_techniques = comp.refId;
        if (comp.length > 0) payload.length = comp.length;
        if (comp.reps > 0) payload.reps = comp.reps;
        await addTrainingComponent(trainingId, payload);
      }

      nav.goBack();
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => setConfirmDelete(true);

  const doDelete = async () => {
    setConfirmDelete(false);
    setDeleting(true);
    try {
      await deleteTrainingApi(trainingId);
      nav.goBack();
    } catch {
      setError('Failed to delete');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: c.background.secondary, alignItems: 'center', justifyContent: 'center' }]}>
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
          <Text style={[styles.headerTitle, { color: c.text.primary }]}>Edit Training</Text>
        </View>
        <Pressable onPress={handleDelete} style={[styles.iconBtn, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]}>
          <Ionicons name="trash-outline" size={18} color={c.text.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <GlassCard variant="medium" radius={14} padding={16}>
          <Text style={[styles.label, { color: c.text.primary }]}>Training Name</Text>
          <TextInput style={[styles.input, { backgroundColor: c.glass.surface, borderColor: c.glass.border, color: c.text.primary }]} value={title} onChangeText={setTitle}
            placeholder="Training name" placeholderTextColor={c.text.tertiary} />
          <Text style={[styles.label, { marginTop: 12, color: c.text.primary }]}>Description</Text>
          <TextInput style={[styles.input, { height: 64, textAlignVertical: 'top', backgroundColor: c.glass.surface, borderColor: c.glass.border, color: c.text.primary }]}
            value={description} onChangeText={setDescription}
            placeholder="Optional…" placeholderTextColor={c.text.tertiary} multiline />
        </GlassCard>

        <GlassCard variant="medium" radius={14} padding={14}>
          <View style={styles.durationRow}>
            <View style={[styles.durationIconWrap, { backgroundColor: c.glass.redSurface }]}>
              <Ionicons name="time-outline" size={18} color={c.text.primary} />
            </View>
            <View>
              <Text style={[styles.durationLabel, { color: c.text.tertiary }]}>Estimated Duration</Text>
              <Text style={[styles.durationValue, { color: c.text.primary }]}>{formatDur(totalDuration)}</Text>
            </View>
            <View style={[styles.countBadge, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]}>
              <Text style={[styles.countBadgeText, { color: c.text.secondary }]}>{components.length} exercises</Text>
            </View>
          </View>
        </GlassCard>

        <GlassCard variant="medium" radius={14} padding={16}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.label, { color: c.text.primary }]}>Exercises</Text>
            <Pressable style={styles.addBtn} onPress={openPicker}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>

          {components.length === 0 ? (
            <View style={styles.emptyExercises}>
              <Ionicons name="barbell-outline" size={32} color={c.text.tertiary} />
              <Text style={[styles.emptyTitle, { color: c.text.secondary }]}>No exercises</Text>
            </View>
          ) : (
            components.map((comp, i) => (
              <View key={comp.key} style={[styles.compItem, { borderBottomColor: c.glass.border }]}>
                <View style={styles.compHeader}>
                  <View style={[styles.compTypeDot, { backgroundColor: TAB_META[comp.type].color }]} />
                  <Text style={[styles.compTitle, { color: c.text.primary }]} numberOfLines={1}>{comp.title}</Text>
                  <View style={styles.compActions}>
                    <Pressable onPress={() => moveComp(i, 'up')} disabled={i === 0}
                      style={[styles.miniBtn, { backgroundColor: c.glass.surface }, i === 0 && styles.miniBtnDisabled]}>
                      <Text style={[styles.miniBtnText, { color: c.text.secondary }]}>▲</Text>
                    </Pressable>
                    <Pressable onPress={() => moveComp(i, 'down')} disabled={i === components.length - 1}
                      style={[styles.miniBtn, { backgroundColor: c.glass.surface }, i === components.length - 1 && styles.miniBtnDisabled]}>
                      <Text style={[styles.miniBtnText, { color: c.text.secondary }]}>▼</Text>
                    </Pressable>
                    <Pressable onPress={() => removeComp(comp.key)} style={[styles.removeBtn, { backgroundColor: c.glass.redSurface }]}>
                      <Ionicons name="close" size={14} color={c.text.primary} />
                    </Pressable>
                  </View>
                </View>
                <View style={styles.compFields}>
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: c.text.tertiary }]}>Sets</Text>
                    <TextInput style={[styles.fieldInput, { backgroundColor: c.glass.surface, borderColor: c.glass.border, color: c.text.primary }]}
                      value={String(comp.sets || '')}
                      onChangeText={v => updateComp(comp.key, 'sets', parseInt(v) || 0)}
                      keyboardType="number-pad" placeholder="1" placeholderTextColor={c.text.tertiary} />
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: c.text.tertiary }]}>Reps</Text>
                    <TextInput style={[styles.fieldInput, { backgroundColor: c.glass.surface, borderColor: c.glass.border, color: c.text.primary }]}
                      value={String(comp.reps || '')}
                      onChangeText={v => updateComp(comp.key, 'reps', parseInt(v) || 0)}
                      keyboardType="number-pad" placeholder="—" placeholderTextColor={c.text.tertiary} />
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: c.text.tertiary }]}>Sec</Text>
                    <TextInput style={[styles.fieldInput, { backgroundColor: c.glass.surface, borderColor: c.glass.border, color: c.text.primary }]}
                      value={String(comp.length || '')}
                      onChangeText={v => updateComp(comp.key, 'length', parseInt(v) || 0)}
                      keyboardType="number-pad" placeholder="—" placeholderTextColor={c.text.tertiary} />
                  </View>
                </View>
              </View>
            ))
          )}
        </GlassCard>

        {error && (
          <GlassCard variant="red" radius={12} padding={14}>
            <Text style={styles.errorText}>{error}</Text>
          </GlassCard>
        )}

        <SparrButton label="Save Changes" variant="primary" loading={saving} disabled={saving || deleting}
          onPress={handleSave} fullWidth />
      </ScrollView>

      {/* Picker Modal */}
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
              <Text style={[styles.modalTitle, { color: c.text.primary }]}>Add Exercise</Text>
              <Pressable onPress={() => setPickerOpen(false)}>
                <Ionicons name="close" size={22} color={c.text.secondary} />
              </Pressable>
            </View>
            <View style={styles.tabRow}>
              {(Object.keys(TAB_META) as Tab[]).map(tab => (
                <Pressable key={tab}
                  style={[
                    styles.tab,
                    { backgroundColor: c.glass.surface, borderColor: c.glass.border },
                    activeTab === tab && { borderColor: c.glass.redBorder, backgroundColor: c.glass.redSurface },
                  ]}
                  onPress={() => setActiveTab(tab)}>
                  <Ionicons name={TAB_META[tab].icon as any} size={16}
                    color={activeTab === tab ? TAB_META[tab].color : c.text.tertiary} />
                  <RNText
                    style={{
                      fontSize: 13,
                      fontWeight: activeTab === tab ? '700' : '600',
                      color: activeTab === tab ? TAB_META[tab].color : c.text.tertiary,
                    }}
                  >
                    {TAB_META[tab].label}
                  </RNText>
                </Pressable>
              ))}
            </View>
            <View style={[styles.searchWrap, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]}>
              <Ionicons name="search" size={16} color={c.text.tertiary} />
              <TextInput style={[styles.searchInput, { color: c.text.primary }]} value={search} onChangeText={setSearch}
                placeholder={`Search…`} placeholderTextColor={c.text.tertiary} />
            </View>
            {loadingCatalog ? (
              <ActivityIndicator style={{ marginTop: 24 }} color={c.text.primary} />
            ) : (
              <FlatList data={filteredItems}
                keyExtractor={(item: any) => String(item.id_drills || item.id_combinations || item.id_techniques)}
                renderItem={({ item }) => (
                  <Pressable style={[styles.pickerItem, { borderBottomColor: c.glass.border }]} onPress={() => addFromPicker(item)}>
                    <View style={[styles.pickerDot, { backgroundColor: TAB_META[activeTab].color }]} />
                    <View style={styles.pickerInfo}>
                      <Text style={[styles.pickerTitle, { color: c.text.primary }]}>{item.title}</Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={20} color={c.text.primary} />
                  </Pressable>
                )}
                ListEmptyComponent={<Text style={[styles.pickerEmpty, { color: c.text.tertiary }]}>No items found</Text>}
                style={{ maxHeight: 300 }}
              />
            )}
          </View>
        </Pressable>
      </Modal>
      <ConfirmationModal
        visible={confirmDelete}
        title="Delete Training"
        message="This cannot be undone."
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
  scroll: { padding: 16, gap: 12 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: {
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  durationIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  durationLabel: { fontSize: 11 },
  durationValue: { fontSize: 16, fontWeight: '800' },
  countBadge: {
    marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    borderWidth: 1,
  },
  countBadgeText: { fontSize: 11, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#c0392b',
  },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  emptyExercises: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  emptyTitle: { fontWeight: '600', fontSize: 14 },
  compItem: { borderBottomWidth: 1, paddingVertical: 10 },
  compHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compTypeDot: { width: 8, height: 8, borderRadius: 4 },
  compTitle: { flex: 1, fontSize: 13, fontWeight: '600' },
  compActions: { flexDirection: 'row', gap: 4 },
  miniBtn: {
    width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
  },
  miniBtnDisabled: { opacity: 0.3 },
  miniBtnText: { fontSize: 10 },
  removeBtn: {
    width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
  },
  compFields: { flexDirection: 'row', gap: 8, marginTop: 8 },
  fieldGroup: { flex: 1 },
  fieldLabel: { fontSize: 10, fontWeight: '700', marginBottom: 3 },
  fieldInput: {
    borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, textAlign: 'center',
  },
  errorText: { color: '#fecaca', fontWeight: '600', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '75%', borderTopWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 10, gap: 6 },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 8, borderRadius: 10,
    borderWidth: 1,
  },
  tabText: { fontSize: 12, fontWeight: '600' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 10, marginBottom: 6,
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 13 },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  pickerDot: { width: 8, height: 8, borderRadius: 4 },
  pickerInfo: { flex: 1 },
  pickerTitle: { fontSize: 14, fontWeight: '600' },
  pickerEmpty: { fontSize: 13, textAlign: 'center', paddingVertical: 24 },
});
