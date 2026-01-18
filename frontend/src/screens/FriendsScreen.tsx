import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { Ionicons } from '@expo/vector-icons';
import { getFriends, getPendingRequests, acceptFriendRequest, declineFriendRequest } from '../api/friends';
import Friend from '../components/Friend';
import FriendRequest from '../components/FriendRequest';

export default function FriendsScreen() {
  const route = useRoute<RouteProp<any>>();
  const initialTab = (route.params?.activeTab as 'friends' | 'requests') || 'friends';
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>(initialTab);
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);

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

  useFocusEffect(
    useCallback(() => {
      loadFriends();
      loadRequests();
    }, [loadFriends, loadRequests])
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

  const renderFriendsTab = () => (
    <FlatList
      data={filteredFriends}
      keyExtractor={(item) => String(item.id_profiles)}
      renderItem={({ item }) => <Friend friend={item} />}
      contentContainerStyle={{ paddingBottom: 110, paddingTop: 8 }}
      ListEmptyComponent={() => (
        <View style={{ padding: 20 }}>
          <Text style={{ textAlign: 'center', color: '#666' }}>{loadingFriends ? 'Loading...' : 'No friends found'}</Text>
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
          <Text style={{ textAlign: 'center', color: '#666' }}>{loadingRequests ? 'Loading...' : 'No pending friend requests'}</Text>
        </View>
      )}
    />
  );

  return (
    <Box className="flex-1 bg-gray-100 py-4">
      {/* Tab Navigation */}

      {/* Search Input */}
      <HStack className="items-center px-3 mb-4 gap-2 pt-10">
        <Input variant="outline" className="flex-1 border border-gray-300 rounded-lg p-1 bg-transparent">
          <InputField
            className="p-0"
            placeholder="Search friends..."
            value={query}
            onChangeText={setQuery}
          />
          <InputSlot>
            <Ionicons name="search-outline" size={20} color="#6B7280" />
          </InputSlot>
        </Input>
      </HStack>

      <HStack className="mx-3 mb-4 gap-2 bg-white rounded-lg p-1 shadow-sm">
        <Pressable
          onPress={() => setActiveTab('friends')}
          className={`flex-1 py-3 px-4 rounded-md ${
            activeTab === 'friends' ? 'bg-blue-500' : 'bg-transparent'
          }`}
        >
          <Text
            className={`text-center font-bold ${
              activeTab === 'friends' ? 'text-white' : 'text-gray-700'
            }`}
          >
            Friends
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('requests')}
          className={`flex-1 py-3 px-4 rounded-md ${
            activeTab === 'requests' ? 'bg-blue-500' : 'bg-transparent'
          }`}
        >
          <Text
            className={`text-center font-bold ${
              activeTab === 'requests' ? 'text-white' : 'text-gray-700'
            }`}
          >
            Requests ({requests.length})
          </Text>
        </Pressable>
      </HStack>
      {/* Tab Content */}
      {activeTab === 'friends' && renderFriendsTab()}
      {activeTab === 'requests' && renderRequestsTab()}
    </Box>
  );
}
