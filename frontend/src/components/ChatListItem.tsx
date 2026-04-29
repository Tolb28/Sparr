import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Divider } from '@/components/ui/divider';
import { ConversationPreview } from '../types/chat';
import { useNavigation } from '@react-navigation/native';

interface ChatListItemProps {
  conversation: ConversationPreview;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({ conversation }) => {
  const navigation = useNavigation<any>();

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

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const truncateMessage = (message: string, maxLength: number = 40) => {
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  };

  return (
    <View>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        className="px-4 py-3"
      >
        <HStack space="md" className="items-center">
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

          <VStack space="xs" className="flex-1">
            <Text size="lg" bold className="text-white">
              {conversation.otherParticipantName}
            </Text>
            <Text size="sm" className="text-[#cb9090]">
              {truncateMessage(conversation.lastMessage || 'No messages yet')}
            </Text>
          </VStack>

          <Text size="xs" className="text-[#cb9090]">
            {formatTimestamp(conversation.lastMessageTimestamp)}
          </Text>
        </HStack>
      </TouchableOpacity>
      <Divider className="my-0" style={{ backgroundColor: '#3a1d1d' }} />
    </View>
  );
};

export default ChatListItem;
