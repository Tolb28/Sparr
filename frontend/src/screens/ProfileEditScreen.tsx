import React, { useEffect, useState } from 'react';
import { ScrollView, ActivityIndicator, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

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
import {
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { ChevronDownIcon } from '@/components/ui/icon';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

interface ProfileForm {
  display_name?: string;
  username?: string;
  location?: string;
  bio?: string;
  weight_class_id?: number | null;
  boxing_style_id?: number | null;
  avatar?: string | null;
}

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
          setForm(p);
          setSelectedBoxingStyle(p.id_boxing_style || null);
          setSelectedWeightClass(p.id_weight_class || null);
          setSelectedBoxingStyleTitle(p.title_style || null);
          setSelectedWeightClassTitle(p.title_weight || null);

          console.log('Selected boxing style:', p.id_boxing_style);
          console.log('Selected weight class:', p.id_weight_class);
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
        console.log('Profile references:', refs);

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

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      console.log('Saving profile with data:', form);
      await updateProfile(form);
      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Profile',
      'Are you sure? This action cannot be undone.',
      [
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
      ]
    );
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
          <HStack className="justify-center mb-4">
            <Avatar className="bg-indigo-600" size="xl">
              <AvatarFallbackText className="text-white">
                {profile?.display_name ?? '?'}
              </AvatarFallbackText>
              <AvatarImage source={{ uri: profile?.avatar || undefined }} />
            </Avatar>
          </HStack>

          {error && (
            <Box className="bg-red-100 p-3 rounded">
              <Text className="text-red-600">{error}</Text>
            </Box>
          )}

          <VStack className="gap-3">
            <VStack className="gap-1">
              <Text className="font-semibold text-gray-700">Display Name</Text>
              <Input>
                <InputField
                  placeholder="Display name"
                  value={form.display_name ?? ''}
                  onChangeText={(text) =>
                    setForm({ ...form, display_name: text })
                  }
                />
              </Input>
            </VStack>

            <VStack className="gap-1">
              <Text className="font-semibold text-gray-700">Username</Text>
              <Input>
                <InputField
                  placeholder="Username"
                  value={form.username ?? ''}
                  onChangeText={(text) =>
                    setForm({ ...form, username: text })
                  }
                />
              </Input>
            </VStack>

            <VStack className="gap-1">
              <Text className="font-semibold text-gray-700">Location</Text>
              <Input>
                <InputField
                  placeholder="Location"
                  value={form.location ?? ''}
                  onChangeText={(text) =>
                    setForm({ ...form, location: text })
                  }
                />
              </Input>
            </VStack>

            <Text className="font-semibold text-gray-700">Weight Class</Text>
            <Select
              selectedValue={
                selectedWeightClassTitle ? String(selectedWeightClassTitle) : ''
              }
              onValueChange={(value) => {
                setForm({
                  ...form,
                  weight_class_id: value ? Number(value) : null,
                });
                console.log('Weight class changed to:', value);
                setSelectedWeightClassTitle(value ? value : null);
                setSelectedWeightClass(value ? Number(value) : null);
              }}
            >
              <SelectTrigger>
                <SelectInput placeholder="-- select weight class --" />
                <SelectIcon>
                  <ChevronDownIcon />
                </SelectIcon>
              </SelectTrigger>

              <SelectPortal>
                <SelectBackdrop />
                <SelectContent>
                  <SelectItem label="None" value="" key="none" />
                  {weightClasses.map((wc) => (
                    <SelectItem
                      key={wc.id_weight_class}
                      label={wc.title_weight}
                      value={String(wc.id_weight_class)}
                    />
                  ))}
                </SelectContent>
              </SelectPortal>
            </Select>

            <Text className="font-semibold text-gray-700">Boxing Style</Text>
            <Select
              selectedValue={
                selectedBoxingStyleTitle ? String(selectedBoxingStyleTitle) : ''
              }
              onValueChange={(value) => {
                setForm({
                  ...form,
                  boxing_style_id: value ? Number(value) : null,
                });
                console.log('Boxing style changed to:', value);
                setSelectedBoxingStyleTitle(value ? value : null);
                setSelectedBoxingStyle(value ? Number(value) : null);
              }}
            >
              <SelectTrigger>
                <SelectInput placeholder="-- select boxing style --" />
                <SelectIcon>
                  <ChevronDownIcon />
                </SelectIcon>
              </SelectTrigger>

              <SelectPortal>
                <SelectBackdrop />
                <SelectContent>
                  <SelectItem label="None" value="" key="none" />
                  {boxingStyles.map((bs) => (
                    <SelectItem
                      key={bs.id_boxing_style}
                      label={bs.title_style}
                      value={String(bs.id_boxing_style)}
                    />
                  ))}
                </SelectContent>
              </SelectPortal>
            </Select>

            <VStack className="gap-1">
              <Text className="font-semibold text-gray-700">Bio</Text>
              <Input className="h-32">
                <InputField
                  placeholder="Bio"
                  value={form.bio ?? ''}
                  onChangeText={(text) =>
                    setForm({ ...form, bio: text })
                  }
                  multiline
                  numberOfLines={4}
                />
              </Input>
            </VStack>

            <VStack className="gap-1">
              <Text className="font-semibold text-gray-700">Image URL</Text>
              <Input>
                <InputField
                  placeholder="Image URL"
                  value={form.avatar ?? ''}
                  onChangeText={(text) =>
                    setForm({ ...form, avatar: text })
                  }
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
            <ButtonText>
              {saving ? 'Saving...' : 'Save Changes'}
            </ButtonText>
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
