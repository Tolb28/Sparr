import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, RefreshControl, Animated, TextInput, View, Pressable, StyleSheet, Modal } from 'react-native';
import { Text } from '@/components/ui/text';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import CategorySection from '../components/CategorySection';
import { getTechniquesGrouped, getDrillsGrouped, getCombinationsGrouped } from '../api/techniques';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/glass-card';
import { TabBar } from '@/components/ui/tab-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { colors } from '@/src/theme/colors';

type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SIDEBAR_WIDTH = 280;

interface GroupedItem {
  categoryName: string;
  items: any[];
}

export default function TechniqueScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'techniques' | 'drills' | 'combinations'>('techniques');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarAnim = React.useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  const [techniquesData, setTechniquesData] = useState<GroupedItem[]>([]);
  const [drillsData, setDrillsData] = useState<GroupedItem[]>([]);
  const [combinationsData, setCombinationsData] = useState<GroupedItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const openSidebar = useCallback(() => {
    sidebarAnim.setValue(-SIDEBAR_WIDTH);
    setSidebarOpen(true);
    // Animation starts in Modal's onShow after the native view is created
  }, [sidebarAnim]);

  const closeSidebar = useCallback(() => {
    Animated.timing(sidebarAnim, {
      toValue: -SIDEBAR_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSidebarOpen(false));
  }, [sidebarAnim]);

  const loadData = async (forceRefresh = false) => {
    if (!forceRefresh && activeTab === 'techniques' && techniquesData.length > 0) return;
    if (!forceRefresh && activeTab === 'drills' && drillsData.length > 0) return;
    if (!forceRefresh && activeTab === 'combinations' && combinationsData.length > 0) return;

    setLoading(true);
    try {
      if (activeTab === 'techniques') {
        const data = await getTechniquesGrouped();
        setTechniquesData(data.grouped || []);
      } else if (activeTab === 'drills') {
        const data = await getDrillsGrouped();
        setDrillsData(data.grouped || []);
      } else {
        const data = await getCombinationsGrouped();
        setCombinationsData(data.grouped || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const handleItemPress = (item: any, categoryName: string) => {
    const itemType = activeTab;
    const currentData = getCurrentData();
    const categorySection = currentData.find((section) => section.categoryName === categoryName);
    const categoryItems = categorySection?.items || [];
    const itemIndex = categoryItems.findIndex(
      (i) =>
        (itemType === 'techniques' && i.id_techniques === item.id_techniques) ||
        (itemType === 'drills' && i.id_drills === item.id_drills) ||
        (itemType === 'combinations' && i.id_combinations === item.id_combinations)
    );

    if (itemType === 'techniques' && item.id_techniques) {
      navigation.navigate('TechniqueDetail', {
        technique_id: item.id_techniques,
        category: categoryName,
        items: categoryItems,
        initialIndex: itemIndex >= 0 ? itemIndex : 0,
      });
    } else if (itemType === 'drills' && item.id_drills) {
      navigation.navigate('DrillDetail', {
        drill_id: item.id_drills,
        category: categoryName,
        items: categoryItems,
        initialIndex: itemIndex >= 0 ? itemIndex : 0,
      });
    } else if (itemType === 'combinations' && item.id_combinations) {
      navigation.navigate('CombinationDetail', {
        combination_id: item.id_combinations,
        category: categoryName,
        items: categoryItems,
        initialIndex: itemIndex >= 0 ? itemIndex : 0,
      });
    }
  };

  const getCurrentData = () => {
    if (activeTab === 'techniques') return techniquesData;
    if (activeTab === 'drills') return drillsData;
    return combinationsData;
  };

  const currentData = getCurrentData();
  const categories = Array.from(new Set(currentData.map((item) => item.categoryName))).sort();

  const filteredData = currentData
    .filter((categorySection) => {
      const categoryMatch = !selectedCategory || categorySection.categoryName === selectedCategory;
      const searchMatch =
        !searchQuery ||
        categorySection.items.some((item: any) => item.title?.toLowerCase().includes(searchQuery.toLowerCase()));
      return categoryMatch && searchMatch;
    })
    .map((categorySection) => ({
      ...categorySection,
      items: searchQuery
        ? categorySection.items.filter((item: any) => item.title?.toLowerCase().includes(searchQuery.toLowerCase()))
        : categorySection.items,
    }))
    .filter((section) => section.items.length > 0);

  const TECHNIQUE_TABS = [
    { key: 'techniques', label: 'Techniques' },
    { key: 'drills', label: 'Drills' },
    { key: 'combinations', label: 'Combos' },
  ];

  const featured = currentData[0]?.items?.[0];

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: (insets.top || 0) + 6 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => openSidebar()} style={styles.iconBtn}>
            <Ionicons name="menu" size={24} color="#ffffff" />
          </Pressable>
          <Text style={styles.headerTitle}>Technique Library</Text>
          <View style={styles.iconBtn} />
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.text.tertiary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search techniques, drills..."
            placeholderTextColor={colors.text.tertiary}
            style={styles.searchInput}
          />
        </View>

        <TabBar
          tabs={TECHNIQUE_TABS}
          activeTab={activeTab}
          onTabChange={(t) => {
            setActiveTab(t as 'techniques' | 'drills' | 'combinations');
            setSelectedCategory(null);
            setSearchQuery('');
          }}
          style={styles.tabs}
        />
      </View>

      <View style={styles.flex1}>
        {featured && (
          <Pressable
            onPress={() => handleItemPress(featured, currentData[0]?.categoryName || '')}
            style={styles.featuredPressable}
          >
            <GlassCard variant="red" radius={14} padding={14}>
              <Text style={styles.featuredLabel}>Drill of the Day</Text>
              <Text style={styles.featuredTitle} numberOfLines={2}>{featured.title}</Text>
              <Text style={styles.featuredCta}>Watch Now →</Text>
            </GlassCard>
          </Pressable>
        )}

        {loading && !refreshing ? (
          <View style={styles.centerContent}>
            <EmptyState icon="hourglass-outline" title="Loading..." />
          </View>
        ) : filteredData.length === 0 ? (
          <EmptyState icon="library-outline" title="Nothing found" subtitle="Try a different search or category" style={styles.emptyState} />
        ) : (
          <FlatList
            data={filteredData}
            keyExtractor={(item) => item.categoryName}
            renderItem={({ item }) => (
              <CategorySection
                categoryName={item.categoryName}
                items={item.items}
                itemType={activeTab === 'drills' ? 'drill' : activeTab === 'techniques' ? 'technique' : 'combination'}
                onItemPress={handleItemPress}
              />
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary.main} />}
            contentContainerStyle={{ paddingBottom: 90, paddingTop: 6 }}
          />
        )}
      </View>

      {/* Sidebar via Modal for reliable cross-platform touch handling */}
      <Modal
        visible={sidebarOpen}
        transparent
        animationType="none"
        onShow={() => {
          Animated.timing(sidebarAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }).start();
        }}
        onRequestClose={closeSidebar}
      >
        <View style={{ flex: 1 }}>
        <Pressable style={styles.sidebarBackdrop} onPress={closeSidebar} />
        <Animated.View
          style={[styles.sidebar, {
            transform: [{ translateX: sidebarAnim }],
            paddingTop: (insets.top || 0) + 20,
          }]}
        >
          <View style={styles.sidebarContent}>
            <Pressable
              onPress={() => { setSelectedCategory(null); closeSidebar(); }}
              style={[styles.sidebarItem, selectedCategory === null && styles.sidebarItemActive]}
            >
              <Text style={[styles.sidebarItemText, selectedCategory === null && styles.sidebarItemTextActive]}>
                All Categories
              </Text>
            </Pressable>
            <Text style={styles.sidebarSectionLabel}>CATEGORIES</Text>
            {categories.map((category) => (
              <Pressable
                key={category}
                onPress={() => { setSelectedCategory(category); closeSidebar(); }}
                style={[styles.sidebarItem, selectedCategory === category && styles.sidebarItemActive]}
              >
                <Text style={[styles.sidebarItemText, selectedCategory === category && styles.sidebarItemTextActive]}>
                  {category}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.secondary },
  flex1: { flex: 1 },
  header: {
    paddingHorizontal: 16, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border.light,
    backgroundColor: colors.background.secondary,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10 },
  headerTitle: { color: colors.text.primary, fontSize: 18, fontWeight: '800' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.background.card, borderRadius: 12,
    paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border.light, marginBottom: 10,
  },
  searchInput: { flex: 1, color: colors.text.primary, paddingVertical: 11, fontSize: 14 },
  tabs: { marginBottom: 0 },
  featuredPressable: { marginHorizontal: 14, marginTop: 12, marginBottom: 4 },
  featuredLabel: { color: colors.text.tertiary, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  featuredTitle: { color: colors.text.primary, fontSize: 15, fontWeight: '700' },
  featuredCta: { color: colors.primary.main, fontSize: 12, fontWeight: '600', marginTop: 6 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { paddingTop: 60 },
  sidebarBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10,
  },  sidebar: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: SIDEBAR_WIDTH,
    zIndex: 20, backgroundColor: colors.background.primary,
    borderRightWidth: 1, borderRightColor: colors.border.light, elevation: 5,
  },
  sidebarContent: { paddingHorizontal: 14 },
  sidebarItem: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, marginBottom: 2 },
  sidebarItemActive: { backgroundColor: colors.background.card },
  sidebarItemText: { color: colors.text.secondary, fontSize: 14 },
  sidebarItemTextActive: { color: colors.primary.main, fontWeight: '700' },
  sidebarSectionLabel: { color: colors.text.tertiary, fontSize: 10, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 12, paddingVertical: 8 },
});
