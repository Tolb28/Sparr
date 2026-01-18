import React, { useState, useEffect, useCallback } from "react";
import { FlatList, View, RefreshControl } from "react-native";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "@/components/ui/pressable";
import { useNavigation } from "@react-navigation/native";
import FeedPost from "../components/Post";
import { getDiscoveryFeed } from "../api/discovery";


export default function DiscoveryScreen() {
  const navigation = useNavigation();
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const LIMIT = 10;

  const loadMore = useCallback(async (searchQuery: string = "", currentOffset: number = 0) => {
    setLoadingMore((prevLoading) => {
      if (prevLoading) return prevLoading;

      (async () => {
        try {
          const newPosts = await getDiscoveryFeed(LIMIT, currentOffset, searchQuery);
          
          if (currentOffset === 0) {
            // First page or new search
            setPosts(newPosts);
            setOffset(LIMIT);
          } else {
            // Load more
            setPosts((prev) => [...prev, ...newPosts]);
            setOffset((prev) => prev + LIMIT);
          }
        } catch (err) {
          console.log("Feed error:", err);
        } finally {
          setLoadingMore(false);
        }
      })();

      return true;
    });
  }, []);

  // Initial load
  useEffect(() => {
    loadMore("", 0);
  }, []);

  // Handle search submission
  const handleSearch = useCallback(() => {
    setOffset(0);
    loadMore(query, 0);
  }, [query, loadMore]);

  const handleSearchInputChange = useCallback((text: string) => {
    setQuery(text);
  }, []);

  const handleLoadMore = useCallback(() => {
    loadMore(query, offset);
  }, [loadMore, query, offset]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setOffset(0);
    await loadMore(query, 0);
    setRefreshing(false);
  }, [loadMore, query]);

  return (
    <Box className="flex-1 bg-gray-100 py-4">
      {/* Search Bar */}
      <HStack className="items-center px-3 py-5 gap-2">
        <Input
          variant="outline"
          className="flex-1 border border-gray-300 rounded-lg p-1 bg-transparent"
        >
          <InputField
            className="p-0"
            placeholder="Search posts, users..."
            value={query}
            onChangeText={handleSearchInputChange}
            onSubmitEditing={handleSearch}
          />
        </Input>
        <Pressable onPress={handleSearch}>
          <Ionicons name="search-outline" size={24} color="#6B7280" />
        </Pressable>
      </HStack>

      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id_posts)}
        renderItem={({ item }) => <FeedPost post={item} />}

        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}

        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }

        contentContainerStyle={{ paddingBottom: 110, paddingTop: 8 }}
      />
    </Box>
  );
}
