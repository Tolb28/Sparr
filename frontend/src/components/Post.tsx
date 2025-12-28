// Post.tsx

import React, { useState } from "react";
import { getToken, ServerIP } from '../api/tokenHandler';
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

import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';

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

  const [likes, setLikes] = useState(post.likes_count || 0);
  const [comments, setComments] = useState(post.comments_count || 0);
  const [dislikes, setDislikes] = useState(post.dislikes_count || 0);
  const [interaction, setInteraction] = useState<'like' | 'dislike' | null>(null);
  const [loading, setLoading] = useState(false);

  // Reanimated shared values for scale
  const likeScale = useSharedValue(1);
  const dislikeScale = useSharedValue(1);

  // Animated styles
  const likeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));
  const dislikeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dislikeScale.value }],
  }));

  // Isolated animation function
  const animatePress = (scale: typeof likeScale) => {
    scale.value = 1; // reset before starting
    scale.value = withSequence(
      withTiming(1.2, { duration: 250 }),
      withTiming(1, { duration: 250 })
    );
  };

  // Optimistic interaction update
  const callInteraction = async (type: 'like' | 'dislike') => {
    if (loading) return;

    const prevInteraction = interaction;
    setLoading(true);

    setInteraction(current => (current === type ? null : type));

    setLikes(prev => {
      if (type === 'like') {
        if (prevInteraction === 'like') return prev - 1;
        return prevInteraction === 'dislike' ? prev + 1 : prev + 1;
      }
      return prev;
    });

    setDislikes(prev => {
      if (type === 'dislike') {
        if (prevInteraction === 'dislike') return prev - 1;
        return prevInteraction === 'like' ? prev + 1 : prev + 1;
      }
      return prev;
    });

    try {
      const token = await getToken();

      const resp = await fetch(`${ServerIP}/auth/interactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          postId: post.id_posts,
          type,
        }),
      });

      if (!resp.ok) throw new Error("Interaction failed");

      const data = await resp.json();

      if (typeof data.likes_count === "number") setLikes(data.likes_count);
      if (typeof data.dislikes_count === "number") setDislikes(data.dislikes_count);
    } catch (e) {
      console.error(e);
      // rollback
      setInteraction(prevInteraction);
      setLikes(post.likes_count || 0);
      setDislikes(post.dislikes_count || 0);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = () => {
    if(loading) return;
    animatePress(likeScale);
    callInteraction('like');
  };

  const handleDislike = () => {
    if(loading) return;
    animatePress(dislikeScale);
    callInteraction('dislike');
  };

  const handleComment = () => setComments(prev => prev + 1);

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
      {post.description && <Text className="text-gray-700 leading-5 mb-3">{post.description}</Text>}

      {/* Hashtag */}
      {post.hashtag && (
        <Text className="text-blue-600 font-semibold mb-3">
          #{post.hashtag}
        </Text>
      )}

      {/* Reactions */}
      <HStack className="gap-6 items-center mb-3">
        <Pressable onPress={handleLike}>
          <Animated.View style={likeStyle}>
            <HStack className="items-center gap-1">
              <ThumbsUp
                size={18}
                color={interaction === 'like' ? '#2563eb' : '#6b7280'}
                fill={interaction === 'like' ? '#2563eb' : 'transparent'}
              />
              <Text className="text-sm">{likes}</Text>
            </HStack>
          </Animated.View>
        </Pressable>

        <Pressable onPress={handleDislike}>
          <Animated.View style={dislikeStyle}>
            <HStack className="items-center gap-1">
              <ThumbsDown
                size={18}
                color={interaction === 'dislike' ? '#dc2626' : '#6b7280'}
                fill={interaction === 'dislike' ? '#dc2626' : 'transparent'}
              />
              <Text className="text-sm">{dislikes}</Text>
            </HStack>
          </Animated.View>
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
