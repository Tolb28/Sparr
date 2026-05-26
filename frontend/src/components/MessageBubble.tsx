import React from 'react';
import { View, Pressable } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Message } from '../types/chat';

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

  return (
    <HStack
      className={`items-end space-x-2 px-4 py-2 ${
        isMe ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {!isMe && (
        <Pressable onPress={onSenderPress} disabled={!onSenderPress}>
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
        space="xs"
        className={`max-w-xs ${
          isMe ? 'items-end' : 'items-start'
        }`}
      >
        {!isMe && (
          <Text size="xs" className="text-[#cb9090] px-3">
            {message.senderName}
          </Text>
        )}

        <Box
          className={`px-4 py-2 rounded-2xl ${
            isMe
              ? 'bg-primary-500 rounded-br-none'
              : 'rounded-bl-none'
          }`}
          style={!isMe ? { backgroundColor: '#2a2a2a' } : undefined}
        >
          <Text
            className={`${
              isMe ? 'text-white' : 'text-gray-900'
            }`}
            style={!isMe ? { color: '#ffffff' } : undefined}
          >
            {message.content}
          </Text>
        </Box>

        <Text size="xs" className="text-[#8f6d6d] px-3">
          {formatTime(message.created_at)}
          {message.edited_at && ' (edited)'}
        </Text>
      </VStack>
    </HStack>
  );
};

export default MessageBubble;
