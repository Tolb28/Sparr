// Post.tsx

import React, { useState } from "react";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { Image } from "@/components/ui/image";
import {
  User,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
} from "lucide-react-native";
import { Pressable } from "@/components/ui/pressable";

interface FeedPostProps {
  post: {
    id_posts: number;
    source?: string;
    description?: string;
    hashtag?: string;
    likes_count?: number;
    comments_count?: number;
    display_name: string;
  };
}

function FeedPost({ post }: FeedPostProps) {
  // fallbacks
  const [likes, setLikes] = useState(post.likes_count || 0);
  const [comments, setComments] = useState(post.comments_count || 0);
  const [dislikes, setDislikes] = useState(0);

  const handleLike = () => setLikes((prev) => prev + 1);
  const handleDislike = () => setDislikes((prev) => prev + 1);
  const handleComment = () => setComments((prev) => prev + 1);

  return (
    <Box className="bg-white mx-3 mb-3 p-3 rounded-lg border border-gray-200">
      {/* User row */}
      <HStack className="items-center mb-3 gap-2">
        <Icon as={User} size="lg" className="text-gray-700" />
        <Text className="font-bold text-base">{post.display_name}</Text>
      </HStack>

      {/* Post media */}
      {post.source && (
        <Box className="rounded-md mb-3 justify-center items-center aspect-square bg-gray-200">
          <Image
            source={{ uri: post.source }}
            className="rounded-md aspect-square"
            resizeMode="cover"
          />
        </Box>
      )}

      {/* Text description */}
      {post.description && (
        <Text className="text-gray-700 leading-5 mb-3">{post.description}</Text>
      )}

      {/* Hashtag */}
      {post.hashtag && (
        <Text className="text-blue-600 font-semibold mb-3">
          #{post.hashtag}
        </Text>
      )}

      {/* Reactions */}
      <HStack className="gap-6 items-center mb-3">
        <Pressable onPress={handleLike}>
          <HStack className="items-center gap-1">
            <Icon as={ThumbsUp} size="md" className="text-blue-600" />
            <Text className="text-sm text-gray-800">{likes}</Text>
          </HStack>
        </Pressable>

        <Pressable onPress={handleDislike}>
          <HStack className="items-center gap-1">
            <Icon as={ThumbsDown} size="md" className="text-red-600" />
            <Text className="text-sm text-gray-800">{dislikes}</Text>
          </HStack>
        </Pressable>

        <Pressable onPress={handleComment}>
          <HStack className="items-center gap-1">
            <Icon as={MessageCircle} size="md" className="text-gray-700" />
            <Text className="text-sm text-gray-800">{comments}</Text>
          </HStack>
        </Pressable>
      </HStack>
    </Box>
  );
}

export default FeedPost;
