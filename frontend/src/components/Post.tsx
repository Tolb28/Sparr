import CommentSection from "./CommentSection";
import React, { useState, useCallback, useEffect, useRef } from "react";
import { getToken, ServerIP } from '../api/tokenHandler';
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { Image as RNImage, Modal } from "react-native";
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
} from "lucide-react-native";
import { Pressable } from "@/components/ui/pressable";
import { useNavigation, useFocusEffect } from "@react-navigation/core";

import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { Avatar, AvatarFallbackText, AvatarImage } from "@/components/ui/avatar";
import { colors } from "@/src/theme/colors";

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

function FeedPost({ post }: FeedPostProps) {
  const navigation = useNavigation();

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
    <Box
      className="mx-3 mb-4 rounded-2xl border overflow-hidden"
      style={{ backgroundColor: colors.background.card, borderColor: colors.border.medium }}
    >
      {/* User row */}
      <Pressable
        onPress={() => (navigation as any).navigate('ForeignProfile', { foreign_profile_id: post.id_profiles })}
        accessibilityRole="button"
        accessibilityLabel={`Open ${post.display_name} profile`}
      >
        <HStack className="items-center gap-2 px-4 pt-4 pb-3">
          <Avatar size="md">
          <AvatarFallbackText className="text-white">
            {post?.display_name?.[0] ?? "?"}
          </AvatarFallbackText>
          <AvatarImage source={{ uri: post?.avatar_url || undefined }} />
        </Avatar>
          <Text className="font-bold text-base text-white">{post.display_name}</Text>
        </HStack>
      </Pressable>

      {/* Post media */}
      {post.source && (
        <Box
          className="mb-3 overflow-hidden border-y"
          style={{
            backgroundColor: colors.background.tertiary,
            borderColor: colors.border.light,
            aspectRatio: mediaDimensions ? mediaDimensions.width / mediaDimensions.height : 1
          }}
        >
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
      {!!post.description && (
        <Text className="leading-5 px-4 mb-2" style={{ color: colors.text.secondary }}>
          {post.description}
        </Text>
      )}

      {/* Hashtag */}
      {post.hashtag && (
        <Text className="text-primary-500 font-semibold px-4 mb-3">
          #{post.hashtag}
        </Text>
      )}

      {/* Reactions */}
      <HStack className="gap-6 items-center px-4 pb-4">
        <Pressable onPress={handleLike} accessibilityRole="button" accessibilityLabel="Like post">
          <Animated.View style={likeStyle}>
            <HStack className="items-center gap-1">
              <ThumbsUp
                size={18}
                color={interaction === 'like' ? colors.info.main : colors.text.tertiary}
                fill={interaction === 'like' ? colors.info.main : 'transparent'}
              />
              <Text className="text-sm text-white">{likes}</Text>
            </HStack>
          </Animated.View>
        </Pressable>

        <Pressable onPress={handleDislike} accessibilityRole="button" accessibilityLabel="Dislike post">
          <Animated.View style={dislikeStyle}>
            <HStack className="items-center gap-1">
              <ThumbsDown
                size={18}
                color={interaction === 'dislike' ? colors.error.dark : colors.text.tertiary}
                fill={interaction === 'dislike' ? colors.error.dark : 'transparent'}
              />
              <Text className="text-sm text-white">{dislikes}</Text>
            </HStack>
          </Animated.View>
        </Pressable>

        <Pressable onPress={handleCommentOpen} accessibilityRole="button" accessibilityLabel="Open comments">
          <HStack className="items-center gap-1">
            <Icon as={MessageCircle} size="md" style={{ color: colors.text.secondary }} />
            <Text className="text-sm text-white">{commentsCount}</Text>
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
