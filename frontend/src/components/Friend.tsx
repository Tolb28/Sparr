import React, { useState } from 'react';
import { View, Pressable as RNPressable, StyleSheet } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { Avatar, AvatarImage, AvatarFallbackText } from '@/components/ui/avatar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/core';
import { createConversation } from '../api/chatApi';
import { useThemeColors } from '@/src/hooks/useThemeColors';

interface FriendProps {
  friend: {
    id_profiles: number;
    display_name?: string;
    username?: string;
    avatar?: string | null;
    avatar_url?: string | null;
    location?: string | null;
  };
}

export default function Friend({ friend }: FriendProps) {
  const navigation = useNavigation();
  const [isPressed, setIsPressed] = useState(false);
  const [messagingLoading, setMessagingLoading] = useState(false);
  const c = useThemeColors();

  const handleMessage = async (e: any) => {
    e.stopPropagation();
    setMessagingLoading(true);
    try {
      const conversation = await createConversation([friend.id_profiles], 0);
      (navigation as any).navigate('ChatDetail', {
        conversationId: conversation.id_conversations,
        otherParticipantName: friend.display_name,
        otherParticipantAvatar: friend.avatar_url,
      });
    } catch (error) {
      console.error('Failed to create or open conversation:', error);
    } finally {
      setMessagingLoading(false);
    }
  };

  const handleProfilePress = () => {
    (navigation as any).navigate('ForeignProfile', { foreign_profile_id: friend.id_profiles });
  };

  return (
    <RNPressable
      onPress={handleProfilePress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      style={[styles.pressable, isPressed && styles.pressableActive]}
    >
      <Box style={[styles.container, { backgroundColor: c.background.tertiary, borderColor: c.border.light }]}>
        <HStack style={styles.row}>
          <Avatar size="md">
            {friend.avatar_url ? (
              <AvatarImage source={{ uri: friend.avatar_url }} alt={friend.display_name} />
            ) : (
              <AvatarFallbackText>{(friend.display_name || 'U')?.charAt(0).toUpperCase()}</AvatarFallbackText>
            )}
          </Avatar>

          <VStack style={styles.content}>
            <Text style={[styles.displayName, { color: c.text.primary }]}>
              {friend.display_name ?? 'No name'}
            </Text>
            <Text style={[styles.username, { color: c.text.secondary }]}>
              @{friend.username ?? 'unknown'}
            </Text>
          </VStack>

          <Pressable onPress={handleMessage} disabled={messagingLoading} style={[styles.messageBtn, { backgroundColor: c.glass.redSurface, borderColor: c.glass.redBorder }]} hitSlop={8}>
            <Ionicons name="chatbubble-outline" size={18} color={c.primary.main} />
          </Pressable>
        </HStack>
      </Box>
    </RNPressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  pressableActive: {
    opacity: 0.7,
  },
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  row: {
    alignItems: 'center',
    gap: 12,
  },
  content: {
    flex: 1,
  },
  displayName: {
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  username: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  messageBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
