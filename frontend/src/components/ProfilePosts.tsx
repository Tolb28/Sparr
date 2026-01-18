import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { getProfilePosts } from '../api/discovery';
import Post from './Post';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';

interface ProfilePostsProps {
  profileId: number;
  refreshTrigger?: number;
}

export default function ProfilePosts({ profileId, refreshTrigger }: ProfilePostsProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const LIMIT = 20;

  const loadPosts = React.useCallback(async (offsetValue: number = 0) => {
    if (offsetValue === 0 && !refreshing) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const data = await getProfilePosts(profileId, LIMIT, offsetValue);
      
      if (offsetValue === 0) {
        setPosts(data);
      } else {
        setPosts(prev => [...prev, ...data]);
      }

      // If fewer posts than limit, we've reached the end
      if (data.length < LIMIT) {
        setHasMore(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load posts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [profileId, LIMIT, refreshing]);

  useEffect(() => {
    loadPosts(0);
  }, [profileId, loadPosts]);

  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      handleRefresh();
    }
  }, [refreshTrigger]);

  const handleLoadMore = () => {
    loadPosts(offset + LIMIT);
    setOffset(prev => prev + LIMIT);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setOffset(0);
    setHasMore(true);
    await loadPosts(0);
    setRefreshing(false);
  }, [loadPosts]);

  if (loading && posts.length === 0) {
    return (
      <Box className="flex-1 justify-center items-center p-5">
        <ActivityIndicator size="large" />
      </Box>
    );
  }

  if (error && posts.length === 0) {
    return (
      <Box className="flex-1 justify-center items-center p-5">
        <Text className="text-red-600 text-center">{error}</Text>
      </Box>
    );
  }

  if (posts.length === 0 && !loading) {
    return (
      <Box className="flex-1 justify-center items-center p-5">
        <Text className="text-gray-600 text-center">No posts yet</Text>
      </Box>
    );
  }

  return (
    <FlatList
      data={posts}
      renderItem={({ item }) => <Post post={item} />}
      keyExtractor={(item) => item.id_posts.toString()}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      scrollEnabled={false}
    />
  );
}
