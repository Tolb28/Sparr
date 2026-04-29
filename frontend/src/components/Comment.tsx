// Comment.tsx
import React, { useEffect, useState } from "react";
import { Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  SharedValue,
} from "react-native-reanimated";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Avatar, AvatarFallbackText, AvatarImage } from "@/components/ui/avatar";
import { ThumbsUp, ThumbsDown } from "lucide-react-native";

import { getToken, ServerIP } from "../api/tokenHandler";
import { useNavigation } from "@react-navigation/core";

/* =======================
   TYPES
======================= */

export interface Comment {
  id_comments: number;
  display_name: string;
  content: string;
  avatar?: string | null;
  avatar_url?: string | null;
  likes_count?: number;
  dislikes_count?: number;
  id_profiles: number;
  user_interaction?: "like" | "dislike" | null;
}

interface CommentProps {
  comment: Comment;
  navigation?: any;
  onNavigate?: () => void;
}

/* =======================
   COMPONENT
   - owns animation + interactions + network calls
======================= */

export default function Comment({ comment, navigation: navigationProp, onNavigate }: CommentProps) {
  const navigation = navigationProp || useNavigation();
  // keep internal state so this component can be fully self-contained
  const [likes, setLikes] = useState<number>(Number(comment.likes_count) ?? 0);
  const [dislikes, setDislikes] = useState<number>(Number(comment.dislikes_count) ?? 0);
  const [interaction, setInteraction] = useState<"like" | "dislike" | null>(
    comment.user_interaction ?? null
  );
  const [loading, setLoading] = useState<boolean>(false);

  // keep in-sync if parent replaces the comment object (e.g. after re-fetch)
  useEffect(() => {
    setLikes(Number(comment.likes_count) ?? 0);
    setDislikes(Number(comment.dislikes_count) ?? 0);
    setInteraction(comment.user_interaction ?? null);
    console.log("Comment object:", comment);
  }, [comment]);

  // Reanimated values & styles
  const likeScale: SharedValue<number> = useSharedValue(1);
  const dislikeScale: SharedValue<number> = useSharedValue(1);

  const likeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const dislikeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dislikeScale.value }],
  }));

  const animatePress = (scale: SharedValue<number>) => {
    // small press animation
    scale.value = 1;
    scale.value = withSequence(
      withTiming(1.2, { duration: 200 }),
      withTiming(1, { duration: 200 })
    );
  };

  // performs optimistic update and calls server
  const callInteraction = async (type: "like" | "dislike") => {
    if (loading) return;
    setLoading(true);

    const prevInteraction = interaction;
    const prevLikes = likes;
    const prevDislikes = dislikes;

    // optimistic update locally
    setInteraction((cur) => (cur === type ? null : type));

    setLikes((prev) => {
      const numPrev = Number(prev) || 0;
      if (type === "like") {
        if (prevInteraction === "like") return numPrev - 1;
        return prevInteraction === "dislike" ? numPrev + 1 : numPrev + 1;
      }
      return numPrev;
    });

    setDislikes((prev) => {
      const numPrev = Number(prev) || 0;
      if (type === "dislike") {
        if (prevInteraction === "dislike") return numPrev - 1;
        return prevInteraction === "like" ? numPrev + 1 : numPrev + 1;
      }
      return numPrev;
    });

    try {
      console.log("Sending interaction:", {commentId: comment.id_comments, type});
      const token = await getToken();

      const resp = await fetch(`${ServerIP}/auth/interactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          targetId: comment.id_comments,
          type,
          parent: "comment",
        }),
      });

      if (!resp.ok) throw new Error("Interaction failed");

      const data = await resp.json();

      // authoritative update from server (if provided)
      if (typeof data.likes_count === "number") setLikes(data.likes_count);
      if (typeof data.dislikes_count === "number")
        setDislikes(data.dislikes_count);

      // update interaction state if server returns something authoritative
      if ("user_interaction" in data) {
        setInteraction(data.user_interaction ?? null);
      }
    } catch (e) {
      // rollback on error
      console.error("Comment interaction error:", e);
      setInteraction(prevInteraction);
      setLikes(prevLikes);
      setDislikes(prevDislikes);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="mb-4">
      
      <HStack className="items-center mb-2 gap-2">
        {/* User row */}
      <Pressable onPress={() => {
        console.log("Avatar pressed, id_profiles:", comment.id_profiles);
        if (comment.id_profiles) {
          onNavigate?.();
          setTimeout(() => {
            (navigation as any).navigate('ForeignProfile', { foreign_profile_id: comment.id_profiles });
          }, 200);
        }
      }}>
        <HStack className="items-center mb-3 gap-2">
          <Avatar size="md">
          <AvatarFallbackText className="text-white">
            {comment?.display_name?.[0] ?? "?"}
          </AvatarFallbackText>
          <AvatarImage source={{ uri: comment?.avatar_url || undefined }} />
        </Avatar>
        </HStack>
      </Pressable>

        <VStack className="flex-1">
          <Pressable onPress={() => {
            console.log("Display name pressed, id_profiles:", comment.id_profiles);
            if (comment.id_profiles) {
              onNavigate?.();
              setTimeout(() => {
                (navigation as any).navigate('ForeignProfile', { foreign_profile_id: comment.id_profiles });
              }, 200);
            }
          }}>
            <Text className="font-bold text-base text-white">{comment.display_name}</Text>
          </Pressable>
          <Text className="text-[#cb9090]">{comment.content}</Text>

          <HStack className="gap-4 mt-2 items-center">
            <Pressable
              onPress={() => {
                animatePress(likeScale);
                callInteraction("like");
              }}
            >
              <Animated.View style={likeStyle}>
                <HStack className="items-center gap-1">
                  <ThumbsUp
                    size={16}
                    color={interaction === "like" ? "#2563eb" : "#6b7280"}
                    fill={interaction === "like" ? "#2563eb" : "transparent"}
                  />
                  <Text className="text-sm text-white">{likes}</Text>
                </HStack>
              </Animated.View>
            </Pressable>

            <Pressable
              onPress={() => {
                animatePress(dislikeScale);
                callInteraction("dislike");
              }}
            >
              <Animated.View style={dislikeStyle}>
                <HStack className="items-center gap-1">
                  <ThumbsDown
                    size={16}
                    color={interaction === "dislike" ? "#dc2626" : "#6b7280"}
                    fill={interaction === "dislike" ? "#dc2626" : "transparent"}
                  />
                  <Text className="text-sm text-white">{dislikes}</Text>
                </HStack>
              </Animated.View>
            </Pressable>
          </HStack>
        </VStack>
      </HStack>
    </Box>
  );
}
