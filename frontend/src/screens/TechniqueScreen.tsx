import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, RefreshControl, Animated, TextInput, View, Pressable, StyleSheet, Modal, Dimensions } from 'react-native';
import { Text } from '@/components/ui/text';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import CategorySection from '../components/CategorySection';
import {
  getTechniquesGrouped,
  getDrillsGrouped,
  getCombinationsGrouped,
  getTrainingContentRecommendations,
  RecommendedContentItem,
} from '../api/techniques';
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

type ScrollListItem = 
  | { type: 'recommended'; items: RecommendedContentItem[] }
  | { type: 'featured'; item: any; categoryName: string }
  | { type: 'category'; categoryName: string; items: any[] }

export default function TechniqueScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'techniques' | 'drills' | 'combinations'>('techniques');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarAnim = React.useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const sidebarBackdropOpacity = React.useRef(new Animated.Value(0)).current;

  const [techniquesData, setTechniquesData] = useState<GroupedItem[]>([]);
  const [drillsData, setDrillsData] = useState<GroupedItem[]>([]);
  const [combinationsData, setCombinationsData] = useState<GroupedItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [recommendedItems, setRecommendedItems] = useState<RecommendedContentItem[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, [sidebarOpen]);

  const closeSidebar = useCallback(() => {
    Animated.timing(sidebarBackdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      setSidebarOpen(false);
    });
  }, [sidebarBackdropOpacity]);

  // Trigger backdrop animation when sidebar opens
  useEffect(() => {
    if (sidebarOpen) {
      sidebarBackdropOpacity.setValue(0);
      Animated.timing(sidebarBackdropOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  }, [sidebarOpen, sidebarBackdropOpacity]);

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

  const getContentFilterForTab = () => {
    if (activeTab === 'techniques') return 'techniques';
    if (activeTab === 'drills') return 'drills';
    return 'combinations';
  };

  const loadRecommendations = useCallback(async () => {
    setRecommendationsLoading(true);
    try {
      const contentFilter = getContentFilterForTab();
      const data = await getTrainingContentRecommendations(contentFilter, 8, true);
      if (contentFilter === 'techniques') setRecommendedItems(data.techniques || []);
      else if (contentFilter === 'drills') setRecommendedItems(data.drills || []);
      else setRecommendedItems(data.combinations || []);
    } catch (err) {
      console.error('Failed to load personalized content:', err);
      setRecommendedItems([]);
    } finally {
      setRecommendationsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(true), loadRecommendations()]);
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

  const handleRecommendedPress = (item: RecommendedContentItem) => {
    if (item.content_type === 'technique') {
      navigation.navigate('TechniqueDetail', {
        technique_id: item.content_id,
        category: 'Recommended',
      });
      return;
    }

    if (item.content_type === 'drill') {
      navigation.navigate('DrillDetail', {
        drill_id: item.content_id,
        category: 'Recommended',
      });
      return;
    }

    navigation.navigate('CombinationDetail', {
      combination_id: item.content_id,
      category: 'Recommended',
    });
  };

  const getMostPopularItem = (data: GroupedItem[]) => {
    let mostPopular: any = null;
    let maxPopularity = -1;
    let categoryName = '';

    for (const section of data) {
      for (const item of section.items) {
        const popularity = item.popularity ?? 0;
        if (popularity > maxPopularity) {
          maxPopularity = popularity;
          mostPopular = item;
          categoryName = section.categoryName;
        }
      }
    }

    return { item: mostPopular || data[0]?.items?.[0], categoryName: categoryName || data[0]?.categoryName || '' };
  };

  const buildScrollListData = (): ScrollListItem[] => {
    const listData: ScrollListItem[] = [];

    if (!loading && filteredData.length > 0) {
      if (recommendedItems.length > 0) {
        listData.push({ type: 'recommended', items: recommendedItems });
      }

      const { item: featuredItem, categoryName: featuredCategory } = getMostPopularItem(filteredData);
      if (featuredItem) {
        listData.push({ type: 'featured', item: featuredItem, categoryName: featuredCategory });
      }
    }

    for (const section of filteredData) {
      listData.push({ type: 'category', categoryName: section.categoryName, items: section.items });
    }

    return listData;
  };

  const formatReason = (reason: string): string => {
    if (reason === 'fallback_popularity') return 'Popular now';
    return reason.replace('match_', '');
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

  const scrollListData = buildScrollListData();
  const renderRecommendedSection = (data: RecommendedContentItem[]) => (
    <View style={{ marginHorizontal: 14, marginBottom: 12 }}>
      <View style={styles.recommendedHeader}>
        <Ionicons name="sparkles-outline" size={16} color={colors.primary.main} />
        <Text style={styles.recommendedTitle}>Doporučeno pro tebe</Text>
      </View>

      {recommendationsLoading ? (
        <GlassCard variant="medium" radius={12} padding={12} style={styles.recommendedFallback}>
          <Text style={styles.recommendedFallbackText}>Načítám personalizovaný obsah...</Text>
        </GlassCard>
      ) : data.length === 0 ? (
        <GlassCard variant="medium" radius={12} padding={12} style={styles.recommendedFallback}>
          <Text style={styles.recommendedFallbackText}>
            Doplň v profilu styl, váhovou kategorii, výšku a zkušenosti pro přesnější doporučení.
          </Text>
        </GlassCard>
      ) : (
        <FlatList
          horizontal
          data={data}
          keyExtractor={(item) => `${item.content_type}-${item.content_id}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recommendedListContent}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <Pressable onPress={() => handleRecommendedPress(item)} style={styles.recommendedCardPressable}>
              <GlassCard variant="medium" radius={14} padding={12} style={styles.recommendedCard}>
                <View style={styles.recommendedCardHeader}>
                  <Text style={styles.recommendedCardType}>{item.content_type.toUpperCase()}</Text>
                  <Text style={styles.recommendedCardScore}>Score {item.score}</Text>
                </View>
                <Text style={styles.recommendedCardTitle} numberOfLines={2}>{item.title}</Text>
                {!!item.category_name && (
                  <Text style={styles.recommendedCardCategory} numberOfLines={1}>
                    {item.category_name}
                  </Text>
                )}
                <View style={styles.reasonsRow}>
                  {item.reasons.slice(0, 2).map((reason) => (
                    <View key={reason} style={styles.reasonChip}>
                      <Text style={styles.reasonChipText}>{formatReason(reason)}</Text>
                    </View>
                  ))}
                </View>
              </GlassCard>
            </Pressable>
          )}
        />
      )}
    </View>
  );

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
          {loading && !refreshing ? (
            <View style={styles.centerContent}>
              <EmptyState icon="hourglass-outline" title="Loading..." />
            </View>
          ) : filteredData.length === 0 ? (
            <EmptyState icon="library-outline" title="Nothing found" subtitle="Try a different search or category" style={styles.emptyState} />
          ) : (
            <FlatList
              data={scrollListData}
              keyExtractor={(item, index) => {
                if (item.type === 'category') return item.categoryName;
                if (item.type === 'recommended') return 'recommended-section';
                return 'featured-section';
              }}
              renderItem={({ item }) => {
                if (item.type === 'recommended') {
                  return renderRecommendedSection(item.items);
                }

                if (item.type === 'featured') {
                  return (
                    <Pressable
                      onPress={() => handleItemPress(item.item, item.categoryName)}
                      style={{ marginHorizontal: 14, marginTop: 6, marginBottom: 12 }}
                    >
                      <GlassCard variant="red" radius={14} padding={14}>
                        <Text style={styles.featuredLabel}>Drill of the Day</Text>
                        <Text style={styles.featuredTitle} numberOfLines={2}>{item.item.title}</Text>
                        <Text style={styles.featuredCta}>Watch Now →</Text>
                      </GlassCard>
                    </Pressable>
                  );
                }

                return (
                  <CategorySection
                    categoryName={item.categoryName}
                    items={item.items}
                    itemType={activeTab === 'drills' ? 'drill' : activeTab === 'techniques' ? 'technique' : 'combination'}
                    onItemPress={handleItemPress}
                  />
                );
              }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary.main} />}
              contentContainerStyle={{ paddingBottom: 90, paddingTop: 6 }}
            />
          )}
        </View>

      {/* Sidebar Modal */}
      <Modal
        visible={sidebarOpen}
        transparent={true}
        animationType="none"
        onRequestClose={closeSidebar}
      >
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={styles.sidebarDrawer}>
            <View style={[styles.sidebarContent, { paddingTop: (insets.top || 0) + 20 }]}>
              <Pressable
                onPress={() => { setSelectedCategory(null); closeSidebar(); }}
                style={[styles.sidebarItem, selectedCategory === null && styles.sidebarItemActive]}
              >
                <Text style={[styles.sidebarItemText, selectedCategory === null && styles.sidebarItemTextActive]}>
                  All Categories
                </Text>
              </Pressable>
              <Text style={styles.sidebarSectionLabel}>CATEGORIES</Text>
              {categories.length > 0 ? (
                categories.map((category) => (
                  <Pressable
                    key={category}
                    onPress={() => { setSelectedCategory(category); closeSidebar(); }}
                    style={[styles.sidebarItem, selectedCategory === category && styles.sidebarItemActive]}
                  >
                    <Text style={[styles.sidebarItemText, selectedCategory === category && styles.sidebarItemTextActive]}>
                      {category}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.sidebarItemText}>No categories</Text>
              )}
            </View>
          </View>
          <Animated.View
            style={[
              { flex: 1, backgroundColor: 'rgba(0, 0, 0, 1)' },
              { opacity: sidebarBackdropOpacity },
            ]}
          >
            <Pressable style={{ flex: 1 }} onPress={closeSidebar} />
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
  recommendedHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  recommendedTitle: { color: colors.text.primary, fontSize: 14, fontWeight: '700' },
  recommendedFallback: { marginBottom: 6 },
  recommendedFallbackText: { color: colors.text.secondary, fontSize: 12 },
  recommendedListContent: { gap: 10, paddingBottom: 4 },
  recommendedCardPressable: { marginRight: 2 },
  recommendedCard: { width: 220, minHeight: 118 },
  recommendedCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recommendedCardType: { color: colors.primary.main, fontSize: 10, fontWeight: '700' },
  recommendedCardScore: { color: colors.text.tertiary, fontSize: 10 },
  recommendedCardTitle: { color: colors.text.primary, fontSize: 14, fontWeight: '700', marginTop: 6 },
  recommendedCardCategory: { color: colors.text.secondary, fontSize: 11, marginTop: 3 },
  reasonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  reasonChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.glass.surface,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  reasonChipText: { color: colors.text.secondary, fontSize: 10, fontWeight: '600' },
  featuredLabel: { color: colors.text.tertiary, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  featuredTitle: { color: colors.text.primary, fontSize: 15, fontWeight: '700' },
  featuredCta: { color: colors.primary.main, fontSize: 12, fontWeight: '600', marginTop: 6 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { paddingTop: 60 },
  sidebarDrawer: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    backgroundColor: colors.background.primary,
    elevation: 5,
  },
  sidebarContent: { paddingHorizontal: 14, flex: 1 },
  sidebarItem: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, marginBottom: 2 },
  sidebarItemActive: { backgroundColor: colors.background.card },
  sidebarItemText: { color: colors.text.secondary, fontSize: 14 },
  sidebarItemTextActive: { color: colors.primary.main, fontWeight: '700' },
  sidebarSectionLabel: { color: colors.text.tertiary, fontSize: 10, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 12, paddingVertical: 8 },
});
