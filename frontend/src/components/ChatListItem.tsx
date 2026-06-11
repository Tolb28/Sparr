import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Divider } from '@/components/ui/divider';
import { ConversationPreview } from '../types/chat';
import { useNavigation } from '@react-navigation/native';
import { useThemeColors } from '@/src/hooks/useThemeColors';

interface ChatListItemProps {
  conversation: ConversationPreview;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({ conversation }) => {
  const navigation = useNavigation<any>();
  const c = useThemeColors();

  const handlePress = () => {
    navigation.navigate('ChatDetail', {
      conversationId: conversation.id_conversations,
      otherParticipantName: conversation.otherParticipantName,
      otherParticipantAvatar: conversation.otherParticipantAvatar,
    });
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatTimestamp = useMemo(() => {
    const timestamp = conversation.lastMessageTimestamp;
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  }, [conversation.lastMessageTimestamp]);

  const truncateMessage = (message: string, maxLength: number = 45) => {
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  };

  // Check if conversation has unread messages (placeholder implementation)
  const hasUnread = (conversation.unreadCount ?? 0) > 0;

  return (
    <View style={styles.root}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.65}
        style={[
          styles.content,
          hasUnread && { backgroundColor: c.glass.redSurface },
        ]}
      >
        <HStack style={styles.row}>
          <View style={styles.avatarWrapper}>
            <Avatar size="lg">
              {conversation.otherParticipantAvatar ? (
                <AvatarImage
                  source={{ uri: conversation.otherParticipantAvatar }}
                  alt={conversation.otherParticipantName}
                />
              ) : (
                <AvatarFallbackText>
                  {getInitials(conversation.otherParticipantName)}
                </AvatarFallbackText>
              )}
            </Avatar>
            {/* Optional: Online indicator */}
            {/* <View style={[styles.statusIndicator, { backgroundColor: c.status.online, borderColor: c.background.secondary }]} /> */}
          </View>

          <VStack style={styles.messageContent}>
            <Text style={[styles.participantName, hasUnread && styles.unreadText, { color: c.text.primary }]}>
              {conversation.otherParticipantName}
            </Text>
            <Text
              style={[styles.lastMessage, hasUnread && styles.unreadMessageText, { color: c.text.secondary }]}
              numberOfLines={1}
            >
              {truncateMessage(conversation.lastMessage || 'No messages yet')}
            </Text>
          </VStack>

          <VStack style={styles.rightContent}>
            <Text style={[styles.timestamp, hasUnread && { color: c.primary.main }, !hasUnread && { color: c.text.tertiary }]}>
              {formatTimestamp}
            </Text>
            {hasUnread && (
              <View style={[styles.unreadBadge, { backgroundColor: c.primary.main, minWidth: (conversation.unreadCount ?? 0) > 9 ? 18 : 16 }]}>
                <Text style={styles.unreadCount}>
                  {(conversation.unreadCount ?? 0) > 99 ? '99+' : conversation.unreadCount}
                </Text>
              </View>
            )}
          </VStack>
        </HStack>
      </TouchableOpacity>
      <Divider style={[styles.divider, { backgroundColor: c.border.light }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  content: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  row: {
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  messageContent: {
    flex: 1,
    gap: 4,
  },
  participantName: {
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  lastMessage: {
    fontSize: 13,
  },
  rightContent: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  unreadBadge: {
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 14,
  },
  unreadText: {
    fontWeight: '700',
  },
  unreadMessageText: {
    fontWeight: '600',
  },
  divider: {
    marginLeft: 72,
  },
});

export default ChatListItem;
