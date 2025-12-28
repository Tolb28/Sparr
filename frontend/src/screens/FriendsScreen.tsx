import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, View, Text } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { Ionicons } from '@expo/vector-icons';
import { getFriends } from '../api/friends';
import Friend from '../components/Friend';

export default function FriendsScreen() {
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFriends = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Loading friends...');
      const data = await getFriends();
      setFriends(data || []);
    } catch (err) {
      console.error('Failed to load friends', err);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  const filtered = friends.filter((f) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (f.display_name || '').toLowerCase().includes(q) || (f.username || '').toLowerCase().includes(q);
  });

  return (
    <Box className="flex-1 bg-gray-100 py-4">
        <HStack className="items-center px-3 py-5 gap-2">
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

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id_profiles)}
        renderItem={({ item }) => <Friend friend={item} />}
        contentContainerStyle={{ paddingBottom: 110, paddingTop: 8 }}
        ListEmptyComponent={() => (
          <View style={{ padding: 20 }}>
            <Text style={{ textAlign: 'center', color: '#666' }}>{loading ? 'Loading...' : 'No friends found'}</Text>
          </View>
        )}
      />
    </Box>
  );
}
