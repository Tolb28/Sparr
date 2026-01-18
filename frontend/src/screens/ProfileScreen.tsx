import React, { useEffect, useState } from 'react';
import { ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { getUserProfile } from '../api/profile';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { Image } from '@/components/ui/image';
import { Avatar, AvatarBadge, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Grid } from '@/components/ui/grid';
import { removeProfile } from '../api/profileHandler';
import { deleteToken } from '../api/tokenHandler';
import ProfilePosts from '../components/ProfilePosts';

type Profile = { 
  display_name?: string;
  username?: string; 
  location?: string; 
  bio?: string; 
  id_weight_class?: number | null; 
  id_boxing_style?: number | null; 
  avatar?: string | null; 
  title_weight?: string | null; 
  title_style?: string | null; 
  avatar_url?: string | null;
};

type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [activeTab, setActiveTab] = useState('personalized');

  const loadProfile = async () => {
    setLoading(true);
    try {
      console.log('ProfileScreen: Loading fresh profile data...');
      const data = await getUserProfile();
      const p = data?.profile ?? data;
      console.log('ProfileScreen: Received profile:', p);
      setProfile(p);
    } catch (err : any) {
      setError(err?.message ?? 'Failed to load profile');
      await deleteToken();
      await removeProfile();
      navigation.navigate('Login')
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshTrigger(prev => prev + 1);
    setRefreshing(false);
  };

  useEffect(() => {
    console.log('loading profile');
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getUserProfile();
        const p = data?.profile ?? data;
        if (mounted) setProfile(p);
      } catch (err : any) {
        if (mounted) setError(err?.message ?? 'Failed to load profile');
        await deleteToken();
        await removeProfile();
        navigation.navigate('Login')
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Reload profile whenever the screen comes into focus (e.g., after editing)
  useFocusEffect(
    React.useCallback(() => {
      console.log('ProfileScreen: Focus effect triggered, reloading profile');
      loadProfile();
    }, [])
  );

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
      <ScrollView className='pt-4 pt-10' contentContainerStyle={{ paddingBottom: 100 }} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }>
        <Pressable
          className=" z-10 p-2 bg-white rounded-full shadow self-end mr-4 mb-2"
          onPress={() => {
            removeProfile().then(() => {
              navigation.replace('Login');
            });}}
        >
        
          <Text>Log out</Text>
        </Pressable>
        {/* Profile Header */}
        <VStack className=" p-5 gap-4">
          <HStack className="justify-start items-center gap-4">
            <Avatar className="bg-indigo-600" size="xl" key={profile?.avatar_url}>
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

          <Button 
            variant="outline" 
            className="mt-4 border border-gray-400 rounded px-6 py-2"
            onPress={() => navigation.navigate('EditProfile')}
          >
            <ButtonText className="text-gray-800 font-semibold">Edit profile</ButtonText>
          </Button>
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
    {/* Floating Action Button */}
        <Pressable
          onPress={() => (navigation as any).navigate('CreatePost')}
          className="absolute bottom-5 right-4 w-14 h-14 bg-blue-600 rounded-full justify-center items-center shadow-lg"
        >
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
    </Box>
  );
}
