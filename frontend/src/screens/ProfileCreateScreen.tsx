import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
  Modal,
  FlatList,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';

import { RootStackParamList } from '../navigation/AppNavigator';
import { createProfile } from '../api/profile';
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

interface ProfileForm {
  display_name?: string;
  username?: string;
  location?: string;
  bio?: string;
  id_weight_class?: number | null;
  id_boxing_style?: number | null;
  avatar?: string | null; // preview URI
}

type Props = NativeStackScreenProps<RootStackParamList, 'CreateProfile'>;

export default function ProfileCreateScreen({ navigation }: Props) {
  const [form, setForm] = useState<ProfileForm>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [weightClasses, setWeightClasses] = useState<any[]>([]);
  const [boxingStyles, setBoxingStyles] = useState<any[]>([]);

  const [selectedWeightClassTitle, setSelectedWeightClassTitle] = useState<string | null>(null);
  const [selectedBoxingStyleTitle, setSelectedBoxingStyleTitle] = useState<string | null>(null);
  const [weightDropdownOpen, setWeightDropdownOpen] = useState(false);
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);

  const [avatarFile, setAvatarFile] = useState<null | {
    uri: string;
    name: string;
    type: string;
  }>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const refs = await getProfileReferences();
        if (!mounted) return;
        setWeightClasses(refs.weight_classes || []);
        setBoxingStyles(refs.boxing_styles || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const pickImage = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission required',
        'We need access to your photos to set an avatar.'
      );
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

    setForm((prev) => ({
      ...prev,
      avatar: asset.uri,
    }));

    setAvatarFile({
      uri: asset.uri,
      name: 'avatar.jpg',
      type: asset.mimeType ?? 'image/jpeg',
    });
  };

  const handleCreate = async () => {
    setSaving(true);
    setError(null);

    try {
      const fd = new FormData();

      if (form.display_name) fd.append('display_name', form.display_name);
      if (form.username) fd.append('username', form.username);
      if (form.location) fd.append('location', form.location);
      if (form.bio) fd.append('bio', form.bio);
      if (form.id_weight_class != null)
        fd.append('id_weight_class', String(form.id_weight_class));
      if (form.id_boxing_style != null)
        fd.append('id_boxing_style', String(form.id_boxing_style));

      if (avatarFile) {
        // React Native FormData expects a file object with uri, name, and type
        fd.append('avatar', {
          uri: avatarFile.uri,
          name: avatarFile.name,
          type: avatarFile.type,
        } as any);
      }

      await createProfile(fd);

      Alert.alert('Success', 'Profile created successfully');
      navigation.replace('Main');
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Failed to create profile');
    } finally {
      setSaving(false);
    }
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
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <VStack className="p-5 gap-4">
          {/* Avatar Picker */}
          <HStack className="justify-center">
            <Pressable onPress={pickImage}>
              <Avatar size="xl" className="bg-indigo-600">
                <AvatarFallbackText className="text-white text-xl">
                  +
                </AvatarFallbackText>
                <AvatarImage source={{ uri: form.avatar || undefined }} />
              </Avatar>
            </Pressable>
          </HStack>

          <Text className="text-center text-gray-500 text-sm">
            Tap to change photo
          </Text>

          {error && (
            <Box className="bg-red-100 p-3 rounded">
              <Text className="text-red-600">{error}</Text>
            </Box>
          )}

          <VStack className="gap-3">
            <Input>
              <InputField
                placeholder="Display name"
                value={form.display_name ?? ''}
                onChangeText={(t) =>
                  setForm({ ...form, display_name: t })
                }
              />
            </Input>

            <Input>
              <InputField
                placeholder="Username"
                value={form.username ?? ''}
                onChangeText={(t) =>
                  setForm({ ...form, username: t })
                }
              />
            </Input>

            <Input>
              <InputField
                placeholder="Location"
                value={form.location ?? ''}
                onChangeText={(t) =>
                  setForm({ ...form, location: t })
                }
              />
            </Input>

            <VStack className="gap-1">
              <Text className="font-semibold text-gray-700">Weight Class</Text>
              <Pressable
                className="border border-gray-300 rounded px-4 py-2.5 flex-row items-center justify-between active:bg-gray-50"
                onPress={() => setWeightDropdownOpen(true)}
              >
                <Text className="text-gray-700">{selectedWeightClassTitle || 'Weight class'}</Text>
              </Pressable>

              <Modal
                visible={weightDropdownOpen}
                transparent
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
                          className="px-4 py-3 border-b border-gray-100 active:bg-gray-50"
                          onPress={() => {
                            setSelectedWeightClassTitle(item.title_weight);
                            setForm({
                              ...form,
                              id_weight_class: item.id_weight_class,
                            });
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

            <VStack className="gap-1">
              <Text className="font-semibold text-gray-700">Boxing Style</Text>
              <Pressable
                className="border border-gray-300 rounded px-4 py-2.5 flex-row items-center justify-between active:bg-gray-50"
                onPress={() => setStyleDropdownOpen(true)}
              >
                <Text className="text-gray-700">{selectedBoxingStyleTitle || 'Boxing style'}</Text>
              </Pressable>

              <Modal
                visible={styleDropdownOpen}
                transparent
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
                          className="px-4 py-3 border-b border-gray-100 active:bg-gray-50"
                          onPress={() => {
                            setSelectedBoxingStyleTitle(item.title_style);
                            setForm({
                              ...form,
                              id_boxing_style: item.id_boxing_style,
                            });
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

            <Input className="h-32">
              <InputField
                placeholder="Bio"
                multiline
                numberOfLines={4}
                value={form.bio ?? ''}
                onChangeText={(t) => setForm({ ...form, bio: t })}
              />
            </Input>
          </VStack>

          <Button
            onPress={handleCreate}
            disabled={saving}
            variant="outline"
            className="mt-6"
          >
            <ButtonText>
              {saving ? 'Creating...' : 'Create Profile'}
            </ButtonText>
          </Button>
        </VStack>
      </ScrollView>
    </Box>
  );
}
