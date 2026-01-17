// ProfileCreateScreen.tsx
import React, { useEffect, useState } from 'react';
import { ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { createProfile } from '../api/profile'; // updated helper below
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Input, InputField } from '@/components/ui/input';
import { Button, ButtonText } from '@/components/ui/button';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectTrigger, SelectInput, SelectIcon, SelectPortal, SelectBackdrop, SelectContent, SelectItem} from "@/components/ui/select";
import { ChevronDownIcon } from '@/components/ui/icon';
import { getProfileReferences } from '../api/references';

// image picker
import { launchImageLibrary, ImageLibraryOptions } from 'react-native-image-picker';

interface ProfileForm {
  display_name?: string;
  username?: string;
  location?: string;
  bio?: string;
  id_weight_class?: number | null;
  id_boxing_style?: number | null;
  avatar?: string | null; // will hold preview uri
}

type Props = NativeStackScreenProps<RootStackParamList, 'CreateProfile'>;

export default function ProfileCreateScreen({ navigation }: Props) {
  const [form, setForm] = useState<ProfileForm>({});
  const [loading, setLoading] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBoxingStyle, setSelectedBoxingStyle] = useState<number | null>(null);
  const [selectedWeightClass, setSelectedWeightClass] = useState<number | null>(null);
  const [boxingStyles, setBoxingStyles] = useState<any[]>([]);
  const [weightClasses, setWeightClasses] = useState<any[]>([]);

  // local file object for upload
  const [avatarFile, setAvatarFile] = useState<null | {
    uri: string;
    fileName?: string;
    type?: string;
  }>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setLoadingRefs(true);
      try {
        // If profile exists (rare while creating) redirect to Main
        // (getUserProfile left out for brevity — add back if needed)
        // const data = await getUserProfile();
        // if (mounted && data?.profile) navigation.replace('Main');
      } catch (err) {
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
    return () => { mounted = false; };
  }, []);

  const pickImage = async () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 0.8,
      includeBase64: false,
    };

    const result = await launchImageLibrary(options);

    if (result.didCancel) return;
    if (result.errorCode) {
      Alert.alert('Image picker error', result.errorMessage || 'Unknown error');
      return;
    }

    const asset = result.assets && result.assets[0];
    if (!asset || !asset.uri) return;

    // On iOS the uri is fine; Android sometimes gives content://
    const uri = asset.uri;
    setForm(prev => ({ ...prev, avatar: uri }));
    setAvatarFile({
      uri,
      fileName: asset.fileName,
      type: asset.type,
    });
  };

  const handleCreate = async () => {
    setSaving(true);
    setError(null);

    try {
      // If user picked an image file, send multipart/form-data
      if (avatarFile) {
        const fd = new FormData();

        // append string fields
        if (form.display_name) fd.append('display_name', form.display_name);
        if (form.username) fd.append('username', form.username);
        if (form.location) fd.append('location', form.location);
        if (form.bio) fd.append('bio', form.bio);
        if (form.id_weight_class != null) fd.append('id_weight_class', String(form.id_weight_class));
        if (form.id_boxing_style != null) fd.append('id_boxing_style', String(form.id_boxing_style));

        // The file object for RN: { uri, name, type }
        // Ensure the filename exists
        const name = avatarFile.fileName ?? `avatar.${avatarFile.type?.split('/')[1] ?? 'jpg'}`;

        // On Android keep uri as-is; in some server setups you might need to remove file:// prefix.
        fd.append('avatar', {
          uri: Platform.OS === 'ios' ? avatarFile.uri : avatarFile.uri,
          name,
          type: avatarFile.type ?? 'image/jpeg',
        } as any);

        // createProfile helper will detect FormData vs JSON
        await createProfile(fd);
      } else {
        // No file chosen — send JSON (avatar may be string or null)
        await createProfile(form);
      }

      Alert.alert('Success', 'Profile created successfully');
      navigation.replace('Main');
    } catch (err: any) {
      console.error('Create profile failed', err);
      setError(err?.message ?? 'Failed to create profile');
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
          <HStack className="justify-center mb-4">
            <Avatar className="bg-indigo-600" size="xl">
              <AvatarFallbackText className="text-white">?</AvatarFallbackText>
              {/* AvatarImage will accept both remote (https) and local file URIs */}
              <AvatarImage source={{ uri: form.avatar || undefined }} />
            </Avatar>
          </HStack>

          <HStack className="justify-center gap-2">
            <Button onPress={pickImage} disabled={saving}>
              <ButtonText>Choose Photo</ButtonText>
            </Button>

            {/* optional: clear photo */}
            <Button onPress={() => { setForm({ ...form, avatar: undefined }); setAvatarFile(null); }} variant="outline">
              <ButtonText>Remove</ButtonText>
            </Button>
          </HStack>

          {error && (
            <Box className="bg-red-100 p-3 rounded">
              <Text className="text-red-600">{error}</Text>
            </Box>
          )}

          <VStack className="gap-3">
            <VStack className="gap-1">
              <Text className="font-semibold text-gray-700">Display Name</Text>
              <Input className="border border-gray-300 rounded px-3 py-2">
                <InputField
                  placeholder="Display name"
                  value={form.display_name ?? ''}
                  onChangeText={(text) => setForm({ ...form, display_name: text })}
                />
              </Input>
            </VStack>

            <VStack className="gap-1">
              <Text className="font-semibold text-gray-700">Username</Text>
              <Input className="border border-gray-300 rounded px-3 py-2">
                <InputField
                  placeholder="Username"
                  value={form.username ?? ''}
                  onChangeText={(text) => setForm({ ...form, username: text })}
                />
              </Input>
            </VStack>

            <VStack className="gap-1">
              <Text className="font-semibold text-gray-700">Location</Text>
              <Input className="border border-gray-300 rounded px-3 py-2">
                <InputField
                  placeholder="Location"
                  value={form.location ?? ''}
                  onChangeText={(text) => setForm({ ...form, location: text })}
                />
              </Input>
            </VStack>

            <Text className="font-semibold text-gray-700">Weight Class</Text>
            <Select selectedValue={selectedWeightClass ? String(selectedWeightClass) : ''} onValueChange={(value) => { setSelectedWeightClass(value ? Number(value) : null); setForm({...form, id_weight_class: value ? Number(value) : null}); }}>
              <SelectTrigger>
                <SelectInput placeholder="-- select weight class --" />
                <SelectIcon>
                  <ChevronDownIcon />
                </SelectIcon>
              </SelectTrigger>

              <SelectPortal>
                <SelectBackdrop />
                <SelectContent>
                  <SelectItem label="None" value="" />
                  {weightClasses.map((wc) => (
                    <SelectItem key={wc.id_weight_class} label={wc.title_weight} value={String(wc.id_weight_class)} />
                  ))}
                </SelectContent>
              </SelectPortal>
            </Select>

            <Text className="font-semibold text-gray-700">Boxing Style</Text>
            <Select selectedValue={selectedBoxingStyle ? String(selectedBoxingStyle) : ''} onValueChange={(value) => { setSelectedBoxingStyle(value ? Number(value) : null); setForm({...form, id_boxing_style: value ? Number(value) : null}); }}>
              <SelectTrigger>
                <SelectInput placeholder="-- select boxing style --" />
                <SelectIcon>
                  <ChevronDownIcon />
                </SelectIcon>
              </SelectTrigger>

              <SelectPortal>
                <SelectBackdrop />
                <SelectContent>
                  <SelectItem label="None" value="" />
                  {boxingStyles.map((bs) => (
                    <SelectItem key={bs.id_boxing_style} label={bs.title_style} value={String(bs.id_boxing_style)} />
                  ))}
                </SelectContent>
              </SelectPortal>
            </Select>

            <VStack className="gap-1">
              <Text className="font-semibold text-gray-700">Bio</Text>
              <Input className="border border-gray-300 rounded px-3 py-2 h-32">
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
            onPress={handleCreate}
            disabled={saving}
            className="bg-white-100 mt-6"
            variant="outline"
          >
            <ButtonText>{saving ? 'Creating...' : 'Create Profile'}</ButtonText>
          </Button>
        </VStack>
      </ScrollView>
    </Box>
  );
}
