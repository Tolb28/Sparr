import React, { useState, useCallback } from 'react';
import { FlatList, View, Text, Pressable, ActivityIndicator, TextInput, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getFriends, getPendingRequests, acceptFriendRequest, declineFriendRequest } from '../api/friends';
import Friend from '../components/Friend';
import FriendRequest from '../components/FriendRequest';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchConversations } from '../api/chatApi';
import { ConversationPreview } from '../types/chat';
import ChatListItem from '../components/ChatListItem';
import { TabBar } from '@/components/ui/tab-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { colors } from '@/src/theme/colors';

export default function FriendsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<any>>();
  const initialTab = (route.params?.activeTab as 'friends' | 'requests' | 'chats') || 'friends';
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'chats'>(initialTab);
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);

  const loadFriends = useCallback(async () => {
    setLoadingFriends(true);
    try {
      console.log('Loading friends...');
      const data = await getFriends();
      setFriends(data || []);
    } catch (err) {
      console.error('Failed to load friends', err);
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      console.log('Loading pending friend requests...');
      const data = await getPendingRequests();
      setRequests(data || []);
    } catch (err) {
      console.error('Failed to load friend requests', err);
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const data = await fetchConversations();
      setConversations(data || []);
    } catch (err) {
      console.error('Failed to load conversations', err);
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFriends();
      loadRequests();
      loadConversations();
    }, [loadFriends, loadRequests, loadConversations])
  );

  const handleAccept = async (friendRequestId: number, profiles_id_profiles: number) => {
    try {
      await acceptFriendRequest(friendRequestId, profiles_id_profiles);
      // Refresh both lists after accepting
      loadFriends();
      loadRequests();
    } catch (e) {
      console.error('Failed to accept friend request', e);
    }
  };

  const handleDecline = async (friendRequestId: number, profiles_id_profiles: number) => {
    try {
      await declineFriendRequest(friendRequestId, profiles_id_profiles);
      // Refresh requests list after declining
      loadRequests();
    } catch (e) {
      console.error('Failed to decline friend request', e);
    }
  };

  const filteredFriends = friends.filter((f) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (f.display_name || '').toLowerCase().includes(q) || (f.username || '').toLowerCase().includes(q);
  });

  const filteredRequests = requests.filter((f) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (f.display_name || '').toLowerCase().includes(q) || (f.username || '').toLowerCase().includes(q);
  });

  const filteredConversations = conversations.filter((conversation) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      conversation.otherParticipantName?.toLowerCase().includes(q) ||
      conversation.lastMessage?.toLowerCase().includes(q)
    );
  });

  const renderFriendsTab = () => (
    <FlatList
      data={filteredFriends}
      keyExtractor={(item) => String(item.id_profiles)}
      renderItem={({ item }) => <Friend friend={item} />}
      contentContainerStyle={{ paddingBottom: 110, paddingTop: 8 }}
      ListEmptyComponent={() => (
        <View style={{ padding: 20 }}>
          <Text style={{ textAlign: 'center', color: '#cb9090' }}>{loadingFriends ? 'Loading...' : 'No friends found'}</Text>
        </View>
      )}
    />
  );

  const renderRequestsTab = () => (
    <FlatList
      data={filteredRequests}
      keyExtractor={(item) => String(item.id_friend)}
      renderItem={({ item }) => (
        <FriendRequest
          request={item}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      )}
      contentContainerStyle={{ paddingBottom: 110, paddingTop: 8 }}
      ListEmptyComponent={() => (
        <View style={{ padding: 20 }}>
          <Text style={{ textAlign: 'center', color: '#cb9090' }}>{loadingRequests ? 'Loading...' : 'No pending friend requests'}</Text>
        </View>
      )}
    />
  );

  const renderChatsTab = () => (
    <FlatList
      data={filteredConversations}
      keyExtractor={(item) => String(item.id_conversations)}
      renderItem={({ item }) => <ChatListItem conversation={item} />}
      contentContainerStyle={{ paddingBottom: 110, paddingTop: 8 }}
      ListEmptyComponent={() => (
        <View style={{ padding: 20 }}>
          <Text style={{ textAlign: 'center', color: '#cb9090' }}>{loadingConversations ? 'Loading...' : 'No conversations yet'}</Text>
        </View>
      )}
    />
  );

  const FRIENDS_TABS = [
    { key: 'friends', label: 'Friends' },
    { key: 'chats', label: 'Chats' },
    { key: 'requests', label: `Requests${requests.length > 0 ? ` (${requests.length})` : ''}` },
  ];

  return (
    <View style={[styles.root, { paddingTop: (insets.top || 0) + 10 }]}>
      {/* Search + new conversation */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.text.tertiary} />
          <TextInput
            placeholder={activeTab === 'chats' ? 'Search conversations...' : 'Search friends...'}
            placeholderTextColor={colors.text.tertiary}
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
          />
        </View>
        {activeTab === 'chats' && (
          <Pressable
            style={styles.newChatBtn}
            onPress={() => navigation.navigate('NewConversation' as never)}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary.main} />
          </Pressable>
        )}
      </View>

      {/* Tab bar */}
      <View style={styles.tabBarWrapper}>
        <TabBar
          tabs={FRIENDS_TABS}
          activeTab={activeTab}
          onTabChange={(t) => setActiveTab(t as 'friends' | 'requests' | 'chats')}
        />
      </View>

      {/* Content */}
      {activeTab === 'friends' && (
        <FlatList
          data={filteredFriends}
          keyExtractor={(item) => String(item.id_profiles)}
          renderItem={({ item }) => <Friend friend={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            loadingFriends
              ? <ActivityIndicator color={colors.primary.main} style={{ marginTop: 40 }} />
              : <EmptyState icon="people-outline" title="No friends yet" subtitle="Find boxers to connect with in Discovery" style={styles.emptyState} />
          }
        />
      )}
      {activeTab === 'chats' && (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => String(item.id_conversations)}
          renderItem={({ item }) => <ChatListItem conversation={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            loadingConversations
              ? <ActivityIndicator color={colors.primary.main} style={{ marginTop: 40 }} />
              : <EmptyState icon="chatbubbles-outline" title="No conversations yet" subtitle="Message a friend to start chatting" style={styles.emptyState} />
          }
        />
      )}
      {activeTab === 'requests' && (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => String(item.id_friend)}
          renderItem={({ item }) => (
            <FriendRequest request={item} onAccept={handleAccept} onDecline={handleDecline} />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            loadingRequests
              ? <ActivityIndicator color={colors.primary.main} style={{ marginTop: 40 }} />
              : <EmptyState icon="person-add-outline" title="No pending requests" subtitle="Your incoming friend requests appear here" style={styles.emptyState} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.secondary },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, marginBottom: 10 },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.background.card, borderRadius: 12,
    paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border.light,
  },
  searchInput: { flex: 1, color: colors.text.primary, paddingVertical: 10, fontSize: 14 },
  newChatBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.glass.surface, borderWidth: 1, borderColor: colors.glass.border,
    alignItems: 'center', justifyContent: 'center',
  },
  tabBarWrapper: { marginHorizontal: 14, marginBottom: 4 },
  list: { paddingBottom: 110, paddingTop: 6 },
  emptyState: { paddingTop: 60 },
});
