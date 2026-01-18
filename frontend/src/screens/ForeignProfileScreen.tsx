import React, { useEffect, useState } from 'react';
import { ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { getForeignProfile } from '../api/profile';
import { checkFriendStatus, sendFriendRequest, unfriend } from '../api/friends';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { Image } from '@/components/ui/image';
import { Avatar, AvatarBadge, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Grid } from '@/components/ui/grid';
import { RouteProp, useRoute } from '@react-navigation/native';
import ProfilePosts from '../components/ProfilePosts';


type Profile = { 
  id_profiles?: number;
  display_name?: string;
  username?: string; 
  location?: string; 
  bio?: string; 
  id_weight_class?: number | null; 
  id_boxing_style?: number | null; 
  avatar?: string | null;
  avatar_url?: string | null;
  title_weight?: string | null; 
  title_style?: string | null; 
};

type ProfileRouteProp = RouteProp<
  RootStackParamList,
  'ForeignProfile'
>;


type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ForeignProfileScreen(){
  const navigation = useNavigation<RootNavigationProp>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const route = useRoute<ProfileRouteProp>();
  const [friendStatus, setFriendStatus] = useState<'friends' | 'pending_sent' | 'pending_received' | 'none'>('none');
  const [statusLoading, setStatusLoading] = useState(true);

  const { foreign_profile_id } = route.params;

  const [activeTab, setActiveTab] = useState('personalized');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setStatusLoading(true);
      try {
        const data = await getForeignProfile(foreign_profile_id);
        const p = data?.profile ?? data;
        if (mounted) {
          setProfile(p);
          // Check friend status
          const status = await checkFriendStatus(p.id_profiles);
          if (mounted) setFriendStatus(status);
        }
      } catch (err : any) {
        if (mounted) setError(err?.message ?? 'Failed to load profile');
      } finally {
        if (mounted) {
          setLoading(false);
          setStatusLoading(false);
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await getForeignProfile(foreign_profile_id);
      const p = data?.profile ?? data;
      setProfile(p);
      const status = await checkFriendStatus(p.id_profiles);
      setFriendStatus(status);
      setRefreshTrigger(prev => prev + 1);
    } catch (err : any) {
      setError(err?.message ?? 'Failed to load profile');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddFriend = async () => {
    try {
      setStatusLoading(true);
      await sendFriendRequest(profile!.id_profiles!);
      setFriendStatus('pending_sent');
    } catch (err: any) {
      console.error('Failed to send friend request', err);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleUnfriend = async () => {
    try {
      setStatusLoading(true);
      await unfriend(profile!.id_profiles!);
      setFriendStatus('none');
    } catch (err: any) {
      console.error('Failed to unfriend user', err);
    } finally {
      setStatusLoading(false);
    }
  };

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

  const renderPersonalized = () => (
    <VStack className="px-4 py-4 gap-4">
      <Box className="bg-gray-200 p-5 rounded-xl">
        <Text className="font-semibold mb-1">Training Calendar</Text>
        <Text className="text-gray-600 text-sm">No training data yet.</Text>
      </Box>

      <Box className="bg-gray-200 p-5 rounded-xl">
        <Text className="font-semibold mb-1">Favourite Photos</Text>
        <Text className="text-gray-600 text-sm">No favourites added yet.</Text>
      </Box>
    </VStack>
  );

  const renderPhotos = () => (
    profile?.id_profiles ? <ProfilePosts profileId={profile.id_profiles} refreshTrigger={refreshTrigger} /> : null
  );

  return (
    <Box className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }>
        {/* Profile Header */}
        <VStack className=" p-5 gap-4">
          <HStack className="justify-start items-center gap-4">
            <Avatar className="bg-indigo-600" size="xl">
              <AvatarFallbackText className="text-white">{profile?.display_name ?? '?'}</AvatarFallbackText>
              <AvatarImage source={{ uri: profile?.avatar_url || undefined }} />
            </Avatar>

            <VStack className="items-start">
              <Text className="text-2xl font-bold">{profile?.display_name ?? 'Nickname'}</Text>
              <Text className="text-gray-600">@{profile?.username ?? 'username'}</Text>
              {profile?.location && <Text className="text-gray-500">{profile.location}</Text>}
            </VStack>
          </HStack>

          <VStack className="w-full gap-2 mt-2">
            {profile?.bio && <Text className="text-sm text-gray-700"><Text className="font-bold">Bio: </Text>{profile.bio}</Text>}
            {profile?.title_weight && <Text className="text-sm text-gray-700"><Text className="font-bold">Weightclass: </Text>{profile.title_weight}</Text>}
            {profile?.title_style && <Text className="text-sm text-gray-700"><Text className="font-bold">Boxing style: </Text>{profile.title_style}</Text>}
          </VStack>

          {/* Friend Action Button */}
          <HStack className="mt-2 gap-2">
            {statusLoading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : friendStatus === 'friends' ? (
              <Pressable
                onPress={handleUnfriend}
                className="flex-1 bg-red-500 rounded-md py-2 px-4"
              >
                <Text className="text-white text-center font-bold">Unfriend</Text>
              </Pressable>
            ) : friendStatus === 'pending_sent' ? (
              <Box className="flex-1 bg-yellow-500 rounded-md py-2 px-4">
                <Text className="text-white text-center font-bold">Request Pending</Text>
              </Box>
            ) : friendStatus === 'pending_received' ? (
              <Pressable
                onPress={() => (navigation as any).navigate('Main', { screen: 'Friends', params: { activeTab: 'requests' } })}
                className="flex-1 bg-blue-500 rounded-md py-2 px-4"
              >
                <Text className="text-white text-center font-bold">Request Received</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleAddFriend}
                className="flex-1 bg-green-500 rounded-md py-2 px-4"
              >
                <Text className="text-white text-center font-bold">Add Friend</Text>
              </Pressable>
            )}
          </HStack>
        </VStack>

        {/* Tabs */}
        <HStack className="justify-around items-center py-3 border-t border-gray-200">
          <Pressable onPress={() => setActiveTab('personalized')} className={activeTab === 'personalized' ? 'border-b-2 border-black pb-1' : ''}>
            <Ionicons name="person-outline" size={26} />
          </Pressable>

          <Pressable onPress={() => setActiveTab('photos')} className={activeTab === 'photos' ? 'border-b-2 border-black pb-1' : ''}>
            <MaterialCommunityIcons name="grid" size={26} />
          </Pressable>
        </HStack>

        {activeTab === 'personalized' ? renderPersonalized() : renderPhotos()}
      </ScrollView>
    </Box>
  );
}
