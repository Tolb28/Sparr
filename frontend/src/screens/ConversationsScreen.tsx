import React, { useState, useEffect, useCallback } from 'react';
import {
  FlatList,
  View,
  ActivityIndicator,
  RefreshControl,
  Text,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Button, ButtonText } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { MessageCircle } from 'lucide-react-native';
import ChatListItem from '../components/ChatListItem';
import { fetchConversations } from '../api/chatApi';
import { ConversationPreview } from '../types/chat';

export default function ConversationsScreen() {
  const navigation = useNavigation<any>();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      console.log('[CONVERSATIONS] Loading conversations...');
      const data = await fetchConversations();
      setConversations(data || []);
      console.log('[CONVERSATIONS] Loaded', data?.length, 'conversations');
    } catch (err) {
      console.error('[CONVERSATIONS] Failed to load conversations', err);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchConversations();
      setConversations(data || []);
    } catch (err) {
      console.error('[CONVERSATIONS] Failed to refresh conversations', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  const handleNewConversation = () => {
    navigation.navigate('NewConversation');
  };

  const renderEmpty = () => (
    <VStack space="md" className="flex-1 items-center justify-center px-4">
      <Icon as={MessageCircle} size="xl" className="text-gray-400" />
      <Text className="text-gray-600 text-center">
        No conversations yet. Start chatting with a friend!
      </Text>
      <Button
        action="primary"
        onPress={handleNewConversation}
        className="mt-4"
      >
        <ButtonText>New Conversation</ButtonText>
      </Button>
    </VStack>
  );

  const renderHeader = () => (
    <VStack space="md" className="px-4 py-4 bg-white">
      <HStack space="md" className="items-center justify-between">
        <Text className="text-2xl font-bold">Messages</Text>
        <Button
          action="primary"
          size="sm"
          onPress={handleNewConversation}
          className="px-3"
        >
          <ButtonText>New</ButtonText>
        </Button>
      </HStack>
    </VStack>
  );

  if (loading && !refreshing) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white pt-10">
      {renderHeader()}
      {conversations.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={conversations}
          renderItem={({ item }) => <ChatListItem conversation={item} />}
          keyExtractor={(item) => item.id_conversations.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3b82f6"
            />
          }
          scrollEnabled={true}
        />
      )}
    </View>
  );
}
