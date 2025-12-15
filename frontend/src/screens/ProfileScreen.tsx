import React, { useEffect, useState } from 'react';
import { ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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

type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('personalized');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getUserProfile();
        const p = data?.profile ?? data;
        if (mounted) setProfile(p);
      } catch (err : any) {
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
    <Grid className="gap-1 items-center" _extra={{ className: 'grid-cols-3' }}>
      {[...Array(12)].map((_, index) => (
        <Box
          key={index}
          className="aspect-square bg-gray-200 rounded justify-center items-center"
        >
          <Image size="xl" />
        </Box>
      ))}
    </Grid>
  );

  return (
    <Box className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile Header */}
        <VStack className=" p-5 gap-4">
          <HStack className="justify-start items-center gap-4">
            <Avatar className="bg-indigo-600" size="xl">
              <AvatarFallbackText className="text-white">{profile?.display_name ?? '?'}</AvatarFallbackText>
              <AvatarImage source={{ uri: profile?.img_path || undefined }} />
            </Avatar>

            <VStack className="items-start">
              <Text className="text-2xl font-bold">{profile?.display_name ?? 'Nickname'}</Text>
              <Text className="text-gray-600">@{profile?.username ?? 'username'}</Text>
              <Text className="text-gray-500">{profile?.location ?? 'Affiliated Club'}</Text>
            </VStack>
          </HStack>

          <VStack className="w-full gap-2 mt-2">
            <Text className="text-sm text-gray-700"><Text className="font-bold">Bio: </Text>{profile?.bio ?? 'No bio provided.'}</Text>
            <Text className="text-sm text-gray-700"><Text className="font-bold">Weightclass: </Text>{profile?.title_weight ?? '—'}</Text>
            <Text className="text-sm text-gray-700"><Text className="font-bold">Boxing style: </Text>{profile?.title_style ?? '—'}</Text>
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
    </Box>
  );
}
