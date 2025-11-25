import React, { useEffect, useState } from 'react';
import { ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { getUserProfile } from '../api/profileInfo';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { Image } from '@/components/ui/image';
import { Avatar, AvatarBadge, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';

type Profile = {
  display_name?: string;
  username?: string;
  location?: string;
  bio?: string;
  weight_class_id?: number | null;
  boxing_style_id?: number | null;
  img_path?: string | null;
  title_weight?: string | null;
  title_style?: string | null;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getUserProfile();
        console.log('Profile data:', data);
        const p = data?.profile ?? data;
        if (mounted) setProfile(p);
      } catch (err: any) {
        if (mounted) setError(err?.message ?? 'Failed to load profile');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <Box className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="flex-1 justify-center items-center bg-white p-5">
        <Text className="text-red-600 text-center">{error}</Text>
      </Box>
    );
  }

  return (
    <Box className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile Header Section */}
        <VStack className="items-center p-5 gap-4">
            <HStack className="justify-start items-center">
            {/* Avatar */}
            <Avatar className="bg-indigo-600" size="xl">
              <AvatarFallbackText className="text-white">{profile?.display_name ?? '?'}</AvatarFallbackText>
              <AvatarImage
              source={{
                uri: profile?.img_path || undefined
              }}
            />
            </Avatar>
            <VStack className="items-center">
              {/* Display Name */}
              <Text className="text-2xl font-bold text-center">
                {profile?.display_name ?? 'Nickname'}
              </Text>

              {/* Username */}
              <Text className="text-gray-600 text-center">
                @{profile?.username ?? 'username'}
              </Text>

              {/* Location */}
              <Text className="text-gray-500 text-center">
                {profile?.location ?? 'Affiliated Club'}
              </Text>
            </VStack>
          </HStack>

          {/* Info Block */}
          <VStack className="w-full gap-2 mt-2">
            <Text className="text-sm text-gray-700">
              <Text className="font-bold">Bio: </Text>
              {profile?.bio ?? 'No bio provided.'}
            </Text>
            <Text className="text-sm text-gray-700">
              <Text className="font-bold">Weightclass: </Text>
              {profile?.title_weight ?? '—'}
            </Text>
            <Text className="text-sm text-gray-700">
              <Text className="font-bold">Boxing style: </Text>
              {profile?.title_style ?? '—'}
            </Text>
          </VStack>

          {/* Edit Button */}
          <Button
            variant="outline"
            className="mt-4 border border-gray-400 rounded px-6 py-2"
          >
            <ButtonText className="text-gray-800 font-semibold">
              Edit profile
            </ButtonText>
          </Button>
        </VStack>

        {/* Tabs Section */}
        <HStack className="justify-around items-center py-3 border-t border-gray-200">
          <Pressable>
            <Ionicons name="person-outline" size={26} color="#000" />
          </Pressable>
          <Pressable className="border-b-2 border-black pb-1">
            <MaterialCommunityIcons name="grid" size={26} color="#000" />
          </Pressable>
          <Pressable>
            <Feather name="calendar" size={26} color="#000" />
          </Pressable>
        </HStack>

        {/* Image Grid */}
        <Box className="flex-row flex-wrap gap-2 justify-between px-2.5 py-4">
          {[...Array(6)].map((_, index) => (
            <Box
              key={index}
              className="w-1/3 aspect-square bg-gray-200 rounded justify-center items-center"
            >
              <Feather name="image" size={36} color="#aaa" />
            </Box>
          ))}
        </Box>
      </ScrollView>
    </Box>
  );
}

