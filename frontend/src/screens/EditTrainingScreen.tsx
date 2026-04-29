import React, { useCallback, useEffect, useState } from 'react';
import {
  View, ScrollView, TextInput, Pressable, FlatList, Modal, Alert,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { GlassCard } from '@/components/ui/glass-card';
import { SparrButton } from '@/components/ui/sparr-button';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
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
  const { trainingId } = route.params;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [components, setComponents] = useState<LocalComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        const comps = (resp?.components || []).map((c: any, i: number) => {
          const type: Tab = c.id_drills ? 'drills' : c.id_combinations ? 'combinations' : 'techniques';
          return {
            key: `srv-${c.id_trainings_components}`,
            serverId: c.id_trainings_components,
            type,
            refId: c.id_drills || c.id_combinations || c.id_techniques || 0,
            title: c.drill_title || c.combination_title || c.technique_title || c.title || 'Exercise',
            sets: c.sets ?? 1,
            reps: c.reps ?? 0,
            length: c.length ?? 0,
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
      const [d, c, t] = await Promise.all([listDrills(), listCombinations(), listTechniques()]);
      setCatalog({
        drills: d?.drills || d || [],
        combinations: c?.combinations || c || [],
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
    setComponents(prev => prev.map(c => c.key === key ? { ...c, [field]: value } : c));
  };

  const removeComp = (key: string) => {
    const comp = components.find(c => c.key === key);
    if (comp?.serverId) setRemovedServerIds(prev => [...prev, comp.serverId!]);
    setComponents(prev => prev.filter(c => c.key !== key));
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

  const totalDuration = components.reduce((acc, c) => {
    if (c.length > 0) return acc + c.length * (c.sets || 1);
    if (c.reps > 0) return acc + (c.sets || 1) * c.reps * 3;
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
      for (const comp of components.filter(c => c.isNew)) {
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

  const handleDelete = () => {
    Alert.alert('Delete Training', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteTrainingApi(trainingId);
            nav.goBack();
          } catch {
            setError('Failed to delete');
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: (insets.top || 0) + 8 }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Edit Training</Text>
        </View>
        <Pressable onPress={handleDelete} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={18} color={colors.primary.main} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <GlassCard variant="medium" radius={14} padding={16}>
          <Text style={styles.label}>Training Name</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle}
            placeholder="Training name" placeholderTextColor={colors.text.tertiary} />
          <Text style={[styles.label, { marginTop: 12 }]}>Description</Text>
          <TextInput style={[styles.input, { height: 64, textAlignVertical: 'top' }]}
            value={description} onChangeText={setDescription}
            placeholder="Optional…" placeholderTextColor={colors.text.tertiary} multiline />
        </GlassCard>

        <GlassCard variant="medium" radius={14} padding={14}>
          <View style={styles.durationRow}>
            <View style={styles.durationIconWrap}>
              <Ionicons name="time-outline" size={18} color={colors.primary.main} />
            </View>
            <View>
              <Text style={styles.durationLabel}>Estimated Duration</Text>
              <Text style={styles.durationValue}>{formatDur(totalDuration)}</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{components.length} exercises</Text>
            </View>
          </View>
        </GlassCard>

        <GlassCard variant="medium" radius={14} padding={16}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>Exercises</Text>
            <Pressable style={styles.addBtn} onPress={openPicker}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>

          {components.length === 0 ? (
            <View style={styles.emptyExercises}>
              <Ionicons name="barbell-outline" size={32} color={colors.text.tertiary} />
              <Text style={styles.emptyTitle}>No exercises</Text>
            </View>
          ) : (
            components.map((comp, i) => (
              <View key={comp.key} style={styles.compItem}>
                <View style={styles.compHeader}>
                  <View style={[styles.compTypeDot, { backgroundColor: TAB_META[comp.type].color }]} />
                  <Text style={styles.compTitle} numberOfLines={1}>{comp.title}</Text>
                  <View style={styles.compActions}>
                    <Pressable onPress={() => moveComp(i, 'up')} disabled={i === 0}
                      style={[styles.miniBtn, i === 0 && styles.miniBtnDisabled]}>
                      <Text style={styles.miniBtnText}>▲</Text>
                    </Pressable>
                    <Pressable onPress={() => moveComp(i, 'down')} disabled={i === components.length - 1}
                      style={[styles.miniBtn, i === components.length - 1 && styles.miniBtnDisabled]}>
                      <Text style={styles.miniBtnText}>▼</Text>
                    </Pressable>
                    <Pressable onPress={() => removeComp(comp.key)} style={styles.removeBtn}>
                      <Ionicons name="close" size={14} color={colors.primary.main} />
                    </Pressable>
                  </View>
                </View>
                <View style={styles.compFields}>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Sets</Text>
                    <TextInput style={styles.fieldInput}
                      value={String(comp.sets || '')}
                      onChangeText={v => updateComp(comp.key, 'sets', parseInt(v) || 0)}
                      keyboardType="number-pad" placeholder="1" placeholderTextColor={colors.text.tertiary} />
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Reps</Text>
                    <TextInput style={styles.fieldInput}
                      value={String(comp.reps || '')}
                      onChangeText={v => updateComp(comp.key, 'reps', parseInt(v) || 0)}
                      keyboardType="number-pad" placeholder="—" placeholderTextColor={colors.text.tertiary} />
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Sec</Text>
                    <TextInput style={styles.fieldInput}
                      value={String(comp.length || '')}
                      onChangeText={v => updateComp(comp.key, 'length', parseInt(v) || 0)}
                      keyboardType="number-pad" placeholder="—" placeholderTextColor={colors.text.tertiary} />
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

      {/* Picker Modal — same as CreateTrainingScreen */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPickerOpen(false)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Exercise</Text>
              <Pressable onPress={() => setPickerOpen(false)}>
                <Ionicons name="close" size={22} color={colors.text.secondary} />
              </Pressable>
            </View>
            <View style={styles.tabRow}>
              {(Object.keys(TAB_META) as Tab[]).map(tab => (
                <Pressable key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]}
                  onPress={() => setActiveTab(tab)}>
                  <Ionicons name={TAB_META[tab].icon as any} size={16}
                    color={activeTab === tab ? TAB_META[tab].color : colors.text.tertiary} />
                  <Text style={[styles.tabText, activeTab === tab && { color: TAB_META[tab].color }]}>
                    {TAB_META[tab].label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color={colors.text.tertiary} />
              <TextInput style={styles.searchInput} value={search} onChangeText={setSearch}
                placeholder={`Search…`} placeholderTextColor={colors.text.tertiary} />
            </View>
            {loadingCatalog ? (
              <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary.main} />
            ) : (
              <FlatList data={filteredItems}
                keyExtractor={(item: any) => String(item.id_drills || item.id_combinations || item.id_techniques)}
                renderItem={({ item }) => (
                  <Pressable style={styles.pickerItem} onPress={() => addFromPicker(item)}>
                    <View style={[styles.pickerDot, { backgroundColor: TAB_META[activeTab].color }]} />
                    <View style={styles.pickerInfo}>
                      <Text style={styles.pickerTitle}>{item.title}</Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={20} color={colors.primary.main} />
                  </Pressable>
                )}
                ListEmptyComponent={<Text style={styles.pickerEmpty}>No items found</Text>}
                style={{ maxHeight: 300 }}
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
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: colors.text.primary, fontSize: 18, fontWeight: '800' },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.glass.surface, borderWidth: 1, borderColor: colors.glass.border,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { padding: 16, gap: 12 },
  label: { color: colors.text.primary, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: {
    backgroundColor: colors.glass.surface, borderRadius: 10, borderWidth: 1,
    borderColor: colors.glass.border, color: colors.text.primary,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  durationIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.glass.redSurface, alignItems: 'center', justifyContent: 'center',
  },
  durationLabel: { color: colors.text.tertiary, fontSize: 11 },
  durationValue: { color: colors.text.primary, fontSize: 16, fontWeight: '800' },
  countBadge: {
    marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    backgroundColor: colors.glass.surface, borderWidth: 1, borderColor: colors.glass.border,
  },
  countBadgeText: { color: colors.text.secondary, fontSize: 11, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: colors.primary.main,
  },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  emptyExercises: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  emptyTitle: { color: colors.text.secondary, fontWeight: '600', fontSize: 14 },
  compItem: { borderBottomWidth: 1, borderBottomColor: colors.glass.border, paddingVertical: 10 },
  compHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compTypeDot: { width: 8, height: 8, borderRadius: 4 },
  compTitle: { flex: 1, color: colors.text.primary, fontSize: 13, fontWeight: '600' },
  compActions: { flexDirection: 'row', gap: 4 },
  miniBtn: {
    width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.glass.medium,
  },
  miniBtnDisabled: { opacity: 0.3 },
  miniBtnText: { color: colors.text.secondary, fontSize: 10 },
  removeBtn: {
    width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.glass.redSurface,
  },
  compFields: { flexDirection: 'row', gap: 8, marginTop: 8 },
  fieldGroup: { flex: 1 },
  fieldLabel: { color: colors.text.tertiary, fontSize: 10, fontWeight: '700', marginBottom: 3 },
  fieldInput: {
    backgroundColor: colors.glass.surface, borderRadius: 8, borderWidth: 1,
    borderColor: colors.glass.border, color: colors.text.primary,
    paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, textAlign: 'center',
  },
  errorText: { color: '#fecaca', fontWeight: '600', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '75%', borderTopWidth: 1, borderTopColor: colors.border.light,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border.light,
  },
  modalTitle: { color: colors.text.primary, fontSize: 16, fontWeight: '700' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 10, gap: 6 },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 8, borderRadius: 10,
    backgroundColor: colors.glass.surface, borderWidth: 1, borderColor: colors.glass.border,
  },
  tabActive: { borderColor: colors.primary.main, backgroundColor: colors.glass.redSurface },
  tabText: { color: colors.text.tertiary, fontSize: 12, fontWeight: '600' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 10, marginBottom: 6,
    backgroundColor: colors.glass.surface, borderRadius: 10, borderWidth: 1,
    borderColor: colors.glass.border, paddingHorizontal: 10, paddingVertical: 8,
  },
  searchInput: { flex: 1, color: colors.text.primary, fontSize: 13 },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.glass.border,
  },
  pickerDot: { width: 8, height: 8, borderRadius: 4 },
  pickerInfo: { flex: 1 },
  pickerTitle: { color: colors.text.primary, fontSize: 14, fontWeight: '600' },
  pickerEmpty: { color: colors.text.tertiary, fontSize: 13, textAlign: 'center', paddingVertical: 24 },
});
