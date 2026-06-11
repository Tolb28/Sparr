import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  ScrollView,
  Switch,
  Dimensions,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { DifficultyBadge, DifficultyLevel } from './DifficultyBadge';

export interface FilterOptions {
  difficulties: DifficultyLevel[];
  favoritesOnly: boolean;
  sortBy: 'popularity' | 'recent' | 'name';
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

const DIFFICULTIES: DifficultyLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const SORT_OPTIONS: { key: 'popularity' | 'recent' | 'name'; label: string }[] = [
  { key: 'popularity', label: 'Most Popular' },
  { key: 'recent', label: 'Recently Added' },
  { key: 'name', label: 'Name (A-Z)' },
];

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApply,
  currentFilters,
}) => {
  const c = useThemeColors();
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);

  const toggleDifficulty = useCallback((difficulty: DifficultyLevel) => {
    setFilters((prev) => {
      const newDifficulties = prev.difficulties.includes(difficulty)
        ? prev.difficulties.filter((d) => d !== difficulty)
        : [...prev.difficulties, difficulty];
      return { ...prev, difficulties: newDifficulties };
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setFilters({
      difficulties: [],
      favoritesOnly: false,
      sortBy: 'popularity',
    });
  }, []);

  const handleApply = useCallback(() => {
    onApply(filters);
    onClose();
  }, [filters, onApply, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: c.background.primary }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: c.border.light }]}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={c.text.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: c.text.primary }]}>Filters</Text>
          <Pressable onPress={handleClearAll} hitSlop={8}>
            <Text style={[styles.clearText, { color: c.primary.main }]}>Clear All</Text>
          </Pressable>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Difficulty */}
          <View style={[styles.section, { borderBottomColor: c.border.light }]}>
            <Text style={[styles.sectionTitle, { color: c.text.primary }]}>Difficulty Level</Text>
            <View style={styles.optionsGrid}>
              {DIFFICULTIES.map((difficulty) => (
                <Pressable
                  key={difficulty}
                  onPress={() => toggleDifficulty(difficulty)}
                  style={[
                    styles.option,
                    { borderColor: c.border.light, backgroundColor: c.background.card },
                    filters.difficulties.includes(difficulty) && {
                      borderColor: c.primary.main,
                      backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    },
                  ]}
                >
                  <DifficultyBadge difficulty={difficulty} size="sm" />
                </Pressable>
              ))}
            </View>
          </View>

          {/* Sort */}
          <View style={[styles.section, { borderBottomColor: c.border.light }]}>
            <Text style={[styles.sectionTitle, { color: c.text.primary }]}>Sort By</Text>
            {SORT_OPTIONS.map((sort) => (
              <Pressable
                key={sort.key}
                onPress={() => setFilters((prev) => ({ ...prev, sortBy: sort.key }))}
                style={styles.radio}
              >
                <View
                  style={[
                    styles.radioCircle,
                    { borderColor: c.border.light },
                    filters.sortBy === sort.key && {
                      borderColor: c.primary.main,
                      backgroundColor: c.primary.main,
                    },
                  ]}
                />
                <Text style={[styles.radioLabel, { color: c.text.primary }]}>{sort.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Favorites Only */}
          <View style={[styles.section, styles.favoritesSection, { borderBottomWidth: 0 }]}>
            <Text style={[styles.sectionTitle, { color: c.text.primary }]}>Favorites Only</Text>
            <Switch
              value={filters.favoritesOnly}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, favoritesOnly: value }))
              }
              trackColor={{ false: c.border.light, true: c.primary.main }}
              thumbColor="#ffffff"
            />
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: c.border.light, backgroundColor: c.background.primary }]}>
          <Pressable
            onPress={onClose}
            style={[styles.button, styles.buttonSecondary, { backgroundColor: c.background.card, borderColor: c.border.light }]}
          >
            <Text style={[styles.buttonSecondaryText, { color: c.text.primary }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleApply}
            style={[styles.button, styles.buttonPrimary, { backgroundColor: c.primary.main }]}
          >
            <Text style={styles.buttonPrimaryText}>Apply Filters</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Dimensions.get('window').height * 0.05,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  clearText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  favoritesSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  option: {
    width: '48%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  radio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPrimary: {},
  buttonPrimaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonSecondary: {
    borderWidth: 1,
  },
  buttonSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
