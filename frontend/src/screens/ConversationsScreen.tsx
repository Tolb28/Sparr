import React, { useState, useCallback } from 'react';
import {
  FlatList,
  View,
  RefreshControl,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import ChatListItem from '../components/ChatListItem';
import { fetchConversations } from '../api/chatApi';
import { ConversationPreview } from '../types/chat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/ui/empty-state';
import { SparrButton } from '@/components/ui/sparr-button';
import { colors } from '@/src/theme/colors';

export default function ConversationsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchConversations();
      setConversations(data || []);
    } catch {
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
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  const filtered = conversations.filter((conversation) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      conversation.otherParticipantName?.toLowerCase().includes(q) ||
      conversation.lastMessage?.toLowerCase().includes(q)
    );
  });

  if (loading && !refreshing) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: (insets.top || 0) + 8 }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Messages</Text>
          <Pressable
            style={[styles.newBtn, { backgroundColor: colors.glass.surface, borderColor: colors.glass.border }]}
            onPress={() => navigation.navigate('NewConversation' as never)}
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary.main} />
          </Pressable>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.glass.surface, borderColor: colors.glass.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.text.tertiary} />
          <TextInput
            placeholder="Search messages..."
            placeholderTextColor={colors.text.tertiary}
            value={query}
            onChangeText={setQuery}
            style={[styles.searchInput, { color: colors.text.primary }]}
          />
          {query && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.text.tertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {filtered.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            icon="chatbubbles-outline"
            title={query ? 'No results' : 'No conversations yet'}
            subtitle={query ? 'Try a different search' : 'Start chatting with a friend'}
          />
          {!query && (
            <SparrButton
              label="New Conversation"
              variant="primary"
              onPress={() => navigation.navigate('NewConversation' as never)}
              style={styles.newConvoBtn}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={({ item }) => <ChatListItem conversation={item} />}
          keyExtractor={(item) => item.id_conversations.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.main} />}
          contentContainerStyle={{ paddingBottom: 100 }}
          scrollIndicatorInsets={{ right: 1 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.secondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 16, 
    paddingBottom: 12,
    borderBottomWidth: 1, 
    borderBottomColor: colors.border.light,
  },
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 12 
  },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: 0.3 },
  newBtn: {
    width: 38, 
    height: 38, 
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center', 
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12, 
    borderWidth: 1,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, fontWeight: '500' },
  newConvoBtn: { marginTop: 16, minWidth: 200 },
});
