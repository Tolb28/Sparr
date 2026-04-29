import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FlatList,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { Text } from '@/components/ui/text';
import MessageBubble from '../components/MessageBubble';
import { fetchMessages, sendMessage, updateLastRead } from '../api/chatApi';
import { Message } from '../types/chat';
import { getProfile } from '../api/profileHandler';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/ui/empty-state';
import { colors } from '@/src/theme/colors';


// Helper: format date for separator
function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Helper: build list items with date separators
function buildMessageItems(messages: Message[]): Array<Message | { type: 'date'; label: string; key: string }> {
  const items: Array<Message | { type: 'date'; label: string; key: string }> = [];
  let lastDate = '';
  for (const msg of messages) {
    const dateStr = msg.created_at.split('T')[0];
    if (dateStr !== lastDate) {
      items.push({ type: 'date', label: formatDateLabel(msg.created_at), key: `date-${dateStr}` });
      lastDate = dateStr;
    }
    items.push(msg);
  }
  return items;
}

export default function ChatDetailScreen() {
  const route = useRoute<RouteProp<any, 'ChatDetail'>>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { conversationId, otherParticipantName } = route.params || {};

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [displayName, setDisplayName] = useState(otherParticipantName || 'Chat');
  const flatListRef = useRef<FlatList>(null);

  // Sync display name when parent screen pushes updated params
  useEffect(() => {
    if (route.params?.otherParticipantName) {
      setDisplayName(route.params.otherParticipantName);
    }
  }, [route.params?.otherParticipantName]);

  const loadCurrentUser = useCallback(async () => {
    try {
      const profileData = await getProfile();
      if (!profileData) return null;
      const profile = typeof profileData === 'string' ? JSON.parse(profileData) : profileData;
      if (profile?.id_profiles) {
        const userId = typeof profile.id_profiles === 'number' ? profile.id_profiles : parseInt(profile.id_profiles, 10);
        setCurrentUserId(userId);
        return userId;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const data = await fetchMessages(conversationId, 50, 0);
      setMessages(data || []);
      if (data && data.length > 0) {
        await updateLastRead(conversationId, data[data.length - 1].id_messages);
      }
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  useEffect(() => {
    if (currentUserId && conversationId) {
      loadMessages();
    }
  }, [currentUserId, conversationId, loadMessages]);

  const handleManage = () => {
    navigation.navigate('ConversationSettings', {
      conversationId,
      conversationTitle: displayName || 'Chat',
    });
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !conversationId) return;
    const content = messageText;
    setMessageText('');
    setSending(true);
    try {
      const newMessage = await sendMessage(conversationId, content);
      setMessages((prev) => [...prev, newMessage]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    } catch {
      setMessageText(content);
    } finally {
      setSending(false);
    }
  };

  if (!conversationId) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.errorText}>Invalid conversation</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 92 : 0}
      style={[styles.root, { backgroundColor: colors.background.secondary }]}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: (insets.top || 0) + 6 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerName}>{displayName || 'Chat'}</Text>
          <Text style={styles.headerStatus}>Active now</Text>
        </View>
        <TouchableOpacity onPress={handleManage} style={styles.backBtn}>
          <Ionicons name="ellipsis-horizontal" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={buildMessageItems(messages)}
        renderItem={({ item }) => {
          if ('type' in item && item.type === 'date') {
            return (
              <View style={styles.dateSeparator}>
                <View style={styles.dateLine} />
                <Text style={styles.dateLabel}>{item.label}</Text>
                <View style={styles.dateLine} />
              </View>
            );
          }
          const msg = item as Message;
          const senderId = typeof msg.id_sender === 'number' ? msg.id_sender : parseInt(msg.id_sender as any, 10);
          const isMe = currentUserId !== null && senderId === currentUserId;
          return (
            <MessageBubble
              message={msg}
              isMe={isMe}
              currentUserId={currentUserId || 0}
              onSenderPress={!isMe ? () => navigation.navigate('ForeignProfile' as never, { foreign_profile_id: senderId } as never) : undefined}
            />
          );
        }}
        keyExtractor={(item) => 'type' in item ? (item as any).key : (item as Message).id_messages.toString()}
        contentContainerStyle={{ paddingVertical: 10, paddingBottom: 16 }}
        ListEmptyComponent={
          <EmptyState icon="chatbubble-outline" title="No messages yet" subtitle="Start the conversation!" style={styles.emptyState} />
        }
      />

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>
        <TouchableOpacity style={styles.inputAction}>
          <Ionicons name="add-circle-outline" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        <View style={styles.inputWrap}>
          <TextInput
            placeholder="Message..."
            placeholderTextColor={colors.text.tertiary}
            value={messageText}
            onChangeText={setMessageText}
            editable={!sending}
            multiline
            style={styles.textInput}
          />
        </View>
        <TouchableOpacity
          onPress={handleSendMessage}
          disabled={!messageText.trim() || sending}
          style={[styles.sendBtn, { backgroundColor: messageText.trim() ? colors.primary.main : colors.background.primary }]}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.secondary },
  center: { alignItems: 'center', justifyContent: 'center' },
  errorText: { color: colors.text.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border.light,
    backgroundColor: colors.background.secondary,
  },
  backBtn: { padding: 6 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerName: { color: colors.text.primary, fontWeight: '700', fontSize: 15 },
  headerStatus: { color: colors.text.tertiary, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  headerRight: { width: 34 },
  emptyState: { paddingTop: 60 },
  dateSeparator: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, paddingHorizontal: 16 },
  dateLine: { flex: 1, height: 1, backgroundColor: colors.border.light },
  dateLabel: { color: colors.text.tertiary, fontSize: 11, marginHorizontal: 10, fontWeight: '600' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 14, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: colors.border.light,
    backgroundColor: colors.background.secondary,
  },
  inputAction: { paddingBottom: 8 },
  inputWrap: {
    flex: 1,
    backgroundColor: colors.background.card, borderRadius: 22,
    paddingHorizontal: 14, paddingVertical: 2,
    borderWidth: 1, borderColor: colors.border.light,
  },
  textInput: { color: colors.text.primary, maxHeight: 96, paddingVertical: 9 },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
});
