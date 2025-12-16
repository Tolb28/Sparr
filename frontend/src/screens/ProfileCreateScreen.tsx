import React, { useEffect, useState } from 'react';
import { ScrollView, ActivityIndicator, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { createProfile, getUserProfile } from '../api/profile';
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


interface ProfileForm {
  display_name?: string;
  username?: string;
  location?: string;
  bio?: string;
  id_weight_class?: number | null;
  id_boxing_style?: number | null;
  avatar?: string | null;
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
  

  

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setLoadingRefs(true);
      try {
        const data = await getUserProfile();
        // If profile exists (rare while creating) redirect to Main
        if (mounted && data?.profile) {
          navigation.replace('Main');
        }
      } catch (err) {
        // expected case: no profile yet, allow creation
      } finally {
        if (mounted) setLoading(false);
      }
      try {
        const refs = await getProfileReferences();
        console.log('Profile references:', refs);
        if (mounted) {
          setWeightClasses(refs.weight_classes || []);
          setBoxingStyles(refs.boxing_styles || []);
        }}
      catch (err) {
        console.error('Failed to load profile references', err);
      } finally {
        if (mounted) setLoadingRefs(false);
      }

    };
    load();
    return () => { mounted = false; };
  }, []);

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      await createProfile(form);
      Alert.alert('Success', 'Profile created successfully');
      navigation.replace('Main');
    } catch (err: any) {
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
              <AvatarImage source={{ uri: form.avatar || undefined }} />
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
              <Select selectedValue={selectedWeightClass ? String(selectedWeightClass) : ''} onValueChange={(value) => setForm({...form, id_weight_class: value ? Number(value) : null})}>
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
              <Select selectedValue={selectedBoxingStyle ? String(selectedBoxingStyle) : ''} onValueChange={(value) => setForm({...form, id_boxing_style: value ? Number(value) : null})}>
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

            <VStack className="gap-1">
              <Text className="font-semibold text-gray-700">Image URL</Text>
              <Input className="border border-gray-300 rounded px-3 py-2">
                <InputField
                  placeholder="Image URL"
                  value={form.avatar ?? ''}
                  onChangeText={(text) => setForm({ ...form, avatar: text })}
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
