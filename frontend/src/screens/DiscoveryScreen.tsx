import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, RefreshControl, TextInput, ScrollView, View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import FeedPost from '../components/Post';
import { getDiscoveryBoxers, getDiscoveryFeed } from '../api/discovery';
import { getUserProfile } from '../api/profile';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listClubs } from '../api/clubs';
import { useNavigation } from '@react-navigation/native';
import { GlassCard } from '@/components/ui/glass-card';
import { TabBar } from '@/components/ui/tab-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton-loader';
import { colors } from '@/src/theme/colors';
import { getRecommendations, Recommendations } from '../api/recommendations';
import { RecommendationSection, ClubCard, TrainingCard, BoxerCard, CalendarCard } from '../components/RecommendationSection';
import { getReferences, BoxingStyle, WeightClass } from '../api/references';
import {
  getTrainingContentRecommendations,
  TrainingContentRecommendations,
  RecommendedContentItem,
} from '../api/techniques';

export default function DiscoveryScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'foryou' | 'posts' | 'clubs' | 'boxers'>('foryou');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [styleFilter, setStyleFilter] = useState('');
  const [weightClassFilter, setWeightClassFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'text' | 'media'>('all');
  const [clubJoinPolicy, setClubJoinPolicy] = useState<'all' | 'open' | 'approval'>('all');
  const [posts, setPosts] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [boxers, setBoxers] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [personalizedContent, setPersonalizedContent] = useState<TrainingContentRecommendations | null>(null);
  const [recsLoading, setRecsLoading] = useState(false);
  const [boxingStyles, setBoxingStyles] = useState<BoxingStyle[]>([]);
  const [weightClasses, setWeightClasses] = useState<WeightClass[]>([]);

  const LIMIT = 10;

  const loadPosts = useCallback(async (searchQuery: string = '', currentOffset: number = 0) => {
    setLoadingMore((prevLoading) => {
      if (prevLoading) return prevLoading;

      (async () => {
        try {
          const newPosts = await getDiscoveryFeed(LIMIT, currentOffset, searchQuery, {
            type: typeFilter === 'all' ? undefined : typeFilter,
          });
          if (currentOffset === 0) {
            setPosts(newPosts);
            setOffset(LIMIT);
          } else {
            setPosts((prev) => [...prev, ...newPosts]);
            setOffset((prev) => prev + LIMIT);
          }
        } finally {
          setLoadingMore(false);
        }
      })();

      return true;
    });
  }, [typeFilter]);

  const loadClubs = useCallback(async () => {
    try {
      const data = await listClubs({
        query,
        joinPolicy: clubJoinPolicy === 'all' ? undefined : clubJoinPolicy,
        limit: 20,
        offset: 0,
      });
      setClubs(data || []);
    } catch (err: any) {
      console.error('loadClubs failed:', err);
      setClubs([]);
    }
  }, [query, clubJoinPolicy]);

  const loadBoxers = useCallback(async () => {
    try {
      const data = await getDiscoveryBoxers(20, 0, {
        query,
        style: styleFilter,
        weightClass: weightClassFilter,
      });
      setBoxers(data || []);
    } catch (err: any) {
      console.error('loadBoxers failed:', err);
      setBoxers([]);
    }
  }, [query, styleFilter, weightClassFilter]);

  const loadRecommendations = useCallback(async () => {
    setRecsLoading(true);
    try {
      const [data, personalized] = await Promise.all([
        getRecommendations(),
        getTrainingContentRecommendations('all', 4, true),
      ]);
      setRecommendations(data);
      setPersonalizedContent(personalized);
    } catch (err: any) {
      console.error('loadRecommendations failed:', err);
      setRecommendations(null);
      setPersonalizedContent(null);
    } finally {
      setRecsLoading(false);
    }
  }, []);

  const loadActive = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'foryou') {
        await loadRecommendations();
      } else if (activeTab === 'posts') {
        setOffset(0);
        await loadPosts(query, 0);
      } else if (activeTab === 'clubs') {
        await loadClubs();
      } else {
        await loadBoxers();
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, loadPosts, loadClubs, loadBoxers, loadRecommendations, query]);

  useEffect(() => {
    loadActive();
  }, [loadActive]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getUserProfile();
        setProfile(data?.profile ?? data);
      } catch {
        setProfile(null);
      }
    })();
  }, []);

  useEffect(() => {
    const loadRefs = async () => {
      try {
        const refs = await getReferences();
        setBoxingStyles(refs.boxing_styles || []);
        setWeightClasses(refs.weight_classes || []);
      } catch (error) {
        console.error('Failed to load references:', error);
      }
    };
    loadRefs();
  }, []);

  const handleSearch = useCallback(() => {
    loadActive();
  }, [loadActive]);

  const handleLoadMore = useCallback(() => {
    if (activeTab === 'posts') {
      loadPosts(query, offset);
    }
  }, [activeTab, loadPosts, query, offset]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadActive();
    setRefreshing(false);
  }, [loadActive]);

  const DISCOVERY_TABS = [
    { key: 'foryou', label: 'For You' },
    { key: 'posts', label: 'Posts' },
    { key: 'clubs', label: 'Clubs' },
    { key: 'boxers', label: 'Boxers' },
  ];

  const handleTabChange = useCallback((tab: 'foryou' | 'posts' | 'clubs' | 'boxers') => {
    setActiveTab(tab);
    setStyleFilter('');
    setWeightClassFilter('');
    setFiltersOpen(false);
  }, []);

  const personalizedItems = React.useMemo(() => {
    if (!personalizedContent) return [];
    return [
      ...(personalizedContent.techniques || []),
      ...(personalizedContent.drills || []),
      ...(personalizedContent.combinations || []),
    ]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [personalizedContent]);

  const getContentIcon = (item: RecommendedContentItem) => {
    if (item.content_type === 'technique') return 'flash-outline';
    if (item.content_type === 'drill') return 'barbell-outline';
    return 'albums-outline';
  };

  const handlePersonalizedPress = useCallback((item: RecommendedContentItem) => {
    if (item.content_type === 'technique') {
      (navigation as any).navigate('TechniqueDetail', { technique_id: item.content_id, category: 'Recommended' });
      return;
    }
    if (item.content_type === 'drill') {
      (navigation as any).navigate('DrillDetail', { drill_id: item.content_id, category: 'Recommended' });
      return;
    }
    (navigation as any).navigate('CombinationDetail', { combination_id: item.content_id, category: 'Recommended' });
  }, [navigation]);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: (insets.top || 0) + 8 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Avatar size="md">
              <AvatarFallbackText>{profile?.display_name || '?'}</AvatarFallbackText>
              <AvatarImage source={{ uri: profile?.avatar_url || undefined }} />
            </Avatar>
            <Text style={styles.headerTitle}>Discovery</Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable style={styles.iconBtn}>
              <Ionicons name="notifications-outline" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.text.tertiary} />
          <TextInput
            placeholder="Search friends, clubs, boxers..."
            placeholderTextColor={colors.text.tertiary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            style={styles.searchInput}
          />
        </View>

        {/* Tabs */}
        <TabBar
          tabs={DISCOVERY_TABS}
          activeTab={activeTab}
          onTabChange={(t) => handleTabChange(t as 'foryou' | 'posts' | 'clubs' | 'boxers')}
          style={styles.tabs}
        />

        {/* Filter toggle - only show for tabs with filters */}
        {activeTab !== 'foryou' && (
          <View style={styles.filterRow}>
            <Text style={styles.filterHint}>Refine results with filters</Text>
            <Pressable style={styles.filterBtn} onPress={() => setFiltersOpen((v) => !v)}>
              <Ionicons name="options-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.filterBtnText}>Filters {filtersOpen ? '▲' : '▼'}</Text>
            </Pressable>
          </View>
        )}

        {/* Expanded filters */}
        {filtersOpen && (
          <View style={styles.filtersPanel}>
            {activeTab === 'boxers' && (
              <>
                <Text style={styles.filterLabel}>Fighting Style</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  <View style={styles.chipRow}>
                    <Pressable
                      style={[styles.chip, !styleFilter && styles.chipActive]}
                      onPress={() => setStyleFilter('')}
                    >
                      <Text style={[styles.chipText, !styleFilter && styles.chipTextActive]}>All</Text>
                    </Pressable>
                    {boxingStyles.map((style) => (
                      <Pressable
                        key={style.id_boxing_style}
                        style={[styles.chip, styleFilter === style.title_style && styles.chipActive]}
                        onPress={() => setStyleFilter(style.title_style)}
                      >
                        <Text style={[styles.chipText, styleFilter === style.title_style && styles.chipTextActive]}>
                          {style.title_style}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>

                <Text style={styles.filterLabel}>Weight Class</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  <View style={styles.chipRow}>
                    <Pressable
                      style={[styles.chip, !weightClassFilter && styles.chipActive]}
                      onPress={() => setWeightClassFilter('')}
                    >
                      <Text style={[styles.chipText, !weightClassFilter && styles.chipTextActive]}>All</Text>
                    </Pressable>
                    {weightClasses.map((wc) => (
                      <Pressable
                        key={wc.id_weight_class}
                        style={[styles.chip, weightClassFilter === wc.title_weight && styles.chipActive]}
                        onPress={() => setWeightClassFilter(wc.title_weight)}
                      >
                        <Text style={[styles.chipText, weightClassFilter === wc.title_weight && styles.chipTextActive]}>
                          {wc.title_weight}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            {activeTab === 'clubs' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                <View style={styles.chipRow}>
                  {(['all', 'open', 'approval'] as const).map((policy) => (
                    <Pressable
                      key={policy}
                      style={[styles.chip, clubJoinPolicy === policy && styles.chipActive]}
                      onPress={() => setClubJoinPolicy(policy)}
                    >
                      <Text style={[styles.chipText, clubJoinPolicy === policy && styles.chipTextActive]}>
                        {policy === 'all' ? 'All Clubs' : policy.charAt(0).toUpperCase() + policy.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )}

            {activeTab === 'posts' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                <View style={styles.chipRow}>
                  {(['all', 'text', 'media'] as const).map((t) => (
                    <Pressable
                      key={t}
                      style={[styles.chip, typeFilter === t && styles.chipActive]}
                      onPress={() => setTypeFilter(t)}
                    >
                      <Text style={[styles.chipText, typeFilter === t && styles.chipTextActive]}>
                        {t === 'all' ? 'All Types' : t === 'text' ? 'Text Only' : 'Media'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        )}
      </View>

      {/* Content */}
      {activeTab === 'foryou' && (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary.main} />}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
        >
          {recsLoading ? (
            <View style={styles.skeletonList}>
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </View>
          ) : !recommendations || (
            recommendations.nearbyClubs.length === 0 &&
            recommendations.popularTrainings.length === 0 &&
            recommendations.suggestedBoxers.length === 0 &&
            (recommendations.popularCalendars?.length ?? 0) === 0
          ) ? (
            <EmptyState
              icon="sparkles-outline"
              title="No recommendations yet"
              subtitle="Keep training! We'll personalize suggestions as you use the app."
              style={styles.emptyState}
            />
          ) : (
            <>
              {recommendations.nearbyClubs.length > 0 && (
                <RecommendationSection
                  title="Clubs Near You"
                  icon="location-outline"
                  onSeeAll={() => setActiveTab('clubs')}
                >
                  {recommendations.nearbyClubs.map(club => (
                    <ClubCard
                      key={club.idclubs}
                      club={club}
                      onPress={() => (navigation as any).navigate('ClubProfile', { clubId: club.idclubs })}
                    />
                  ))}
                </RecommendationSection>
              )}

              {personalizedItems.length > 0 && (
                <RecommendationSection
                  title="Personalizovaný obsah"
                  icon="sparkles-outline"
                  onSeeAll={() => (navigation as any).navigate('Technique')}
                >
                  {personalizedItems.map((item) => (
                    <Pressable
                      key={`${item.content_type}-${item.content_id}`}
                      style={styles.personalizedPressable}
                      onPress={() => handlePersonalizedPress(item)}
                    >
                      <GlassCard variant="medium" radius={14} padding={12} style={styles.personalizedCard}>
                        <View style={styles.personalizedTopRow}>
                          <Ionicons name={getContentIcon(item)} size={16} color={colors.primary.main} />
                          <Text style={styles.personalizedType}>{item.content_type.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.personalizedTitle} numberOfLines={2}>{item.title}</Text>
                        {!!item.category_name && (
                          <Text style={styles.personalizedMeta} numberOfLines={1}>{item.category_name}</Text>
                        )}
                        <Text style={styles.personalizedMeta}>Score {item.score}</Text>
                      </GlassCard>
                    </Pressable>
                  ))}
                </RecommendationSection>
              )}

              {recommendations.popularTrainings.length > 0 && (
                <RecommendationSection
                  title="Popular Trainings"
                  icon="fitness-outline"
                >
                  {recommendations.popularTrainings.map(training => (
                    <TrainingCard
                      key={training.id_trainings}
                      training={training}
                      onPress={() => {
                        // Navigate to training details when available
                      }}
                    />
                  ))}
                </RecommendationSection>
              )}

              {recommendations.suggestedBoxers.length > 0 && (
                <RecommendationSection
                  title="Boxers Like You"
                  icon="people-outline"
                  onSeeAll={() => setActiveTab('boxers')}
                >
                  {recommendations.suggestedBoxers.map(boxer => (
                    <BoxerCard
                      key={boxer.id_profiles}
                      boxer={boxer}
                      onPress={() => (navigation as any).navigate('ForeignProfile', { foreign_profile_id: boxer.id_profiles })}
                    />
                  ))}
                </RecommendationSection>
              )}

              {recommendations.popularCalendars && recommendations.popularCalendars.length > 0 && (
                <RecommendationSection
                  title="Popular Calendars"
                  icon="calendar-outline"
                >
                  {recommendations.popularCalendars.map(calendar => (
                    <CalendarCard
                      key={calendar.id_training_calendar}
                      calendar={calendar}
                      onPress={() => (navigation as any).navigate('BrowseCalendars')}
                    />
                  ))}
                </RecommendationSection>
              )}

              {recommendations.nearbyClubs.length === 0 && !profile?.location && (
                <View style={styles.locationHint}>
                  <Ionicons name="location-outline" size={20} color={colors.text.tertiary} />
                  <Text style={styles.locationHintText}>
                    Set your location in profile settings to see nearby clubs
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {activeTab === 'posts' && (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id_posts)}
          renderItem={({ item }) => <FeedPost post={item} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary.main} />}
          ListEmptyComponent={
            loading
              ? <View style={styles.skeletonList}>{[1,2,3].map(i => <SkeletonCard key={i} />)}</View>
              : <EmptyState icon="newspaper-outline" title="No posts yet" subtitle="Be the first to share something!" style={styles.emptyState} />
          }
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }}
        />
      )}

      {activeTab === 'clubs' && (
        <FlatList
          data={clubs}
          keyExtractor={(item) => `club-${item.idclubs}`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary.main} />}
          contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
          renderItem={({ item: club }) => (
            <Pressable
              onPress={() => (navigation as any).navigate('ClubProfile', { clubId: Number(club.idclubs) })}
              style={styles.cardPressable}
            >
              <GlassCard variant="medium" radius={14} padding={14} style={styles.clubCard}>
                <View style={styles.clubCardRow}>
                  <View style={styles.flex1}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{club.title}</Text>
                    <Text style={styles.cardSub} numberOfLines={1}>{club.location || 'Unknown location'}</Text>
                    <Text style={styles.cardMeta}>{club.members_count ?? 0} members · {club.join_policy || 'open'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
                </View>
              </GlassCard>
            </Pressable>
          )}
          ListEmptyComponent={
            loading
              ? <View style={styles.skeletonList}>{[1,2,3].map(i => <SkeletonCard key={i} />)}</View>
              : <EmptyState icon="business-outline" title="No clubs found" subtitle="Try different filters" style={styles.emptyState} />
          }
        />
      )}

      {activeTab === 'boxers' && (
        <FlatList
          data={boxers}
          keyExtractor={(item) => `boxer-${item.id_profiles}`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary.main} />}
          contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => (navigation as any).navigate('ForeignProfile', { foreign_profile_id: Number(item.id_profiles) })}
              style={styles.cardPressable}
            >
              <GlassCard variant="medium" radius={14} padding={14} style={styles.clubCard}>
                <View style={styles.boxerRow}>
                  <View style={styles.avatarRing}>
                    <Avatar size="md">
                      <AvatarFallbackText>{item?.display_name?.[0] || '?'}</AvatarFallbackText>
                      <AvatarImage source={{ uri: item?.avatar_url || undefined }} />
                    </Avatar>
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.display_name || item.username}</Text>
                    <Text style={styles.cardSub} numberOfLines={1}>
                      {item.title_weight || 'Weight n/a'} · {item.title_style || 'Style n/a'}
                    </Text>
                    {!!item.location && <Text style={styles.cardMeta}>{item.location}</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
                </View>
              </GlassCard>
            </Pressable>
          )}
          ListEmptyComponent={
            loading
              ? <View style={styles.skeletonList}>{[1,2,3].map(i => <SkeletonCard key={i} />)}</View>
              : <EmptyState icon="people-outline" title="No boxers found" subtitle="Try different filters" style={styles.emptyState} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.secondary },
  header: {
    paddingHorizontal: 16, paddingBottom: 8,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1, borderBottomColor: colors.border.light,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { color: colors.text.primary, fontSize: 20, fontWeight: '800' },
  headerRight: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.glass.surface, borderWidth: 1, borderColor: colors.glass.border,
    alignItems: 'center', justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.background.card, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 2, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border.light,
  },
  searchInput: { flex: 1, color: colors.text.primary, paddingVertical: 10, fontSize: 14 },
  tabs: { marginBottom: 8 },
  filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  filterHint: { color: colors.text.tertiary, fontSize: 11 },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: colors.glass.surface, borderWidth: 1, borderColor: colors.glass.border,
  },
  filterBtnText: { color: colors.text.secondary, fontSize: 11, fontWeight: '700' },
  filtersPanel: { gap: 8, marginBottom: 6 },
  filterLabel: { color: colors.text.secondary, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  filterInput: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.background.card, borderRadius: 10,
    paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border.light,
  },
  filterTextInput: { flex: 1, color: colors.text.primary, paddingVertical: 9, fontSize: 13 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: colors.background.card, borderWidth: 1, borderColor: colors.border.light,
  },
  chipActive: { backgroundColor: colors.primary.main, borderColor: colors.primary.main },
  chipText: { color: colors.text.secondary, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  applyBtn: {
    backgroundColor: colors.primary.main, borderRadius: 10, paddingVertical: 9,
    alignItems: 'center',
  },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cardPressable: { marginBottom: 10 },
  clubCard: {},
  clubCardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  boxerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarRing: { borderRadius: 24, borderWidth: 2, borderColor: colors.primary.main, padding: 2 },
  flex1: { flex: 1 },
  cardTitle: { color: colors.text.primary, fontSize: 15, fontWeight: '700' },
  cardSub: { color: colors.text.secondary, fontSize: 12, marginTop: 2 },
  cardMeta: { color: colors.text.tertiary, fontSize: 11, marginTop: 3 },
  emptyState: { paddingVertical: 60 },
  skeletonList: { padding: 12, gap: 12 },
  locationHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.glass.surface,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  locationHintText: {
    flex: 1,
    color: colors.text.secondary,
    fontSize: 13,
  },
  personalizedPressable: { marginRight: 10 },
  personalizedCard: { width: 182, minHeight: 126 },
  personalizedTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  personalizedType: { color: colors.primary.main, fontSize: 10, fontWeight: '700' },
  personalizedTitle: { color: colors.text.primary, fontSize: 14, fontWeight: '700', marginTop: 8 },
  personalizedMeta: { color: colors.text.tertiary, fontSize: 11, marginTop: 5 },
});
