// Updated Discovery Screen with interactive search + like/dislike/comment
import React, { useState } from "react";
import { ScrollView, Pressable } from "react-native";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Icon } from "@/components/ui/icon";
import { Input, InputField, InputIcon, InputSlot} from '@/components/ui/input';
import { Ionicons } from '@expo/vector-icons';
import FeedPost from "../components/Post";

import { Text } from "@/components/ui/text";
import {
  Search as SearchIcon,
  User,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
} from "lucide-react-native";

const Search = (query : string) => 
{
  console.log("Searching for:", query);

}

export default function DiscoveryScreen() {
  const [query, setQuery] = useState("");

  return (
    <Box className="flex-1 bg-gray-100">
      {/* Search Bar */}
      <Box className="p-3 bg-white shadow-sm border-b border-gray-200">
        <HStack className="items-center px-3 py-1 gap-2">
          <Input variant="outline" className="flex-1 border border-gray-300 rounded-lg p-1 focus:outline-none focus:ring-0 focus:border-gray-300 bg-transparent">
            <InputField className="p-0"
              placeholder="Search..."
              value={query}
              onChangeText={setQuery}
            />
            <InputSlot onPress={() => Search(query)}>
              <Ionicons
                name={'search-outline'}
                size={20}
                color="#6B7280"
              />
            </InputSlot>
          </Input>
        </HStack>
      </Box>

      {/* FEED LIST */}
      <ScrollView contentContainerStyle={{ paddingBottom: 110, paddingTop: 8 }}>
        <FeedPost type="default" />
        <FeedPost type="textOnly" />
        <FeedPost type="default" />
      </ScrollView>
    </Box>
  );
}