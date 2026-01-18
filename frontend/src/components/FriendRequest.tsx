import React from 'react';
import { View, Pressable as RNPressable } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { Avatar, AvatarImage, AvatarFallbackText } from '@/components/ui/avatar';
import { useNavigation } from '@react-navigation/core';

interface FriendRequestProps {
  request: {
    id_friend: number;
    profiles_id_profiles: number;
    id_profiles: number;
    display_name?: string;
    username?: string;
    avatar?: string | null;
    avatar_url?: string | null;
    location?: string | null;
  };
  onAccept: (id_friend: number, profiles_id_profiles: number) => void;
  onDecline: (id_friend: number, profiles_id_profiles: number) => void;
}

export default function FriendRequest({ request, onAccept, onDecline }: FriendRequestProps) {
  const navigation = useNavigation();

  return (
    <Box className="bg-white mx-3 mb-3 rounded-lg border border-gray-200">
      <RNPressable onPress={() => (navigation as any).navigate('ForeignProfile', { foreign_profile_id: request.id_profiles })}>
        <Box className="p-3 pb-0">
          <HStack className="items-center gap-3 mb-3">
            <Avatar size="md">
              {request.avatar_url ? (
                <AvatarImage source={{ uri: request.avatar_url }} />
              ) : (
                <AvatarFallbackText>{(request.display_name || 'U')}</AvatarFallbackText>
              )}
            </Avatar>

            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600' }}>{request.display_name ?? 'No name'}</Text>
              <Text style={{ color: '#666' }}>@{request.username ?? 'unknown'}</Text>
            </View>
          </HStack>
        </Box>
      </RNPressable>
      
      <HStack className="gap-2 justify-end p-3 pt-0">
        <Pressable
          onPress={() => onDecline(request.id_friend, request.profiles_id_profiles)}
          className="flex-1 px-3 py-2 bg-red-500 rounded-md"
        >
          <Text className="text-white text-center font-bold text-sm">Decline</Text>
        </Pressable>
        <Pressable
          onPress={() => onAccept(request.id_friend, request.profiles_id_profiles)}
          className="flex-1 px-3 py-2 bg-green-500 rounded-md"
        >
          <Text className="text-white text-center font-bold text-sm">Accept</Text>
        </Pressable>
      </HStack>
    </Box>
  );
}
