import React, { useState, useEffect, useCallback, useMemo} from "react";
import { FlatList } from "react-native";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import { Ionicons } from "@expo/vector-icons";
import FeedPost from "../components/Post";
import { getDiscoveryFeed } from "../api/discovery";


export default function DiscoveryScreen() {
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const LIMIT = 10;

  const loadMore = useCallback(async () => {
    if (loadingMore) return;

    setLoadingMore(true);
    try {
      const newPosts = await getDiscoveryFeed(LIMIT, offset);
      setPosts((prev) => [...prev, ...newPosts]);
      setOffset((prev) => prev + LIMIT);
    } catch (err) {
      console.log("Feed error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [offset, loadingMore]);

  useEffect(() => {
    loadMore();
  }, []);



  // 🔍 FILTER LOGIC
  const filteredPosts = useMemo(() => {
    if (!query.trim()) return posts;

    const lowerQuery = query.toLowerCase();

    return posts.filter((post) =>
      post.description?.toLowerCase().includes(lowerQuery) ||
      post.display_name?.toLowerCase().includes(lowerQuery) ||
      post.username?.toLowerCase().includes(lowerQuery)
    );
  }, [posts, query]);

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
              placeholder="Search..."
              value={query}
              onChangeText={setQuery}
            />
            <InputSlot>
              <Ionicons name="search-outline" size={20} color="#6B7280" />
            </InputSlot>
          </Input>
        </HStack>

      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => String(item.id_posts)}
        renderItem={({ item }) => <FeedPost post={item} />}

        onEndReached={loadMore}
        onEndReachedThreshold={0.5}

        contentContainerStyle={{ paddingBottom: 110, paddingTop: 8 }}
      />
    </Box>
  );
}
