import React, { useState, useCallback } from 'react';
import { FlatList, View, Pressable, ActivityIndicator, TextInput, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getFriends, getPendingRequests, acceptFriendRequest, declineFriendRequest } from '../api/friends';
import { fetchConversations } from '../api/chatApi';
import Friend from '../components/Friend';
import FriendRequest from '../components/FriendRequest';
import ChatListItem from '../components/ChatListItem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBar } from '@/components/ui/tab-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { colors } from '@/src/theme/colors';

export default function FriendsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<any>>();
  const initialTab = (route.params?.activeTab as 'friends' | 'requests' | 'conversations') || 'friends';
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'conversations'>(initialTab);
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);

  const loadFriends = useCallback(async () => {
    setLoadingFriends(true);
    try {
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
      loadFriends();
      loadRequests();
    } catch (e) {
      console.error('Failed to accept friend request', e);
    }
  };

  const handleDecline = async (friendRequestId: number, profiles_id_profiles: number) => {
    try {
      await declineFriendRequest(friendRequestId, profiles_id_profiles);
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

  const filteredConversations = conversations.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (c.otherParticipantName || '').toLowerCase().includes(q) || (c.title || '').toLowerCase().includes(q);
  });

  const FRIENDS_TABS = [
    { key: 'friends', label: 'Friends' },
    { key: 'requests', label: `Requests${requests.length > 0 ? ` (${requests.length})` : ''}` },
    { key: 'conversations', label: 'Messages' },
  ];

  return (
    <View style={[styles.root, { paddingTop: (insets.top || 0) + 10 }]}>
      {/* Search bar with new conversation button */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBar, { backgroundColor: colors.glass.surface, borderColor: colors.glass.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.text.tertiary} />
          <TextInput
            placeholder={activeTab === 'conversations' ? 'Search messages...' : 'Search friends...'}
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
        {activeTab === 'conversations' && (
          <Pressable 
            onPress={() => navigation.navigate('NewConversation')}
            hitSlop={8}
            style={styles.newConversationButton}
          >
            <Ionicons name="add-circle" size={28} color={colors.primary.main} />
          </Pressable>
        )}
      </View>

      {/* Tab bar */}
      <View style={styles.tabBarWrapper}>
        <TabBar
          tabs={FRIENDS_TABS}
          activeTab={activeTab}
          onTabChange={(t) => setActiveTab(t as 'friends' | 'requests' | 'conversations')}
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
          scrollIndicatorInsets={{ right: 1 }}
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
          scrollIndicatorInsets={{ right: 1 }}
        />
      )}
      {activeTab === 'conversations' && (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => String(item.id_conversations)}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                navigation.navigate('ChatDetail', {
                  conversationId: item.id_conversations,
                  otherParticipantName: item.otherParticipantName,
                  otherParticipantAvatar: item.otherParticipantAvatar,
                })
              }
            >
              <ChatListItem conversation={item} />
            </Pressable>
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            loadingConversations
              ? <ActivityIndicator color={colors.primary.main} style={{ marginTop: 40 }} />
              : <EmptyState icon="chatbubbles-outline" title="No conversations yet" subtitle="Start a conversation with your friends" style={styles.emptyState} />
          }
          scrollIndicatorInsets={{ right: 1 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.secondary },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, marginBottom: 10 },
  searchBar: {
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12, 
    borderWidth: 1,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, fontWeight: '500' },
  newConversationButton: { padding: 4 },
  tabBarWrapper: { marginHorizontal: 14, marginBottom: 4 },
  list: { paddingBottom: 110, paddingTop: 6 },
  emptyState: { paddingTop: 60 },
});
