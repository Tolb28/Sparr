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
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { DifficultyBadge, DifficultyLevel } from '../components/DifficultyBadge';
import { FavoriteButton } from '../components/FavoriteButton';
import { ContentTypeIndicator } from '../components/ContentTypeIndicator';
import { FilterModal, FilterOptions } from '../components/FilterModal';

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
  const c = useThemeColors();
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
  
  // New state for filtering and favorites
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterOptions>({
    difficulties: [],
    favoritesOnly: false,
    sortBy: 'popularity',
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [recommendedItems, setRecommendedItems] = useState<RecommendedContentItem[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);

  // Helper: Add mock difficulty to items (temporary until backend implements)
  const addMockDifficulty = (item: any) => {
    if (!item.difficulty) {
      const difficulties: DifficultyLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
      item.difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
    }
    return item;
  };

  // Helper: Generate unique key for content item
  const getItemKey = (item: any, type: 'techniques' | 'drills' | 'combinations'): string => {
    if (type === 'techniques') return `technique-${item.id_techniques}`;
    if (type === 'drills') return `drill-${item.id_drills}`;
    return `combo-${item.id_combinations}`;
  };

  // Toggle favorite
  const toggleFavorite = useCallback((itemKey: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(itemKey)) {
        newFavorites.delete(itemKey);
      } else {
        newFavorites.add(itemKey);
      }
      return newFavorites;
    });
  }, []);

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
        const grouped = (data.grouped || []).map((group: any) => ({
          ...group,
          items: group.items.map(addMockDifficulty),
        }));
        setTechniquesData(grouped);
      } else if (activeTab === 'drills') {
        const data = await getDrillsGrouped();
        const grouped = (data.grouped || []).map((group: any) => ({
          ...group,
          items: group.items.map(addMockDifficulty),
        }));
        setDrillsData(grouped);
      } else {
        const data = await getCombinationsGrouped();
        const grouped = (data.grouped || []).map((group: any) => ({
          ...group,
          items: group.items.map(addMockDifficulty),
        }));
        setCombinationsData(grouped);
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
    const reasonMap: Record<string, string> = {
      'match_style': 'Your style',
      'match_weight': 'Your weight class',
      'match_height': 'Your height',
      'match_experience': 'Your level',
      'popular_with_community': 'Popular',
      'fallback_popularity': 'Trending',
    };
    return reasonMap[reason] || reason;
  };

  const getCurrentData = () => {
    if (activeTab === 'techniques') return techniquesData;
    if (activeTab === 'drills') return drillsData;
    return combinationsData;
  };

  const currentData = getCurrentData();
  const categories = Array.from(new Set(currentData.map((item) => item.categoryName))).sort();

  // Apply filters to the data
  const filteredData = currentData
    .filter((categorySection) => {
      const categoryMatch = !selectedCategory || categorySection.categoryName === selectedCategory;
      const searchMatch =
        !searchQuery ||
        categorySection.items.some((item: any) => item.title?.toLowerCase().includes(searchQuery.toLowerCase()));
      return categoryMatch && searchMatch;
    })
    .map((categorySection) => {
      let items = searchQuery
        ? categorySection.items.filter((item: any) => item.title?.toLowerCase().includes(searchQuery.toLowerCase()))
        : categorySection.items;

      // Apply difficulty filter
      if (filters.difficulties.length > 0) {
        items = items.filter((item: any) => filters.difficulties.includes(item.difficulty));
      }

      // Apply favorites filter
      if (filters.favoritesOnly) {
        const contentType = activeTab === 'drills' ? 'drill' : activeTab === 'techniques' ? 'technique' : 'combination';
        items = items.filter((item: any) => {
          const itemKey = `${contentType}-${item.id_techniques || item.id_drills || item.id_combinations}`;
          return favorites.has(itemKey);
        });
      }

      // Apply sorting
      if (filters.sortBy === 'name') {
        items = [...items].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      } else if (filters.sortBy === 'recent') {
        items = [...items].sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
      } else {
        // popularity (default)
        items = [...items].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      }

      return {
        ...categorySection,
        items,
      };
    })
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
        <Ionicons name="sparkles-outline" size={16} color={c.primary.main} />
        <Text style={[styles.recommendedTitle, { color: c.text.primary }]}>Recommended for you</Text>
      </View>

      {recommendationsLoading ? (
        <GlassCard variant="medium" radius={12} padding={12} style={styles.recommendedFallback}>
          <Text style={[styles.recommendedFallbackText, { color: c.text.secondary }]}>Loading personalized content...</Text>
        </GlassCard>
      ) : data.length === 0 ? (
        <GlassCard variant="medium" radius={12} padding={12} style={styles.recommendedFallback}>
          <Text style={[styles.recommendedFallbackText, { color: c.text.secondary }]}>
            Complete your profile (style, weight class, height, experience) for better recommendations.
          </Text>
        </GlassCard>
      ) : (
        <FlatList
          horizontal
          data={data}
          keyExtractor={(item) => `${item.content_type}-${item.content_id}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recommendedListContent}
          scrollEnabled={true}
          renderItem={({ item }) => {
            const itemKey = `${item.content_type}-${item.content_id}`;
            const isFavorited = favorites.has(itemKey);
            const difficulties: DifficultyLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
            const mockDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];

            return (
              <Pressable onPress={() => handleRecommendedPress(item)} style={styles.recommendedCardPressable}>
                <GlassCard variant="medium" radius={14} padding={12} style={styles.recommendedCard}>
                  <View style={styles.recommendedCardHeader}>
                    <ContentTypeIndicator type={item.content_type as 'technique' | 'drill' | 'combination'} variant="text" />
                    <Text style={[styles.recommendedCardScore, { color: c.text.tertiary }]}>Score {item.score}</Text>
                  </View>
                  <Text style={[styles.recommendedCardTitle, { color: c.text.primary }]} numberOfLines={2}>{item.title}</Text>
                  {!!item.category_name && (
                    <Text style={[styles.recommendedCardCategory, { color: c.text.secondary }]} numberOfLines={1}>
                      {item.category_name}
                    </Text>
                  )}
                  <View style={styles.recommendedBadgesRow}>
                    <DifficultyBadge difficulty={mockDifficulty} size="sm" />
                    <FavoriteButton
                      isFavorited={isFavorited}
                      onToggle={() => toggleFavorite(itemKey)}
                      size="sm"
                    />
                  </View>
                  <View style={styles.reasonsRow}>
                    {item.reasons.slice(0, 2).map((reason) => (
                      <View key={reason} style={[styles.reasonChip, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]}>
                        <Text style={[styles.reasonChipText, { color: c.text.secondary }]}>{formatReason(reason)}</Text>
                      </View>
                    ))}
                  </View>
                </GlassCard>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: c.background.secondary }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: (insets.top || 0) + 6, backgroundColor: c.background.secondary, borderBottomColor: c.border.light }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: c.text.primary }]}>Technique Library</Text>
            <Pressable onPress={() => openSidebar()} style={styles.iconBtn}>
              <Ionicons name="menu" size={24} color="#ffffff" />
            </Pressable>
          </View>

          {/* Search + Filter Bar */}
          <View style={styles.searchFilterRow}>
            <View style={[styles.searchBar, { backgroundColor: c.background.card, borderColor: c.border.light }]}>
              <Ionicons name="search" size={18} color={c.text.tertiary} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search techniques, drills..."
                placeholderTextColor={c.text.tertiary}
                style={[styles.searchInput, { color: c.text.primary }]}
              />
            </View>
            <Pressable
              onPress={() => setFilterModalOpen(true)}
              style={[
                styles.filterBtn,
                { backgroundColor: c.background.card, borderColor: c.border.light },
                (filters.difficulties.length > 0 || filters.favoritesOnly) && [styles.filterBtnActive, { borderColor: c.primary.main }],
              ]}
            >
              <Ionicons
                name="options"
                size={20}
                color={(filters.difficulties.length > 0 || filters.favoritesOnly) ? c.primary.main : c.text.secondary}
              />
            </Pressable>
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
                  const difficulties: DifficultyLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
                  const mockDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
                  const contentType = activeTab === 'drills' ? 'drill' : activeTab === 'techniques' ? 'technique' : 'combination';
                  const itemKey = `${contentType}-${item.item.id_techniques || item.item.id_drills || item.item.id_combinations}`;
                  const isFavorited = favorites.has(itemKey);

                  return (
                    <Pressable
                      onPress={() => handleItemPress(item.item, item.categoryName)}
                      style={{ marginHorizontal: 14, marginTop: 6, marginBottom: 12 }}
                    >
                      <GlassCard variant="red" radius={14} padding={14}>
                        <View style={styles.featuredHeaderRow}>
                          <View>
                            <Text style={[styles.featuredLabel, { color: c.text.tertiary }]}>Featured Content</Text>
                            <Text style={[styles.featuredTitle, { color: c.text.primary }]} numberOfLines={2}>{item.item.title}</Text>
                          </View>
                          <FavoriteButton
                            isFavorited={isFavorited}
                            onToggle={() => toggleFavorite(itemKey)}
                            size="md"
                          />
                        </View>
                        <View style={styles.featuredBadgesRow}>
                          <ContentTypeIndicator type={contentType} variant="badge" />
                          <DifficultyBadge difficulty={mockDifficulty} size="sm" />
                        </View>
                        <Text style={[styles.featuredCta, { color: c.primary.main }]}>Tap to View →</Text>
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
                    favorites={favorites}
                    onFavoriteToggle={toggleFavorite}
                  />
                );
              }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.primary.main} />}
              contentContainerStyle={{ paddingBottom: 90, paddingTop: 6 }}
            />
          )}
        </View>

      {/* Sidebar Modal */}
      <Modal
        visible={sidebarOpen}
        transparent={true}
        animationType="none"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={closeSidebar}
      >
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={[styles.sidebarDrawer, { backgroundColor: c.background.primary }]}>
            <View style={[styles.sidebarContent, { paddingTop: (insets.top || 0) + 20 }]}>
              <Pressable
                onPress={() => { setSelectedCategory(null); closeSidebar(); }}
                style={[styles.sidebarItem, selectedCategory === null && [styles.sidebarItemActive, { backgroundColor: c.background.card }]]}
              >
                <Text style={[styles.sidebarItemText, { color: c.text.secondary }, selectedCategory === null && [styles.sidebarItemTextActive, { color: c.primary.main }]]}>
                  All Categories
                </Text>
              </Pressable>
              <Text style={[styles.sidebarSectionLabel, { color: c.text.tertiary }]}>CATEGORIES</Text>
              {categories.length > 0 ? (
                categories.map((category) => (
                  <Pressable
                    key={category}
                    onPress={() => { setSelectedCategory(category); closeSidebar(); }}
                    style={[styles.sidebarItem, selectedCategory === category && [styles.sidebarItemActive, { backgroundColor: c.background.card }]]}
                  >
                    <Text style={[styles.sidebarItemText, { color: c.text.secondary }, selectedCategory === category && [styles.sidebarItemTextActive, { color: c.primary.main }]]}>
                      {category}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <Text style={[styles.sidebarItemText, { color: c.text.secondary }]}>No categories</Text>
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

      {/* Filter Modal */}
      <FilterModal
        visible={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        onApply={(appliedFilters) => setFilters(appliedFilters)}
        currentFilters={filters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex1: { flex: 1 },
  header: {
    paddingHorizontal: 16, paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  searchFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, paddingHorizontal: 12, borderWidth: 1,
  },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14 },
  filterBtn: {
    width: 44, height: 44, borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  tabs: { marginBottom: 0 },
  recommendedHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  recommendedTitle: { fontSize: 14, fontWeight: '700' },
  recommendedFallback: { marginBottom: 6 },
  recommendedFallbackText: { fontSize: 12 },
  recommendedListContent: { gap: 10, paddingBottom: 4 },
  recommendedCardPressable: { marginRight: 2 },
  recommendedCard: { width: 220, minHeight: 118 },
  recommendedCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recommendedCardScore: { fontSize: 10 },
  recommendedCardTitle: { fontSize: 14, fontWeight: '700', marginTop: 6 },
  recommendedCardCategory: { fontSize: 11, marginTop: 3 },
  recommendedBadgesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9, marginBottom: 6 },
  reasonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 0 },
  reasonChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  reasonChipText: { fontSize: 10, fontWeight: '600' },
  featuredLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  featuredTitle: { fontSize: 15, fontWeight: '700' },
  featuredHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  featuredBadgesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  featuredCta: { fontSize: 12, fontWeight: '600', marginTop: 6 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { paddingTop: 60 },
  sidebarDrawer: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    elevation: 5,
  },
  sidebarContent: { paddingHorizontal: 14, flex: 1 },
  sidebarItem: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, marginBottom: 2 },
  sidebarItemActive: {},
  sidebarItemText: { fontSize: 14 },
  sidebarItemTextActive: { fontWeight: '700' },
  sidebarSectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 12, paddingVertical: 8 },
});
