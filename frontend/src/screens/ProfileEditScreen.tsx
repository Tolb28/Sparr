import React, { useEffect, useState } from 'react';
import { ScrollView, ActivityIndicator, Alert, Pressable, Modal, FlatList } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';

import { RootStackParamList } from '../navigation/AppNavigator';
import { getUserProfile, updateProfile, deleteProfile } from '../api/profile';
import { getProfileReferences } from '../api/references';

import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Input, InputField } from '@/components/ui/input';
import { Button, ButtonText } from '@/components/ui/button';
import {
  Avatar,
  AvatarFallbackText,
  AvatarImage,
} from '@/components/ui/avatar';
import { ChevronDownIcon } from '@/components/ui/icon';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

// ... (Your existing interfaces remain unchanged)
interface ProfileForm {
  display_name?: string;
  username?: string;
  location?: string;
  bio?: string;
  weight_class_id?: number | null;
  boxing_style_id?: number | null;
  avatar?: string | null;
  avatar_url?: string | null;
}

type Profile = {
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

export default function EditProfileScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<ProfileForm>({});
  const [loading, setLoading] = useState(true);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedBoxingStyle, setSelectedBoxingStyle] = useState<number | null>(null);
  const [selectedWeightClass, setSelectedWeightClass] = useState<number | null>(null);
  const [selectedBoxingStyleTitle, setSelectedBoxingStyleTitle] = useState<string | null>(null);
  const [selectedWeightClassTitle, setSelectedWeightClassTitle] = useState<string | null>(null);

  const [boxingStyles, setBoxingStyles] = useState<any[]>([]);
  const [weightClasses, setWeightClasses] = useState<any[]>([]);

  const [weightDropdownOpen, setWeightDropdownOpen] = useState(false);
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);

  const [avatarFile, setAvatarFile] = useState<null | {
    uri: string;
    name: string;
    type: string;
  }>(null);
  
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // ... (Your useEffect and pickImage logic remain unchanged)
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setLoadingRefs(true);

      try {
        const data = await getUserProfile();
        const p = data?.profile ?? data;

        console.log('Loaded profile for editing:', p);

        if (mounted) {
          setProfile(p);
          const { avatar, avatar_url, ...formData } = p;
          setForm(formData);
          
          setSelectedBoxingStyle(p.id_boxing_style || null);
          setSelectedWeightClass(p.id_weight_class || null);
          
          // Ensure we handle cases where title might be undefined if coming from raw ID
          setSelectedBoxingStyleTitle(p.title_style || '');
          setSelectedWeightClassTitle(p.title_weight || '');
          
          if (p.avatar_url) {
            setAvatarPreview(p.avatar_url);
          }
          setAvatarFile(null);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message ?? 'Failed to load profile');
        }
      } finally {
        if (mounted) setLoading(false);
      }

      try {
        const refs = await getProfileReferences();
        if (mounted) {
          setWeightClasses(refs.weight_classes || []);
          setBoxingStyles(refs.boxing_styles || []);
        }
      } catch (err) {
        console.error('Failed to load profile references', err);
      } finally {
        if (mounted) setLoadingRefs(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'We need access to your photos to update your avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setAvatarPreview(asset.uri);
    setAvatarFile({
      uri: asset.uri,
      name: 'avatar.jpg',
      type: asset.mimeType ?? 'image/jpeg',
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (avatarFile) {
        const fd = new FormData();
        if (form.display_name) fd.append('display_name', form.display_name);
        if (form.username) fd.append('username', form.username);
        if (form.location) fd.append('location', form.location);
        if (form.bio) fd.append('bio', form.bio);
        if (form.weight_class_id != null) fd.append('weight_class_id', String(form.weight_class_id));
        if (form.boxing_style_id != null) fd.append('boxing_style_id', String(form.boxing_style_id));
        fd.append('avatar', {
          uri: avatarFile.uri,
          name: avatarFile.name,
          type: avatarFile.type,
        } as any);
        await updateProfile(fd);
      } else {
        await updateProfile(form);
      }
      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Profile', 'Are you sure? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          setError(null);
          try {
            await deleteProfile();
            Alert.alert('Success', 'Profile deleted');
            navigation.replace('Login');
          } catch (err: any) {
            setError(err?.message ?? 'Failed to delete profile');
            setSaving(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <Box className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" />
      </Box>
    );
  }

  return (
    <Box className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} className="pt-10">
        <VStack className="p-5 gap-4">
          <HStack className="justify-center mb-4">
            <Pressable onPress={pickImage}>
              <Avatar className="bg-indigo-600" size="xl">
                <AvatarFallbackText className="text-white">
                  {profile?.display_name ?? '?'}
                </AvatarFallbackText>
                <AvatarImage source={{ uri: avatarPreview || undefined }} />
              </Avatar>
            </Pressable>
          </HStack>
          <Text className="text-center text-gray-500 text-sm">Tap to change photo</Text>

          {error && (
            <Box className="bg-red-100 p-3 rounded">
              <Text className="text-red-600">{error}</Text>
            </Box>
          )}

          <VStack className="gap-3">
             {/* ... (Display Name, Username, Location Inputs remain unchanged) */}
             <VStack className="gap-1">
              <Text className="font-semibold text-gray-700">Display Name</Text>
              <Input>
                <InputField
                  placeholder="Display name"
                  value={form.display_name ?? ''}
                  onChangeText={(text) => setForm({ ...form, display_name: text })}
                />
              </Input>
            </VStack>

            <VStack className="gap-1">
              <Text className="font-semibold text-gray-700">Username</Text>
              <Input>
                <InputField
                  placeholder="Username"
                  value={form.username ?? ''}
                  onChangeText={(text) => setForm({ ...form, username: text })}
                />
              </Input>
            </VStack>

            <VStack className="gap-1">
              <Text className="font-semibold text-gray-700">Location</Text>
              <Input>
                <InputField
                  placeholder="Location"
                  value={form.location ?? ''}
                  onChangeText={(text) => setForm({ ...form, location: text })}
                />
              </Input>
            </VStack>

            {/* --- FIX 1: Weight Class Modal --- */}
            <VStack className="gap-1">
              <Text className="font-semibold text-gray-700">Weight Class</Text>
              <Pressable
                className="border border-gray-300 rounded px-4 py-2.5 flex-row items-center justify-between active:bg-gray-50"
                onPress={() => setWeightDropdownOpen(true)}
              >
                <Text className="text-gray-700">{selectedWeightClassTitle || '-- select weight class --'}</Text>
              </Pressable>

              <Modal
                visible={weightDropdownOpen}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setWeightDropdownOpen(false)}
              >
                <Pressable
                  className="flex-1"
                  onPress={() => setWeightDropdownOpen(false)}
                >
                  <VStack className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-96 overflow-hidden">
                    <VStack className="p-4 border-b border-gray-200">
                      <Text className="text-lg font-semibold text-gray-900">Select Weight Class</Text>
                    </VStack>
                    <FlatList
                      data={[{ id_weight_class: null, title_weight: 'None' }, ...weightClasses]}
                      keyExtractor={(item) => String(item.id_weight_class)}
                      scrollEnabled={true}
                      renderItem={({ item }) => (
                        <Pressable
                          className="px-4 py-4 border-b border-gray-100 active:bg-gray-50"
                          onPress={() => {
                            setSelectedWeightClassTitle(item.title_weight);
                            setSelectedWeightClass(item.id_weight_class);
                            setForm({ ...form, weight_class_id: item.id_weight_class });
                            setWeightDropdownOpen(false);
                          }}
                        >
                          <Text className="text-gray-900">{item.title_weight}</Text>
                        </Pressable>
                      )}
                    />
                  </VStack>
                </Pressable>
              </Modal>
            </VStack>

            {/* --- FIX 2: Boxing Style Modal --- */}
            <VStack className="gap-1">
              <Text className="font-semibold text-gray-700">Boxing Style</Text>
              <Pressable
                className="border border-gray-300 rounded px-4 py-2.5 flex-row items-center justify-between active:bg-gray-50"
                onPress={() => setStyleDropdownOpen(true)}
              >
                <Text className="text-gray-700">{selectedBoxingStyleTitle || '-- select boxing style --'}</Text>
              </Pressable>

              <Modal
                visible={styleDropdownOpen}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setStyleDropdownOpen(false)}
              >
                <Pressable
                  className="flex-1"
                  onPress={() => setStyleDropdownOpen(false)}
                >
                  <VStack className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-96 overflow-hidden">
                    <VStack className="p-4 border-b border-gray-200">
                      <Text className="text-lg font-semibold text-gray-900">Select Boxing Style</Text>
                    </VStack>
                    <FlatList
                      data={[{ id_boxing_style: null, title_style: 'None' }, ...boxingStyles]}
                      keyExtractor={(item) => String(item.id_boxing_style)}
                      scrollEnabled={true}
                      renderItem={({ item }) => (
                        <Pressable
                          className="px-4 py-4 border-b border-gray-100 active:bg-gray-50"
                          onPress={() => {
                            setSelectedBoxingStyleTitle(item.title_style);
                            setSelectedBoxingStyle(item.id_boxing_style);
                            setForm({ ...form, boxing_style_id: item.id_boxing_style });
                            setStyleDropdownOpen(false);
                          }}
                        >
                          <Text className="text-gray-900">{item.title_style}</Text>
                        </Pressable>
                      )}
                    />
                  </VStack>
                </Pressable>
              </Modal>
            </VStack>

            <VStack className="gap-1">
              <Text className="font-semibold text-gray-700">Bio</Text>
              <Input className="h-32">
                <InputField
                  placeholder="Bio"
                  value={form.bio ?? ''}
                  onChangeText={(text) => setForm({ ...form, bio: text })}
                  multiline
                  numberOfLines={4}
                />
              </Input>
            </VStack>
          </VStack>

          <Button
            onPress={handleSave}
            disabled={saving}
            className="mt-6"
            variant="outline"
          >
            <ButtonText>{saving ? 'Saving...' : 'Save Changes'}</ButtonText>
          </Button>

          <Button
            onPress={handleDelete}
            disabled={saving}
            variant="outline"
          >
            <ButtonText>Delete Profile</ButtonText>
          </Button>
        </VStack>
      </ScrollView>
    </Box>
  );
}