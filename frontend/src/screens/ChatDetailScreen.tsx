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
import { fetchMessages, sendMessage, updateLastRead, getConversation, editMessage } from '../api/chatApi';
import { Message, Conversation } from '../types/chat';
import { getProfile } from '../api/profileHandler';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/ui/empty-state';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import ConfirmationModal from '@/src/components/ConfirmationModal';


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
  const c = useThemeColors();
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
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [msgOptionsTarget, setMsgOptionsTarget] = useState<Message | null>(null);
  const [conversationDetail, setConversationDetail] = useState<Conversation | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Sync display name when parent screen pushes updated params
  useEffect(() => {
    if (route.params?.otherParticipantName) {
      // Don't overwrite group title fetched from API
      if (!conversationDetail?.is_group || !conversationDetail?.title) {
        setDisplayName(route.params.otherParticipantName);
      }
    }
  }, [route.params?.otherParticipantName, conversationDetail]);

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

  const loadConversationDetail = useCallback(async () => {
    if (!conversationId) return;
    try {
      const detail = await getConversation(conversationId);
      setConversationDetail(detail);
      if (detail.is_group && detail.title) {
        setDisplayName(detail.title);
      }
    } catch {
      // Non-fatal: falls back to param values
    }
  }, [conversationId]);

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
    if (conversationId) loadConversationDetail();
  }, [conversationId, loadConversationDetail]);

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

  const handleLongPress = (msg: Message) => {
    if (sending) return; // don't allow a new edit while one is in flight
    const senderId = typeof msg.id_sender === 'number' ? msg.id_sender : parseInt(msg.id_sender as any, 10);
    if (currentUserId === null || senderId !== currentUserId) return;
    setMsgOptionsTarget(msg);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !conversationId) return;
    const content = messageText.trim();

    if (editingMessage) {
      const prevContent = editingMessage.content;
      const editId = editingMessage.id_messages;
      setMessages((prev) => prev.map((m) => m.id_messages === editId ? { ...m, content } : m));
      setMessageText('');
      setEditingMessage(null);
      setSending(true);
      try {
        const updated = await editMessage(editId, content);
        setMessages((prev) => prev.map((m) => m.id_messages === updated.id_messages ? updated : m));
      } catch {
        setMessages((prev) => prev.map((m) => m.id_messages === editId ? { ...m, content: prevContent } : m));
        setMessageText(content);
        setEditingMessage(editingMessage);
      } finally {
        setSending(false);
      }
      return;
    }

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
      <View style={[styles.root, styles.center, { backgroundColor: c.background.secondary }]}>
        <Text style={[styles.errorText, { color: c.text.primary }]}>Invalid conversation</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: c.background.secondary }]}>
        <ActivityIndicator size="large" color={c.primary.main} />
      </View>
    );
  }

  return (
    <>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? (editingMessage ? 122 : 92) : 0}
      style={[styles.root, { backgroundColor: c.background.secondary }]}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: (insets.top || 0) + 6, borderBottomColor: c.border.light, backgroundColor: c.background.secondary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={c.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerName, { color: c.text.primary }]}>{displayName || 'Chat'}</Text>
          <Text style={[styles.headerStatus, { color: c.text.tertiary }]}>Active now</Text>
        </View>
        <TouchableOpacity onPress={handleManage} style={styles.backBtn} disabled={conversationDetail === null}>
          <Ionicons name="information-circle-outline" size={22} color={c.text.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={buildMessageItems(messages)}
        renderItem={({ item }) => {
          if ('type' in item && item.type === 'date') {
            return (
              <View style={styles.dateSeparator}>
                <View style={[styles.dateLine, { backgroundColor: c.border.light }]} />
                <Text style={[styles.dateLabel, { color: c.text.tertiary }]}>{item.label}</Text>
                <View style={[styles.dateLine, { backgroundColor: c.border.light }]} />
              </View>
            );
          }
          const msg = item as Message;
          const senderId = typeof msg.id_sender === 'number' ? msg.id_sender : parseInt(msg.id_sender as any, 10);
          const isMe = currentUserId !== null && senderId === currentUserId;
          return (
            <TouchableOpacity
              onLongPress={() => handleLongPress(msg)}
              activeOpacity={1}
              delayLongPress={400}
            >
              <MessageBubble
                message={msg}
                isMe={isMe}
                currentUserId={currentUserId || 0}
                onSenderPress={!isMe ? () => navigation.navigate('ForeignProfile' as never, { foreign_profile_id: senderId } as never) : undefined}
              />
            </TouchableOpacity>
          );
        }}
        keyExtractor={(item) => 'type' in item ? (item as any).key : (item as Message).id_messages.toString()}
        contentContainerStyle={{ paddingVertical: 10, paddingBottom: 16 }}
        ListEmptyComponent={
          <EmptyState icon="chatbubble-outline" title="No messages yet" subtitle="Start the conversation!" style={styles.emptyState} />
        }
      />

      {editingMessage && (
        <View style={[styles.editingBar, { borderTopColor: c.border.light, backgroundColor: c.background.card }]}>
          <Ionicons name="pencil" size={14} color={c.primary.main} />
          <Text style={[styles.editingLabel, { color: c.text.secondary }]}>Editing message</Text>
          <TouchableOpacity
            onPress={() => { setEditingMessage(null); setMessageText(''); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={16} color={c.text.tertiary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(16, insets.bottom + 8), borderTopColor: c.border.light, backgroundColor: c.background.secondary }]}>
        <TouchableOpacity style={styles.inputAction}>
          <Ionicons name="add-circle-outline" size={24} color={c.text.secondary} />
        </TouchableOpacity>
        <View style={[styles.inputWrap, { backgroundColor: c.background.card, borderColor: c.border.light }]}>
          <TextInput
            placeholder="Message..."
            placeholderTextColor={c.text.tertiary}
            value={messageText}
            onChangeText={setMessageText}
            editable={!sending}
            multiline
            style={[styles.textInput, { color: c.text.primary }]}
          />
        </View>
        <TouchableOpacity
          onPress={handleSendMessage}
          disabled={!messageText.trim() || sending}
          style={[styles.sendBtn, { backgroundColor: messageText.trim() ? c.primary.main : c.background.primary }]}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    <ConfirmationModal
      visible={!!msgOptionsTarget}
      title="Message Options"
      confirmText="Edit"
      onConfirm={() => {
        if (msgOptionsTarget) {
          setEditingMessage(msgOptionsTarget);
          setMessageText(msgOptionsTarget.content);
        }
        setMsgOptionsTarget(null);
      }}
      onCancel={() => setMsgOptionsTarget(null)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  errorText: {},
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 6 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerName: { fontWeight: '700', fontSize: 15 },
  headerStatus: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  headerRight: { width: 34 },
  emptyState: { paddingTop: 60 },
  dateSeparator: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, paddingHorizontal: 16 },
  dateLine: { flex: 1, height: 1 },
  dateLabel: { fontSize: 11, marginHorizontal: 10, fontWeight: '600' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 14, paddingTop: 10,
    borderTopWidth: 1,
  },
  inputAction: { paddingBottom: 8 },
  inputWrap: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 14, paddingVertical: 2,
    borderWidth: 1,
  },
  textInput: { maxHeight: 96, paddingVertical: 9 },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  editingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  editingLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
});
