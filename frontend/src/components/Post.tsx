// Post.tsx

import React, { useState } from "react";
import { Platform } from 'react-native';
import { getToken } from '../api/tokenHandler';
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
import { useNavigation } from "@react-navigation/core";

interface FeedPostProps {
  post: {
    id_posts: number;
    source?: string;
    description?: string;
    hashtag?: string;
    likes_count?: number;
    comments_count?: number;
    display_name: string;
    dislikes_count?: number;
    id_profiles: number;
  };
}

function FeedPost({ post }: FeedPostProps) {
  const navigation = useNavigation();
  
  console.log('Rendering post', post);
  // fallbacks
  const [likes, setLikes] = useState(post.likes_count || 0);
  const [comments, setComments] = useState(post.comments_count || 0);
  const [dislikes, setDislikes] = useState(post.dislikes_count || 0);
  const [loadingLike, setLoadingLike] = useState(false);
  const [loadingDislike, setLoadingDislike] = useState(false);

  // Use the same API base as other frontend API clients (includes /api)
  const BASE_URL = Platform.OS === 'web' ? 'http://localhost:4000/api' : 'http://10.0.2.2:4000/api';

  const handleComment = () => setComments((prev) => prev + 1);

  const callInteraction = async (type: 'like'|'dislike') => {
    try {
      const token = await getToken();
      setLoadingLike(type === 'like');
      setLoadingDislike(type === 'dislike');

      const resp = await fetch(`${BASE_URL}/auth/interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ postId: post.id_posts, type }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        console.error('Interaction error', err);
        return;
      }

      const data = await resp.json();
      // backend returns likes_count and dislikes_count
      if (typeof data.likes_count === 'number') setLikes(data.likes_count);
      if (typeof data.dislikes_count === 'number') setDislikes(data.dislikes_count);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLike(false);
      setLoadingDislike(false);
    }
  };

  const handleLike = () => callInteraction('like');
  const handleDislike = () => callInteraction('dislike');

  return (
    <Box className="bg-white mx-3 mb-3 p-3 rounded-lg border border-gray-200">
      {/* User row */}
      <Pressable onPress={() => (navigation as any).navigate('ForeignProfile', { foreign_profile_id: post.id_profiles })}>
        <HStack className="items-center mb-3 gap-2">
          <Icon as={User} size="lg" className="text-gray-700" />
          <Text className="font-bold text-base">{post.display_name}</Text>
        </HStack>
      </Pressable>
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
            <ThumbsUp className="text-blue-600" size={18}></ThumbsUp>
            <Text className="text-sm text-gray-800">{likes}</Text>
          </HStack>
        </Pressable>

        <Pressable onPress={handleDislike}>
          <HStack className="items-center gap-1">
            <ThumbsDown className="text-red-600" size={18}></ThumbsDown>
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
