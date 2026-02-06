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
import { colors, theme } from '../theme';

type Profile = { 
  id_profiles?: number;
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
      <Box className="flex-1 justify-center items-center" style={{ backgroundColor: colors.background.primary }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="flex-1 justify-center items-center p-5" style={{ backgroundColor: colors.background.primary }}>
        <Text className="text-center" style={{ color: colors.error.main }}>{error}</Text>
      </Box>
    );
  }

  const renderPersonalized = () => (
    <VStack className="px-4 py-4 gap-4">
      <Box className="p-5 rounded-xl" style={{ backgroundColor: colors.neutral[200] }}>
        <Text className="font-semibold mb-1" style={{ color: colors.text.primary }}>Training Calendar</Text>
        <Text className="text-sm" style={{ color: colors.text.secondary }}>No training data yet.</Text>
      </Box>

      <Box className="p-5 rounded-xl" style={{ backgroundColor: colors.neutral[200] }}>
        <Text className="font-semibold mb-1" style={{ color: colors.text.primary }}>Favourite Photos</Text>
        <Text className="text-sm" style={{ color: colors.text.secondary }}>No favourites added yet.</Text>
      </Box>
    </VStack>
  );

  const renderPhotos = () => (
    profile?.id_profiles ? <ProfilePosts profileId={profile.id_profiles} refreshTrigger={refreshTrigger} /> : null
  );

  return (
    <Box className="flex-1" style={{ backgroundColor: colors.background.primary }}>
      <ScrollView className='pt-4 pt-10' contentContainerStyle={{ paddingBottom: 100 }} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
      }>
        <Pressable
          className="z-10 p-2 rounded-full shadow self-end mr-4 mb-2 mt-10"
          style={{ backgroundColor: colors.background.primary }}
          onPress={() => {
            removeProfile().then(() => {
              navigation.replace('Login');
            });}}
        >
        
          <Text style={{ color: colors.text.primary }}>Log out</Text>
        </Pressable>
        {/* Profile Header */}
        <VStack className="p-5 gap-4">
          <HStack className="justify-start items-center gap-4">
            <Avatar className="bg-indigo-600" size="xl" key={profile?.avatar_url}>
              <AvatarFallbackText className="text-white">{profile?.display_name ?? '?'}</AvatarFallbackText>
              <AvatarImage source={{ uri: profile?.avatar_url || undefined }} />
            </Avatar>

            <VStack className="items-start">
              <Text className="text-2xl font-bold" style={{ color: colors.text.primary }}>{profile?.display_name ?? 'Nickname'}</Text>
              <Text style={{ color: colors.text.secondary }}>@{profile?.username ?? 'username'}</Text>
              {profile?.location && <Text style={{ color: colors.text.tertiary }}>{profile.location}</Text>}
            </VStack>
          </HStack>

          <VStack className="w-full gap-2 mt-2">
            {profile?.bio && <Text className="text-sm" style={{ color: colors.text.primary }}><Text className="font-bold">Bio: </Text>{profile.bio}</Text>}
            {profile?.title_weight && <Text className="text-sm" style={{ color: colors.text.primary }}><Text className="font-bold">Weightclass: </Text>{profile.title_weight}</Text>}
            {profile?.title_style && <Text className="text-sm" style={{ color: colors.text.primary }}><Text className="font-bold">Boxing style: </Text>{profile.title_style}</Text>}
          </VStack>

          <Button 
            variant="outline" 
            className="mt-4 rounded px-6 py-2"
            style={{ borderColor: colors.border.medium }}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <ButtonText className="font-semibold" style={{ color: colors.text.primary }}>Edit profile</ButtonText>
          </Button>
        </VStack>

        {/* Tabs */}
        <HStack className="justify-around items-center py-3" style={{ borderTopColor: colors.border.light, borderTopWidth: 1 }}>
          <Pressable onPress={() => setActiveTab('personalized')} style={{ borderBottomWidth: activeTab === 'personalized' ? 2 : 0, borderBottomColor: colors.text.primary, paddingBottom: 4 }}>
            <Ionicons name="person-outline" size={26} color={colors.text.primary} />
          </Pressable>

          <Pressable onPress={() => setActiveTab('photos')} style={{ borderBottomWidth: activeTab === 'photos' ? 2 : 0, borderBottomColor: colors.text.primary, paddingBottom: 4 }}>
            <MaterialCommunityIcons name="grid" size={26} color={colors.text.primary} />
          </Pressable>
        </HStack>

        {activeTab === 'personalized' ? renderPersonalized() : renderPhotos()}

      </ScrollView>
    {/* Floating Action Button */}
        <Pressable
          onPress={() => (navigation as any).navigate('CreatePost')}
          className="absolute bottom-5 right-4 w-14 h-14 rounded-full justify-center items-center shadow-lg"
          style={{ backgroundColor: theme.primary }}
        >
          <Ionicons name="add" size={28} color={theme.buttonText} />
        </Pressable>
    </Box>
  );
}
