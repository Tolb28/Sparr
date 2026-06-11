import React from 'react';
import { View, Pressable as RNPressable, StyleSheet } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { Avatar, AvatarImage, AvatarFallbackText } from '@/components/ui/avatar';
import { useNavigation } from '@react-navigation/core';
import { useThemeColors } from '@/src/hooks/useThemeColors';

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
  const c = useThemeColors();

  const handleProfilePress = () => {
    (navigation as any).navigate('ForeignProfile', { foreign_profile_id: request.id_profiles });
  };

  return (
    <Box style={[styles.container, { backgroundColor: c.background.tertiary, borderColor: c.border.light }]}>
      <RNPressable onPress={handleProfilePress}>
        <Box style={styles.profileSection}>
          <HStack style={styles.profileRow}>
            <Avatar size="md">
              {request.avatar_url ? (
                <AvatarImage source={{ uri: request.avatar_url }} alt={request.display_name} />
              ) : (
                <AvatarFallbackText>{(request.display_name || 'U')?.charAt(0).toUpperCase()}</AvatarFallbackText>
              )}
            </Avatar>

            <View style={styles.profileContent}>
              <Text style={[styles.displayName, { color: c.text.primary }]}>
                {request.display_name ?? 'No name'}
              </Text>
              <Text style={[styles.username, { color: c.text.secondary }]}>
                @{request.username ?? 'unknown'}
              </Text>
            </View>
          </HStack>
        </Box>
      </RNPressable>

      <HStack style={styles.actionRow}>
        <Pressable
          onPress={() => onDecline(request.id_friend, request.profiles_id_profiles)}
          style={[styles.btn, styles.declineBtn, { borderColor: c.border.medium, backgroundColor: c.background.card }]}
        >
          <Text style={[styles.btnText, { color: c.text.secondary }]}>Decline</Text>
        </Pressable>
        <Pressable
          onPress={() => onAccept(request.id_friend, request.profiles_id_profiles)}
          style={[styles.btn, styles.acceptBtn, { backgroundColor: c.primary.main }]}
        >
          <Text style={[styles.btnText, { color: c.text.inverse }]}>Accept</Text>
        </Pressable>
      </HStack>
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  profileSection: {
    padding: 12,
  },
  profileRow: {
    alignItems: 'center',
    gap: 12,
  },
  profileContent: {
    flex: 1,
  },
  displayName: {
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  username: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  actionRow: {
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  btn: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  declineBtn: {
    borderWidth: 1,
  },
  acceptBtn: {
    borderWidth: 0,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
