import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Message } from '../types/chat';
import { useThemeColors } from '@/src/hooks/useThemeColors';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  currentUserId: number;
  onSenderPress?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMe,
  currentUserId,
  onSenderPress,
}) => {
  const c = useThemeColors();

  const getInitials = (name: string | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const bubbleBackgroundColor = isMe ? c.primary.main : c.background.card;
  const bubbleBorderColor = isMe ? 'transparent' : c.border.light;
  // Own messages sit on the red primary background → keep white; others use theme text
  const textColor = isMe ? c.text.inverse : c.text.primary;

  return (
    <HStack
      style={[
        styles.container,
        isMe && styles.containerMe,
      ]}
    >
      {!isMe && (
        <Pressable onPress={onSenderPress} disabled={!onSenderPress} style={styles.avatar}>
          <Avatar size="sm">
            {message.senderAvatar ? (
              <AvatarImage
                source={{ uri: message.senderAvatar }}
                alt={message.senderName}
              />
            ) : (
              <AvatarFallbackText>
                {getInitials(message.senderName)}
              </AvatarFallbackText>
            )}
          </Avatar>
        </Pressable>
      )}

      <VStack
        style={[
          styles.messageGroup,
          isMe && styles.messageGroupMe,
        ]}
      >
        {!isMe && (
          <Text style={[styles.senderName, { color: c.text.secondary }]}>
            {message.senderName}
          </Text>
        )}

        <Box
          style={[
            styles.bubble,
            {
              backgroundColor: bubbleBackgroundColor,
              borderColor: bubbleBorderColor,
            },
            isMe && styles.bubbleMe,
          ]}
        >
          <Text style={[styles.content, { color: textColor }]}>
            {message.content}
          </Text>
        </Box>

        <View style={[styles.metadata, isMe && styles.metadataMe]}>
          <Text style={[styles.time, { color: c.text.tertiary }]}>
            {formatTime(message.created_at)}
          </Text>
          {message.edited_at && (
            <Text style={[styles.editedLabel, { color: c.text.tertiary }]}>
              (edited)
            </Text>
          )}
        </View>
      </VStack>
    </HStack>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  containerMe: {
    flexDirection: 'row-reverse',
  },
  avatar: {},
  messageGroup: {
    alignItems: 'flex-start',
    gap: 4,
    maxWidth: '80%',
  },
  messageGroupMe: {
    alignItems: 'flex-end',
  },
  senderName: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
    paddingHorizontal: 4,
  },
  bubble: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleMe: {
    borderTopRightRadius: 4,
    borderWidth: 0,
  },
  content: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '400',
    letterSpacing: 0.15,
  },
  metadata: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 4,
  },
  metadataMe: {
    justifyContent: 'flex-end',
  },
  time: {
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  editedLabel: {
    fontSize: 10,
    fontWeight: '400',
    fontStyle: 'italic',
  },
});

export default MessageBubble;
