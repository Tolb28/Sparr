import React from 'react';
import { View } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { Avatar, AvatarImage, AvatarFallbackText } from '@/components/ui/avatar';
import { useNavigation } from '@react-navigation/core';

interface FriendProps {
  friend: {
    id_profiles: number;
    display_name?: string;
    username?: string;
    avatar?: string | null;
    avatar_url?: string | null;
    location?: string | null;
  };
}

export default function Friend({ friend }: FriendProps) {
    const navigation = useNavigation();
  
  return (
    <Pressable onPress={() => (navigation as any).navigate('ForeignProfile', { foreign_profile_id: friend.id_profiles })}>
    <Box className="bg-white mx-3 mb-3 p-3 rounded-lg border border-gray-200">
      <HStack className="items-center gap-3">
        <Avatar size="md">
          {friend.avatar_url ? (
            <AvatarImage source={{ uri: friend.avatar_url }} />
          ) : (
            <AvatarFallbackText>{(friend.display_name || 'U')}</AvatarFallbackText>
          )}
        </Avatar>

        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '600' }}>{friend.display_name ?? 'No name'}</Text>
          <Text style={{ color: '#666' }}>@{friend.username ?? 'unknown'}</Text>
        </View>
      </HStack>
    </Box>
    </Pressable>
  );
}
