import React, { useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ListRenderItem,
  View
} from "react-native";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Input, InputField } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
import { Ionicons } from "@expo/vector-icons";
import { getCommentsForPost } from "../api/discovery";
import { getToken, ServerIP } from "../api/tokenHandler";
import { VStack } from "@/components/ui/vstack";
import { Icon } from "@/components/ui/icon/index.web";
import { User} from "lucide-react-native";
import { Avatar, AvatarFallbackText, AvatarImage } from "@/components/ui/avatar";
import { getProfile } from "../api/profileHandler";

/* =======================
   TYPES
======================= */

interface Comment {
  id_comments: number;
  display_name: string;
  content: string;
  avatar?: string | null;
  likes_count?: number;
  dislikes_count?: number;
  id_profiles: number;
  user_interaction?: 'like' | 'dislike' | null;
}

interface PostCommentProps {
  postId: number;
  onClose: () => void;
  onNewComment: () => void;
}

interface CommentUser {
  content: string;
  display_name: string;
  avatar?: string | null;
}

interface UserProfile {
  id_profiles: number;
  display_name: string;
  avatar?: string | null;
}

/* =======================
   COMPONENT
======================= */

export default function PostComment({
  postId,
  onClose,
  onNewComment,
}: PostCommentProps) {
  const [comments, setComments] = useState<CommentUser[]>([]);
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadComments();
  }, []);

  /* =======================
     LOAD COMMENTS
  ======================= */

  const loadComments = async (): Promise<void> => {
    try {
      const data = (await getCommentsForPost(postId)) as Comment[];
      console.log("Comments loaded:", data);
      setComments(data);
    } catch (e) {
      console.log("Comments error:", e);
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     SEND COMMENT
  ======================= */

  const sendComment = async (): Promise<void> => {
    if (!text.trim()) return;

    const data = (await getProfile());
    const profile = data ? JSON.parse(data) as UserProfile : null;

    const optimistic = { 
      display_name: profile?.display_name ?? "Error", // Placeholder name for optimistic comment
      content: text.trim(),
    };

    setComments((prev) => [optimistic, ...prev]);
    setText("");
    onNewComment();

    try {
      const token = await getToken();
      await fetch(`${ServerIP}/auth/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          postId,
          content: optimistic.content,
          profileId: profile?.id_profiles,
        }),
      });
    } catch (e) {
      console.log("Send comment failed:", e);
    }
  };

  /* =======================
     RENDER ITEM
  ======================= */

  const renderItem: ListRenderItem<Comment> = ({ item }) => (
    <Box className="mb-4">
      <HStack className="items-center mb-3 gap-2">
          <Avatar className="bg-indigo-600" size="md">
              <AvatarFallbackText className="text-white">{item?.display_name ?? '?'}</AvatarFallbackText>
              <AvatarImage source={{ uri: item?.avatar || undefined }} />
          </Avatar>
          <VStack>
            <Text className="font-bold text-base">{item.display_name}</Text>
            <Text className="text-gray-700">{item.content}</Text>
          </VStack>
      </HStack>
    </Box>
  );

  /* =======================
     UI
  ======================= */

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <Box className="flex-1 bg-white">
        {/* Header */}
        <HStack className="items-center justify-between p-4 border-b border-gray-200">
          <Text className="font-bold text-lg">Comments</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} />
          </Pressable>
        </HStack>

        {/* Comments */}
        <View className=" px-2 py-3">
          <FlatList<Comment | any>
            data={comments}
            keyExtractor={(item) => item.id_comments?.toString() || Math.random().toString()}
            renderItem={renderItem}
            inverted
            contentContainerStyle={{ padding: 16 }}
          />
        </View>
        {/* Input */}
        <HStack className="items-center p-3 border-t border-gray-200">
          <Input className="flex-1 mr-2">
            <InputField
              placeholder="Add a comment..."
              value={text}
              onChangeText={setText}
            />
          </Input>
          <Pressable onPress={sendComment}>
            <Ionicons name="send" size={22} color="#2563eb" />
          </Pressable>
        </HStack>
      </Box>
    </KeyboardAvoidingView>
  );
}
