import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FlatList,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Send } from 'lucide-react-native';
import MessageBubble from '../components/MessageBubble';
import { fetchMessages, sendMessage, updateLastRead } from '../api/chatApi';
import { Message } from '../types/chat';
import { getProfile } from '../api/profileHandler';

export default function ChatDetailScreen() {
  const route = useRoute<
    RouteProp<any, 'ChatDetail'>
  >();
  const navigation = useNavigation<any>();
  const { conversationId, otherParticipantName, otherParticipantAvatar } =
    route.params || {};

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const loadCurrentUser = useCallback(async () => {
    try {
      // First try to get profile from storage
      const profileData = await getProfile();
      console.log('[CHAT DETAIL] Retrieved profile data from storage:', profileData);
      console.log('[CHAT DETAIL] Type of profileData:', typeof profileData);
      
      if (profileData) {
        try {
          let profile = profileData;
          
          // If it's a string, parse it
          if (typeof profileData === 'string') {
            profile = JSON.parse(profileData);
          }
          
          console.log('[CHAT DETAIL] Parsed profile object:', profile);
          console.log('[CHAT DETAIL] Profile id_profiles:', profile?.id_profiles);
          
          if (profile?.id_profiles) {
            const userId = typeof profile.id_profiles === 'number' 
              ? profile.id_profiles 
              : parseInt(profile.id_profiles, 10);
            console.log('[CHAT DETAIL] Setting currentUserId to:', userId, '(type:', typeof userId, ')');
            setCurrentUserId(userId);
            return userId;
          }
        } catch (parseErr) {
          console.error('[CHAT DETAIL] Failed to parse profile:', parseErr);
          console.error('[CHAT DETAIL] Raw profileData:', profileData);
        }
      } else {
        console.log('[CHAT DETAIL] No profileData found in storage');
      }

      console.log('[CHAT DETAIL] Could not load current user ID from storage');
      return null;
    } catch (err) {
      console.error('[CHAT DETAIL] Failed to load current user', err);
      return null;
    }
  }, []);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;

    setLoading(true);
    try {
      console.log('[CHAT DETAIL] Loading messages for conversation:', conversationId);
      const data = await fetchMessages(conversationId, 50, 0);
      // Keep messages in order (oldest first) for normal top-to-bottom display
      setMessages(data || []);
      console.log('[CHAT DETAIL] Loaded', data?.length, 'messages');
      if (data && data.length > 0) {
        console.log('[CHAT DETAIL] First message sender ID:', data[0].id_sender);
        console.log('[CHAT DETAIL] Last message sender ID:', data[data.length - 1].id_sender);
      }
      
      // Update last read
      if (data && data.length > 0) {
        await updateLastRead(conversationId, data[data.length - 1].id_messages);
      }
    } catch (err) {
      console.error('[CHAT DETAIL] Failed to load messages', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Load current user on mount
  useEffect(() => {
    loadCurrentUser();
  }, []);

  // Load messages when currentUserId is set
  useEffect(() => {
    if (currentUserId && conversationId) {
      loadMessages();
    }
  }, [currentUserId, conversationId]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !conversationId) return;

    const messageContent = messageText;
    setMessageText('');
    setSending(true);

    try {
      console.log('[CHAT DETAIL] Sending message:', messageContent);
      const newMessage = await sendMessage(conversationId, messageContent);
      
      setMessages((prev) => [...prev, newMessage]);
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error('[CHAT DETAIL] Failed to send message', err);
      // Re-add the message to input if it failed
      setMessageText(messageContent);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    // Ensure both values are numbers for comparison
    const senderId = typeof item.id_sender === 'number' 
      ? item.id_sender 
      : parseInt(item.id_sender as any, 10);
    const isMe = currentUserId !== null && senderId === currentUserId;
    
    // Debug every 3rd message to reduce log spam
    if (messages.length > 0 && item.id_messages % 3 === 0) {
      console.log('[CHAT DETAIL] Message render check:', {
        id_messages: item.id_messages,
        id_sender: item.id_sender,
        currentUserId: currentUserId,
        isMe: isMe,
        senderName: item.senderName,
        comparison: `${item.id_sender} === ${currentUserId} = ${isMe}`
      });
    }
    
    return <MessageBubble message={item} isMe={isMe} currentUserId={currentUserId || 0} />;
  };

  const renderHeader = () => (
    <VStack space="sm" className="px-4 pt-4 pb-3 bg-white border-b border-gray-200" style={{ paddingTop: 20 }}>
      <HStack space="md" className="items-center h-12">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
          <Text className="text-blue-500 font-semibold text-base">Back</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold flex-1">
          {otherParticipantName || 'Chat'}
        </Text>
      </HStack>
    </VStack>
  );

  const renderFooter = () => (
    <HStack space="sm" className="px-4 pt-5 bg-white border-t border-gray-200 items-end">
      <RNTextInput
        style={{
          flex: 1,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: '#e5e7eb',
          paddingHorizontal: 16,
          paddingVertical: 10,
          maxHeight: 100,
          fontSize: 16,
        }}
        placeholder="Type a message..."
        placeholderTextColor="#9ca3af"
        value={messageText}
        onChangeText={setMessageText}
        editable={!sending}
        multiline
      />
      <TouchableOpacity
        onPress={handleSendMessage}
        disabled={!messageText.trim() || sending}
        style={{
          paddingVertical: 10,
          paddingHorizontal: 12,
          opacity: !messageText.trim() || sending ? 0.5 : 1,
        }}
      >
        <Icon
          as={Send}
          size="lg"
          className={messageText.trim() ? 'text-blue-500' : 'text-gray-400'}
        />
      </TouchableOpacity>
    </HStack>
  );

  if (!conversationId) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Invalid conversation</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      className="flex-1 bg-white"
    >
      {renderHeader()}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id_messages.toString()}
        scrollEnabled={true}
        contentContainerStyle={{
          paddingVertical: 10,
        }}
        ListEmptyComponent={
          <VStack space="md" className="flex-1 items-center justify-center py-8">
            <Text className="text-gray-600">No messages yet</Text>
            <Text className="text-gray-500 text-sm">Start the conversation!</Text>
          </VStack>
        }
      />
      {renderFooter()}
    </KeyboardAvoidingView>
  );
}
