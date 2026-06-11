// CommentSection.tsx
import React, { useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  View,
} from "react-native";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Input, InputField } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
import { Ionicons } from "@expo/vector-icons";

import { getCommentsForPost } from "../api/discovery";
import { getToken, ServerIP } from "../api/tokenHandler";
import { useNavigation } from "@react-navigation/native";
import { useThemeColors } from "@/src/hooks/useThemeColors";

import Comment, { Comment as CommentType } from "./Comment";

/* =======================
   TYPES
======================= */

interface CommentSectionProps {
  postId: number;
  onClose: () => void;
  onNewComment: () => void;
  onNavigateAway?: () => void;
}

/* =======================
   COMPONENT
   - only loads comments + posting input
   - delegates interactions entirely to Comment component
======================= */

export default function CommentSection({
  postId,
  onClose,
  onNewComment,
  onNavigateAway,
}: CommentSectionProps) {
  const navigation = useNavigation();
  const c = useThemeColors();
  const [comments, setComments] = useState<CommentType[]>([]);
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadComments();
  }, []);

  const loadComments = async (): Promise<void> => {
    try {
      const data = (await getCommentsForPost(postId)) as CommentType[];
      setComments(data);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const sendComment = async (): Promise<void> => {
    if (!text.trim()) return;

    const optimistic: CommentType = {
      id_comments: Math.random(),
      display_name: "You",
      content: text.trim(),
      likes_count: 0,
      dislikes_count: 0,
      user_interaction: null,
      id_profiles: 0,
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
        }),
      });

      // refresh to get authoritative data
      loadComments();
    } catch (e) {
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <Box className="flex-1" style={{ backgroundColor: c.background.primary }}>
        {/* Header */}
        <HStack className="items-center justify-between p-4 border-b" style={{ borderBottomColor: c.border.light }}>
          <Text className="font-bold text-lg" style={{ color: c.text.primary }}>Comments</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color={c.text.secondary} />
          </Pressable>
        </HStack>

        {/* Comments */}
        <View className="px-2 py-3 flex-1">
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id_comments.toString()}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => <Comment comment={item} navigation={navigation} onNavigate={() => {
              onNavigateAway?.();
              onClose();
            }} />}
          />
        </View>

        {/* Input */}
        <HStack className="items-center p-3 border-t" style={{ borderTopColor: c.border.light }}>
          <Input className="flex-1 mr-2" style={{ borderColor: c.input.border, backgroundColor: c.input.background }}>
            <InputField
              placeholder="Add a comment..."
              value={text}
              onChangeText={setText}
              placeholderTextColor={c.input.placeholder}
              style={{ color: c.text.primary }}
            />
          </Input>
          <Pressable onPress={sendComment}>
            <Ionicons name="send" size={22} color="#f20d0d" />
          </Pressable>
        </HStack>
      </Box>
    </KeyboardAvoidingView>
  );
}
