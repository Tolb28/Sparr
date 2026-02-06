import React, { useState, useEffect } from 'react';
import { FlatList, RefreshControl, Animated, Dimensions } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import CategorySection from '../components/CategorySection';
import { getTechniquesGrouped, getDrillsGrouped, getCombinationsGrouped } from '../api/techniques';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SIDEBAR_WIDTH = 280;

interface GroupedItem {
  categoryName: string;
  items: any[];
}

export default function TechniqueScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const [activeTab, setActiveTab] = useState<'techniques' | 'drills' | 'combinations'>('techniques');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // 1. Initialize Animated Value
  const sidebarAnim = React.useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  
  const [techniquesData, setTechniquesData] = useState<GroupedItem[]>([]);
  const [drillsData, setDrillsData] = useState<GroupedItem[]>([]);
  const [combinationsData, setCombinationsData] = useState<GroupedItem[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // 2. Imperative Toggle Function (Fixes the first-click bug)
  const toggleSidebar = (open: boolean) => {
    setSidebarOpen(open);
    Animated.timing(sidebarAnim, {
      toValue: open ? 0 : -SIDEBAR_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

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
      } else if (activeTab === 'combinations') {
        const data = await getCombinationsGrouped();
        setCombinationsData(data.grouped || []);
      }
    } catch (err: any) {
      console.log('Error loading data:', err?.message || err);
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
    
    // Get current category's items
    const currentData = getCurrentData();
    const categorySection = currentData.find(section => section.categoryName === categoryName);
    const categoryItems = categorySection?.items || [];
    const itemIndex = categoryItems.findIndex(i => 
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

  const filteredData = currentData.filter((categorySection) => {
    const categoryMatch = !selectedCategory || categorySection.categoryName === selectedCategory;
    const searchMatch = !searchQuery || categorySection.items.some((item: any) =>
        item.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return categoryMatch && searchMatch;
  });

  const displayData = searchQuery
    ? filteredData.map((categorySection) => ({
        ...categorySection,
        items: categorySection.items.filter((item: any) =>
            item.title?.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter((section) => section.items.length > 0)
    : filteredData;

  // 3. Interpolate sidebar position for backdrop opacity
  const backdropOpacity = sidebarAnim.interpolate({
    inputRange: [-SIDEBAR_WIDTH, 0],
    outputRange: [0, 1],
  });

  return (
    <Box className="flex-1" style={{ backgroundColor: colors.background.secondary }}>
      {/* Header */}
      <HStack className="pt-12 px-3 items-center gap-2" style={{ backgroundColor: colors.card.background, borderBottomColor: colors.border.light, borderBottomWidth: 1 }}>
        <Pressable onPress={() => toggleSidebar(!sidebarOpen)} className="p-2 rounded-lg active:bg-gray-100">
          <Ionicons name="menu" size={28} color={colors.text.primary} />
        </Pressable>
        <HStack className="flex-1 items-center gap-1">
          {(['techniques', 'drills', 'combinations'] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => {
                setActiveTab(tab);
                setSelectedCategory(null);
                setSearchQuery('');
              }}
              className={`py-4 px-4 border-b-3 flex-1 items-center`}
              style={{
                borderBottomColor: activeTab === tab ? colors.primary.dark : 'transparent',
              }}
            >
              <Text className={`font-bold text-sm`} style={{ color: activeTab === tab ? colors.primary.dark : colors.text.secondary }}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </HStack>
      </HStack>

      {/* Search */}
      <HStack className="items-center px-3 py-3 gap-2">
        <Input variant="outline" className="flex-1 rounded-lg p-1 bg-transparent" style={{ borderColor: colors.border.medium }}>
          <InputField
            className="p-0"
            placeholder="Search..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.text.tertiary}
          />
          <InputSlot>
            <Ionicons name="search-outline" size={20} color={colors.text.tertiary} />
          </InputSlot>
        </Input>
      </HStack>

      {/* Main Content List */}
      <VStack className="flex-1">
        {loading && !refreshing ? (
          <VStack className="flex-1 items-center justify-center"><Text>Loading...</Text></VStack>
        ) : (
          <FlatList
            data={displayData}
            keyExtractor={(item) => item.categoryName}
            renderItem={({ item }) => (
              <CategorySection 
                categoryName={item.categoryName} 
                items={item.items} 
                itemType={activeTab === 'drills' ? 'drill' : activeTab === 'techniques' ? 'technique' : 'combination'}
                onItemPress={handleItemPress} 
              />
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            contentContainerStyle={{ paddingBottom: 80 }}
          />
        )}
      </VStack>

      {/* 4. Backdrop (Animated Opacity) */}
      <Animated.View
        pointerEvents={sidebarOpen ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: colors.overlay.medium,
          opacity: backdropOpacity,
          zIndex: 10,
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={() => toggleSidebar(false)} />
      </Animated.View>

      {/* 5. Sliding Sidebar (Rendered last for Z-index reliability) */}
      <Animated.View
        style={{
          transform: [{ translateX: sidebarAnim }],
          position: 'absolute',
          left: 0, top: 0, bottom: 0,
          width: SIDEBAR_WIDTH,
          zIndex: 20,
          backgroundColor: colors.card.background,
          borderRightWidth: 1,
          borderRightColor: colors.border.light,
          elevation: 5, // Shadow for Android
        }}
      >
        <VStack className="flex-1 pt-20" style={{ backgroundColor: colors.card.background }}>
          <VStack className="px-4 pb-4">
            <Pressable
              onPress={() => {
                setSelectedCategory(null);
                toggleSidebar(false);
              }}
              className={`py-3 px-3 rounded-lg mb-2`}
              style={{ backgroundColor: selectedCategory === null ? colors.primary.lighter : 'transparent' }}
            >
              <Text className={`text-base font-semibold`} style={{ color: selectedCategory === null ? colors.primary.dark : colors.text.secondary }}>
                All Categories
              </Text>
            </Pressable>
            
            <Text className="text-sm font-semibold px-3 py-2 uppercase" style={{ color: colors.text.tertiary }}>Categories</Text>
            
            {categories.map((category: string) => (
              <Pressable
                key={category}
                onPress={() => {
                  setSelectedCategory(category);
                  toggleSidebar(false);
                }}
                className={`py-3 px-4 rounded-lg mb-1`}
                style={{ backgroundColor: selectedCategory === category ? colors.primary.lighter : 'transparent' }}
              >
                <Text className={`text-base font-medium`} style={{ color: selectedCategory === category ? colors.primary.dark : colors.text.secondary }}>
                  {category}
                </Text>
              </Pressable>
            ))}
          </VStack>
        </VStack>
      </Animated.View>
    </Box>
  );
}