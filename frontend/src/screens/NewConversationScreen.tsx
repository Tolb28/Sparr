import React, { useState, useEffect, useCallback } from 'react';
import {
  FlatList,
  View,
  ActivityIndicator,
  TouchableOpacity,
  TextInput as RNTextInput,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { X } from 'lucide-react-native';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Divider } from '@/components/ui/divider';
import { getFriends } from '../api/friends';
import { createConversation } from '../api/chatApi';

interface Friend {
  id_profiles: number;
  display_name: string;
  avatar_url: string | null;
}

export default function NewConversationScreen() {
  const navigation = useNavigation<any>();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadFriends = useCallback(async () => {
    setLoading(true);
    try {
      console.log('[NEW CONVERSATION] Loading friends...');
      const data = await getFriends();
      setFriends(data || []);
      console.log('[NEW CONVERSATION] Loaded', data?.length, 'friends');
    } catch (err) {
      console.error('[NEW CONVERSATION] Failed to load friends', err);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFriends();
    }, [loadFriends])
  );

  const filteredFriends = friends.filter((friend) =>
    friend.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectFriend = async (friend: Friend) => {
    setSelectedFriend(friend);
    setSearching(true);

    try {
      console.log('[NEW CONVERSATION] Creating conversation with friend:', friend.id_profiles);
      const conversation = await createConversation([friend.id_profiles], 0, null);
      console.log('[NEW CONVERSATION] Conversation created:', conversation.id_conversations);

      // Navigate to the chat detail screen
      navigation.navigate('ChatDetail', {
        conversationId: conversation.id_conversations,
        otherParticipantName: friend.display_name,
        otherParticipantAvatar: friend.avatar_url,
      });
    } catch (err) {
      console.error('[NEW CONVERSATION] Failed to create conversation', err);
      setSelectedFriend(null);
    } finally {
      setSearching(false);
    }
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

  const renderFriendItem = ({ item }: { item: Friend }) => (
    <TouchableOpacity
      onPress={() => handleSelectFriend(item)}
      activeOpacity={0.7}
      disabled={searching}
    >
      <HStack space="md" className="px-4 py-3 items-center">
        <Avatar size="lg">
          {item.avatar_url ? (
            <AvatarImage source={{ uri: item.avatar_url }} alt={item.display_name} />
          ) : (
            <AvatarFallbackText>{getInitials(item.display_name)}</AvatarFallbackText>
          )}
        </Avatar>
        <VStack space="xs" className="flex-1">
          <Text size="lg" bold>
            {item.display_name}
          </Text>
        </VStack>
      </HStack>
      <Divider className="my-0" />
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <VStack space="md" className="flex-1 items-center justify-center px-4">
      <Text className="text-gray-600 text-center">
        {searchQuery ? 'No friends match your search' : 'No friends yet'}
      </Text>
    </VStack>
  );

  const renderHeader = () => (
    <VStack space="md" className="px-4 pt-10 bg-white border-b border-gray-200">
      <HStack space="md" className="items-center justify-between">
        <Text className="text-2xl font-bold">New Message</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon as={X} size="lg" className="text-gray-600" />
        </TouchableOpacity>
      </HStack>
      <RNTextInput
        style={{
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#e5e7eb',
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 16,
        }}
        placeholder="Search friends..."
        placeholderTextColor="#9ca3af"
        value={searchQuery}
        onChangeText={setSearchQuery}
        editable={!searching}
      />
    </VStack>
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {renderHeader()}
      {searching ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={filteredFriends}
          renderItem={renderFriendItem}
          keyExtractor={(item) => item.id_profiles.toString()}
          ListEmptyComponent={renderEmpty()}
          scrollEnabled={true}
        />
      )}
    </View>
  );
}
