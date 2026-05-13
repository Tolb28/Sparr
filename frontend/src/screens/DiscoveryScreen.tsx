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
import { SparrButton } from '@/components/ui/sparr-button';
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
  const [debouncedQuery, setDebouncedQuery] = useState('');
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

  useEffect(() => {
    if (activeTab === 'foryou') return;
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 320);

    return () => clearTimeout(timer);
  }, [query, activeTab]);

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
        query: debouncedQuery,
        joinPolicy: clubJoinPolicy === 'all' ? undefined : clubJoinPolicy,
        limit: 20,
        offset: 0,
      });
      setClubs(data || []);
    } catch (err: any) {
      console.error('loadClubs failed:', err);
      setClubs([]);
    }
  }, [debouncedQuery, clubJoinPolicy]);

  const loadBoxers = useCallback(async () => {
    try {
      const data = await getDiscoveryBoxers(20, 0, {
        query: debouncedQuery,
        style: styleFilter,
        weightClass: weightClassFilter,
      });
      setBoxers(data || []);
    } catch (err: any) {
      console.error('loadBoxers failed:', err);
      setBoxers([]);
    }
  }, [debouncedQuery, styleFilter, weightClassFilter]);

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
        await loadPosts(debouncedQuery, 0);
      } else if (activeTab === 'clubs') {
        await loadClubs();
      } else {
        await loadBoxers();
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, loadPosts, loadClubs, loadBoxers, loadRecommendations, debouncedQuery]);

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
    const trimmedQuery = query.trim();
    if (activeTab === 'foryou') {
      setActiveTab('posts');
    }
    setDebouncedQuery(trimmedQuery);
    if (trimmedQuery === debouncedQuery && activeTab !== 'foryou') {
      loadActive();
    }
  }, [loadActive, query, debouncedQuery, activeTab]);

  const handleLoadMore = useCallback(() => {
    if (activeTab === 'posts') {
      loadPosts(debouncedQuery, offset);
    }
  }, [activeTab, loadPosts, debouncedQuery, offset]);

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
    setDebouncedQuery(query.trim());
    setStyleFilter('');
    setWeightClassFilter('');
    setTypeFilter('all');
    setClubJoinPolicy('all');
    setFiltersOpen(false);
  }, [query]);

  const clearTabFilters = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    if (activeTab === 'posts') setTypeFilter('all');
    if (activeTab === 'clubs') setClubJoinPolicy('all');
    if (activeTab === 'boxers') {
      setStyleFilter('');
      setWeightClassFilter('');
    }
  }, [activeTab]);

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

  const activeFilters = React.useMemo(() => {
    if (activeTab === 'posts') {
      const filters = typeFilter === 'all' ? [] : [typeFilter === 'text' ? 'Text posts' : 'Media posts'];
      return debouncedQuery ? [`Search: ${debouncedQuery}`, ...filters] : filters;
    }
    if (activeTab === 'clubs') {
      const filters = clubJoinPolicy === 'all' ? [] : [clubJoinPolicy === 'open' ? 'Open clubs' : 'Approval required'];
      return debouncedQuery ? [`Search: ${debouncedQuery}`, ...filters] : filters;
    }
    if (activeTab === 'boxers') {
      const filters = [styleFilter, weightClassFilter].filter(Boolean);
      return debouncedQuery ? [`Search: ${debouncedQuery}`, ...filters] : filters;
    }
    return [];
  }, [activeTab, typeFilter, clubJoinPolicy, styleFilter, weightClassFilter, debouncedQuery]);

  const searchPlaceholder = React.useMemo(() => {
    if (activeTab === 'posts') return 'Search posts...';
    if (activeTab === 'clubs') return 'Search clubs...';
    if (activeTab === 'boxers') return 'Search boxers...';
    return 'Search friends, clubs, boxers...';
  }, [activeTab]);

  const forYouSummary = React.useMemo(() => {
    const clubCount = recommendations?.nearbyClubs?.length ?? 0;
    const boxerCount = recommendations?.suggestedBoxers?.length ?? 0;
    const trainingCount = recommendations?.popularTrainings?.length ?? 0;
    if (!recommendations) {
      return 'Personalized suggestions update as you train and interact.';
    }
    return `${clubCount} clubs, ${boxerCount} boxers, and ${trainingCount} training ideas picked for you.`;
  }, [recommendations]);

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
            <View>
              <Text style={styles.headerTitle}>Discovery</Text>
              <Text style={styles.headerSubtitle}>Find your next spar, gym, or training idea</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              hitSlop={8}
            >
              <Ionicons name="notifications-outline" size={18} color={colors.text.primary} />
            </Pressable>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.text.tertiary} />
          <TextInput
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.text.tertiary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickActionsScroll}
          contentContainerStyle={styles.quickActionsRow}
        >
          <Pressable
            style={styles.quickActionPill}
            onPress={() => handleTabChange('clubs')}
            accessibilityRole="button"
            accessibilityLabel="Nearby clubs"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="location-outline" size={14} color={colors.text.secondary} />
            <Text style={styles.quickActionText}>Nearby clubs</Text>
          </Pressable>
          <Pressable
            style={styles.quickActionPill}
            onPress={() => handleTabChange('boxers')}
            accessibilityRole="button"
            accessibilityLabel="Find boxers"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="people-outline" size={14} color={colors.text.secondary} />
            <Text style={styles.quickActionText}>Find boxers</Text>
          </Pressable>
          <Pressable
            style={styles.quickActionPill}
            onPress={() => handleTabChange('posts')}
            accessibilityRole="button"
            accessibilityLabel="Latest posts"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="newspaper-outline" size={14} color={colors.text.secondary} />
            <Text style={styles.quickActionText}>Latest posts</Text>
          </Pressable>
        </ScrollView>

        {/* Tabs */}
        <TabBar
          tabs={DISCOVERY_TABS}
          activeTab={activeTab}
          onTabChange={(t) => handleTabChange(t as 'foryou' | 'posts' | 'clubs' | 'boxers')}
          appearance="segmented"
          style={styles.tabs}
        />

        {/* Filter toggle - only show for tabs with filters */}
        {activeTab !== 'foryou' && (
          <View style={styles.filterRow}>
            <Text style={styles.filterHint}>
              {activeFilters.length > 0 ? `${activeFilters.length} filters active` : 'Refine results with filters'}
            </Text>
            <View style={styles.filterActions}>
              {activeFilters.length > 0 && (
                <Pressable style={styles.clearFiltersBtn} onPress={clearTabFilters}>
                  <Text style={styles.clearFiltersText}>Clear</Text>
                </Pressable>
              )}
              <Pressable style={styles.filterBtn} onPress={() => setFiltersOpen((v) => !v)}>
                <Ionicons name="options-outline" size={14} color={colors.text.secondary} />
                <Text style={styles.filterBtnText}>Filters {filtersOpen ? '▲' : '▼'}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {activeTab !== 'foryou' && activeFilters.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFiltersScroll}>
            <View style={styles.activeFiltersRow}>
              {activeFilters.map((filter) => (
                <View key={filter} style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterChipText}>{filter}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
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
              <View style={styles.forYouHeroWrap}>
                <GlassCard variant="medium" radius={16} padding={14} style={styles.forYouHero}>
                  <Text style={styles.forYouHeroTitle}>Your next move</Text>
                  <Text style={styles.forYouHeroSub}>{forYouSummary}</Text>
                  <View style={styles.forYouHeroActions}>
                    <Pressable style={styles.forYouActionBtn} onPress={() => setActiveTab('clubs')}>
                      <Ionicons name="business-outline" size={14} color={colors.text.primary} />
                      <Text style={styles.forYouActionText}>Clubs</Text>
                    </Pressable>
                    <Pressable style={styles.forYouActionBtn} onPress={() => setActiveTab('boxers')}>
                      <Ionicons name="people-outline" size={14} color={colors.text.primary} />
                      <Text style={styles.forYouActionText}>Boxers</Text>
                    </Pressable>
                    <Pressable style={styles.forYouActionBtn} onPress={() => setActiveTab('posts')}>
                      <Ionicons name="chatbubbles-outline" size={14} color={colors.text.primary} />
                      <Text style={styles.forYouActionText}>Posts</Text>
                    </Pressable>
                  </View>
                </GlassCard>
              </View>

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
                  title="Personalized for You"
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
                        {!!item.reasons?.[0] && (
                          <Text style={styles.personalizedReason} numberOfLines={2}>{item.reasons[0]}</Text>
                        )}
                        <Text style={styles.personalizedMeta}>Score {item.score.toFixed(1)}</Text>
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
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary.main} />}
          ListFooterComponent={
            loadingMore
              ? <View style={styles.listFooter}><ActivityIndicator color={colors.primary.main} /></View>
              : null
          }
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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
          renderItem={({ item: club }) => (
            <ClubCard
              club={club}
              fullWidth
              onPress={() => (navigation as any).navigate('ClubProfile', { clubId: Number(club.idclubs) })}
            />
          )}
          ListEmptyComponent={
            loading
              ? <View style={styles.skeletonList}>{[1,2,3].map(i => <SkeletonCard key={i} />)}</View>
              : (
                <EmptyState icon="business-outline" title="No clubs found" subtitle="Try different filters" style={styles.emptyState}>
                  <View style={{ marginTop: 12 }}>
                    <SparrButton label="Create a club" variant="primary" onPress={() => (navigation as any).navigate('CreateClubStepOne')} />
                  </View>
                </EmptyState>
              )
          }
        />
      )}

      {activeTab === 'boxers' && (
        <FlatList
          data={boxers}
          keyExtractor={(item) => `boxer-${item.id_profiles}`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary.main} />}
          showsVerticalScrollIndicator={false}
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
  headerSubtitle: { color: colors.text.tertiary, fontSize: 12, marginTop: 1 },
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
  quickActionsScroll: { marginBottom: 10 },
  quickActionsRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  quickActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.glass.border,
    backgroundColor: colors.glass.surface,
  },
  quickActionText: { color: colors.text.secondary, fontSize: 11, fontWeight: '600' },
  tabs: { marginBottom: 8 },
  filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  filterHint: { color: colors.text.tertiary, fontSize: 11 },
  filterActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clearFiltersBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.card,
  },
  clearFiltersText: { color: colors.text.secondary, fontSize: 11, fontWeight: '700' },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: colors.glass.surface, borderWidth: 1, borderColor: colors.glass.border,
  },
  filterBtnText: { color: colors.text.secondary, fontSize: 11, fontWeight: '700' },
  activeFiltersScroll: { marginBottom: 8 },
  activeFiltersRow: { flexDirection: 'row', gap: 8 },
  activeFilterChip: {
    borderWidth: 1,
    borderColor: colors.glass.redBorder,
    backgroundColor: colors.glass.redSurface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeFilterChipText: { color: colors.text.primary, fontSize: 11, fontWeight: '600' },
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
  chipTextActive: { color: colors.text.primary },
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
  clubMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  clubPolicyBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  clubPolicyOpen: { backgroundColor: colors.success.main + '1f' },
  clubPolicyApproval: { backgroundColor: colors.warning.main + '22' },
  clubPolicyText: { color: colors.text.secondary, fontSize: 10, fontWeight: '700' },
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
  forYouHeroWrap: { marginHorizontal: 16, marginBottom: 16 },
  forYouHero: {},
  forYouHeroTitle: { color: colors.text.primary, fontSize: 16, fontWeight: '800' },
  forYouHeroSub: { color: colors.text.secondary, fontSize: 13, marginTop: 4, lineHeight: 18 },
  forYouHeroActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  forYouActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.primary.main,
  },
  forYouActionText: { color: colors.text.primary, fontSize: 11, fontWeight: '700' },
  personalizedPressable: { marginRight: 10 },
  personalizedCard: { width: 182, minHeight: 126 },
  personalizedTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  personalizedType: { color: colors.primary.main, fontSize: 10, fontWeight: '700' },
  personalizedTitle: { color: colors.text.primary, fontSize: 14, fontWeight: '700', marginTop: 8 },
  personalizedReason: { color: colors.text.secondary, fontSize: 11, marginTop: 5, lineHeight: 15 },
  personalizedMeta: { color: colors.text.tertiary, fontSize: 11, marginTop: 5 },
  listFooter: { paddingVertical: 16 },
});
