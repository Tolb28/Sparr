// Post.tsx
import { getCommentsForPost } from "../api/discovery";
import CommentSection from "./CommentSection";
import React, { useState, useCallback, useEffect, useRef } from "react";
import { getToken, ServerIP } from '../api/tokenHandler';
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { Image as RNImage, View } from "react-native";
import { Modal } from "react-native";
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  User,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
} from "lucide-react-native";
import { Pressable } from "@/components/ui/pressable";
import { useNavigation, useFocusEffect } from "@react-navigation/core";
import { getProfile } from "../api/profileHandler";

import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { Avatar, AvatarFallbackText, AvatarImage } from "@/components/ui/avatar";

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
    user_interaction?: 'like' | 'dislike' | null;
    avatar?: string | null;
    avatar_url?: string | null;
  };
}

interface UserProfile {
  id_profiles: number;
  display_name: string;
  avatar?: string | null;
  avatar_url?: string | null;
}

function FeedPost({ post }: FeedPostProps) {
  const navigation = useNavigation();

  console.log("Post:", post);

  const [likes, setLikes] = useState(Number(post.likes_count) || 0);
  const [commentsCount, setCommentsCount] = useState(Number(post.comments_count) || 0);
  const [dislikes, setDislikes] = useState(Number(post.dislikes_count) || 0);
  const [interaction, setInteraction] = useState<'like' | 'dislike' | null>(post.user_interaction || null);
  const [loading, setLoading] = useState(false);

  const [showComments, setShowComments] = useState(false);
  const [mediaDimensions, setMediaDimensions] = useState<{ width: number; height: number } | null>(null);
  const commentsWereOpenRef = useRef(false);
  
  // Create video player if source is a video
  const isVideo = post.source && (post.source.includes('.mp4') || post.source.includes('video'));
  const player = useVideoPlayer(isVideo ? post.source || null : null, player => {
    player.play();
  });

  // Load image dimensions
  useEffect(() => {
    if (post.source && !isVideo) {
      RNImage.getSize(
        post.source,
        (width, height) => {
          setMediaDimensions({ width, height });
        },
        (error) => {
          console.log("Error loading image dimensions:", error);
          // Fallback to default if loading fails
          setMediaDimensions({ width: 1, height: 1 });
        }
      );
    } else if (isVideo) {
      // For videos, try to get dimensions from metadata or use a default vertical aspect ratio
      // Most videos are vertical, so we default to 9:16 aspect ratio
      setMediaDimensions({ width: 9, height: 16 });
    }
  }, [post.source, isVideo]);

  // Restore comments modal when returning from navigation
  useFocusEffect(
    useCallback(() => {
      if (commentsWereOpenRef.current) {
        setShowComments(true);
        commentsWereOpenRef.current = false;
      }
    }, [])
  );
  
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
      const numPrev = Number(prev) || 0;
      if (type === 'like') {
        if (prevInteraction === 'like') return numPrev - 1;
        return prevInteraction === 'dislike' ? numPrev + 1 : numPrev + 1;
      }
      return numPrev;
    });

    setDislikes(prev => {
      const numPrev = Number(prev) || 0;
      if (type === 'dislike') {
        if (prevInteraction === 'dislike') return numPrev - 1;
        return prevInteraction === 'like' ? numPrev + 1 : numPrev + 1;
      }
      return numPrev;
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
          targetId: post.id_posts,
          type,
          parent: 'post',
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

  const handleCommentOpen = () => {
    setShowComments(true);
  };

  const handleNewComment = useCallback(() => {
    setCommentsCount((prev) => prev + 1);
  }, []);


  return (
    <>
    <Box className="bg-white mx-3 mb-3 p-3 rounded-lg border border-gray-200">
      {/* User row */}
      <Pressable onPress={() => (navigation as any).navigate('ForeignProfile', { foreign_profile_id: post.id_profiles })}>
        <HStack className="items-center mb-3 gap-2">
          <Avatar className="bg-indigo-600" size="md">
          <AvatarFallbackText className="text-white">
            {post?.display_name?.[0] ?? "?"}
          </AvatarFallbackText>
          <AvatarImage source={{ uri: post?.avatar_url || undefined }} />
        </Avatar>
          <Text className="font-bold text-base">{post.display_name}</Text>
        </HStack>
      </Pressable>

      {/* Post media */}
      {post.source && (
        <Box className="rounded-md mb-3 w-full bg-gray-200 overflow-hidden" style={{ aspectRatio: mediaDimensions ? mediaDimensions.width / mediaDimensions.height : 1 }}>
          {isVideo ? (
            <VideoView
              player={player}
              style={{ width: '100%', height: '100%' }}
              nativeControls={true}
              allowsFullscreen={true}
              allowsPictureInPicture={true}
            />
          ) : (
            <RNImage
              source={{ uri: post.source }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          )}
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

        <Pressable onPress={handleCommentOpen}>
          <HStack className="items-center gap-1">
            <Icon as={MessageCircle} size="md" className="text-gray-700" />
            <Text className="text-sm text-gray-800">{commentsCount}</Text>
          </HStack>
        </Pressable>
      </HStack>
    </Box>

    {/* COMMENTS MODAL */}
    <Modal visible={showComments} animationType="slide">
      <CommentSection
        postId={post.id_posts}
        onClose={() => setShowComments(false)}
        onNewComment={handleNewComment}
        onNavigateAway={() => {
          commentsWereOpenRef.current = true;
        }}
      />
    </Modal>
    </>
  );
}

export default FeedPost;
