import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
  Modal,
  FlatList,
  View,
  TextInput,
  StyleSheet,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';

import { RootStackParamList } from '../navigation/AppNavigator';
import { createProfile } from '../api/profile';
import { getProfileReferences } from '../api/references';

import { Text } from '@/components/ui/text';
import {
  Avatar,
  AvatarFallbackText,
  AvatarImage,
} from '@/components/ui/avatar';
import { GlassCard } from '@/components/ui/glass-card';
import { SparrButton } from '@/components/ui/sparr-button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/src/theme/colors';
import { showSuccessNotification, showErrorNotification } from '@/src/services/notificationService';

interface ProfileForm {
  display_name?: string;
  username?: string;
  location?: string;
  bio?: string;
  id_weight_class?: number | null;
  id_boxing_style?: number | null;
  experience_level?: 'beginner' | 'intermediate' | 'advanced' | null;
  height_cm?: number | null;
  avatar?: string | null; // preview URI
}

const EXPERIENCE_LEVELS = [
  { value: null, label: 'None' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] as const;

type Props = NativeStackScreenProps<RootStackParamList, 'CreateProfile'>;

export default function ProfileCreateScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<ProfileForm>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [weightClasses, setWeightClasses] = useState<any[]>([]);
  const [boxingStyles, setBoxingStyles] = useState<any[]>([]);

  const [selectedWeightClassTitle, setSelectedWeightClassTitle] = useState<string | null>(null);
  const [selectedBoxingStyleTitle, setSelectedBoxingStyleTitle] = useState<string | null>(null);
  const [selectedExperienceTitle, setSelectedExperienceTitle] = useState<string | null>(null);
  const [weightDropdownOpen, setWeightDropdownOpen] = useState(false);
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);
  const [experienceDropdownOpen, setExperienceDropdownOpen] = useState(false);

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
      showErrorNotification(
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
      if (form.experience_level != null)
        fd.append('experience_level', String(form.experience_level));
      if (form.height_cm != null)
        fd.append('height_cm', String(form.height_cm));

      if (avatarFile) {
        // React Native FormData expects a file object with uri, name, and type
        fd.append('avatar', {
          uri: avatarFile.uri,
          name: avatarFile.name,
          type: avatarFile.type,
        } as any);
      }

      await createProfile(fd);

      showSuccessNotification('Profile created successfully');
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
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100, paddingTop: (insets.top || 0) + 8 }}>
        <View style={styles.body}>
          <Text style={styles.pageTitle}>Create Profile</Text>
          <Text style={styles.pageSub}>Set up your athlete identity</Text>

          {/* Avatar */}
          <View style={styles.avatarCenter}>
            <Pressable onPress={pickImage} style={styles.avatarWrap}>
              <Avatar size="xl">
                <AvatarFallbackText>+</AvatarFallbackText>
                <AvatarImage source={{ uri: form.avatar || undefined }} />
              </Avatar>
              <View style={styles.cameraOverlay}>
                <Text style={styles.cameraIcon}>📷</Text>
              </View>
            </Pressable>
            <Text style={styles.avatarHint}>Tap to add photo</Text>
          </View>

          {!!error && (
            <GlassCard variant="red" radius={10} padding={12}>
              <Text style={styles.errorText}>{error}</Text>
            </GlassCard>
          )}

          {/* Basic info */}
          <GlassCard variant="medium" radius={14} padding={16}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Display name"
              value={form.display_name ?? ''}
              onChangeText={(t) => setForm({ ...form, display_name: t })}
              placeholderTextColor={colors.text.tertiary}
            />

            <Text style={[styles.label, { marginTop: 14 }]}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={form.username ?? ''}
              onChangeText={(t) => setForm({ ...form, username: t })}
              placeholderTextColor={colors.text.tertiary}
              autoCapitalize="none"
            />

            <Text style={[styles.label, { marginTop: 14 }]}>Location</Text>
            <TextInput
              style={styles.input}
              placeholder="Location"
              value={form.location ?? ''}
              onChangeText={(t) => setForm({ ...form, location: t })}
              placeholderTextColor={colors.text.tertiary}
            />

            <Text style={[styles.label, { marginTop: 14 }]}>Bio</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Bio"
              multiline
              numberOfLines={4}
              value={form.bio ?? ''}
              onChangeText={(t) => setForm({ ...form, bio: t })}
              placeholderTextColor={colors.text.tertiary}
            />
          </GlassCard>

          {/* Weight class + boxing style */}
          <GlassCard variant="medium" radius={14} padding={16}>
            <Text style={styles.label}>Weight Class</Text>
            <Pressable style={styles.select} onPress={() => setWeightDropdownOpen(true)}>
              <Text style={{ color: selectedWeightClassTitle ? colors.text.primary : colors.text.tertiary, fontSize: 14 }}>
                {selectedWeightClassTitle || '— select weight class —'}
              </Text>
            </Pressable>

            <Text style={[styles.label, { marginTop: 14 }]}>Boxing Style</Text>
            <Pressable style={styles.select} onPress={() => setStyleDropdownOpen(true)}>
              <Text style={{ color: selectedBoxingStyleTitle ? colors.text.primary : colors.text.tertiary, fontSize: 14 }}>
                {selectedBoxingStyleTitle || '— select boxing style —'}
              </Text>
            </Pressable>

            <Text style={[styles.label, { marginTop: 14 }]}>Experience Level</Text>
            <Pressable style={styles.select} onPress={() => setExperienceDropdownOpen(true)}>
              <Text style={{ color: selectedExperienceTitle ? colors.text.primary : colors.text.tertiary, fontSize: 14 }}>
                {selectedExperienceTitle || '— select experience level —'}
              </Text>
            </Pressable>

            <Text style={[styles.label, { marginTop: 14 }]}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="e.g. 178"
              value={form.height_cm != null ? String(form.height_cm) : ''}
              onChangeText={(t) => {
                const onlyDigits = t.replace(/[^0-9]/g, '');
                setForm({ ...form, height_cm: onlyDigits ? Number(onlyDigits) : null });
              }}
              placeholderTextColor={colors.text.tertiary}
            />
          </GlassCard>

          {/* Modals */}
          <Modal
            visible={weightDropdownOpen}
            transparent
            animationType="slide"
            presentationStyle="overFullScreen"
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={() => setWeightDropdownOpen(false)}
          >
            <Pressable style={styles.modalOverlay} onPress={() => setWeightDropdownOpen(false)}>
              <View style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Weight Class</Text>
                </View>
                <FlatList
                  data={[{ id_weight_class: null, title_weight: 'None' }, ...weightClasses]}
                  keyExtractor={(item) => String(item.id_weight_class)}
                  renderItem={({ item }) => (
                    <Pressable style={styles.modalItem} onPress={() => {
                      setSelectedWeightClassTitle(item.title_weight);
                      setForm({ ...form, id_weight_class: item.id_weight_class });
                      setWeightDropdownOpen(false);
                    }}>
                      <Text style={styles.modalItemText}>{item.title_weight}</Text>
                    </Pressable>
                  )}
                />
              </View>
            </Pressable>
          </Modal>

          <Modal
            visible={styleDropdownOpen}
            transparent
            animationType="slide"
            presentationStyle="overFullScreen"
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={() => setStyleDropdownOpen(false)}
          >
            <Pressable style={styles.modalOverlay} onPress={() => setStyleDropdownOpen(false)}>
              <View style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Boxing Style</Text>
                </View>
                <FlatList
                  data={[{ id_boxing_style: null, title_style: 'None' }, ...boxingStyles]}
                  keyExtractor={(item) => String(item.id_boxing_style)}
                  renderItem={({ item }) => (
                    <Pressable style={styles.modalItem} onPress={() => {
                      setSelectedBoxingStyleTitle(item.title_style);
                      setForm({ ...form, id_boxing_style: item.id_boxing_style });
                      setStyleDropdownOpen(false);
                    }}>
                      <Text style={styles.modalItemText}>{item.title_style}</Text>
                    </Pressable>
                  )}
                />
              </View>
            </Pressable>
          </Modal>

          <Modal
            visible={experienceDropdownOpen}
            transparent
            animationType="slide"
            presentationStyle="overFullScreen"
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={() => setExperienceDropdownOpen(false)}
          >
            <Pressable style={styles.modalOverlay} onPress={() => setExperienceDropdownOpen(false)}>
              <View style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Experience Level</Text>
                </View>
                <FlatList
                  data={EXPERIENCE_LEVELS}
                  keyExtractor={(item) => String(item.value ?? 'none')}
                  renderItem={({ item }) => (
                    <Pressable style={styles.modalItem} onPress={() => {
                      setSelectedExperienceTitle(item.label);
                      setForm({ ...form, experience_level: item.value });
                      setExperienceDropdownOpen(false);
                    }}>
                      <Text style={styles.modalItemText}>{item.label}</Text>
                    </Pressable>
                  )}
                />
              </View>
            </Pressable>
          </Modal>

          <SparrButton
            label={saving ? 'Creating...' : 'Create Profile'}
            variant="primary"
            loading={saving}
            onPress={handleCreate}
            fullWidth
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.secondary },
  center: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16, gap: 14 },
  pageTitle: { color: colors.text.primary, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  pageSub: { color: colors.text.secondary, fontSize: 13, textAlign: 'center', marginTop: -6 },
  avatarCenter: { alignItems: 'center', gap: 6, marginVertical: 8 },
  avatarWrap: { position: 'relative' },
  cameraOverlay: {
    position: 'absolute', bottom: 4, right: 4,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.primary.main, alignItems: 'center', justifyContent: 'center',
  },
  cameraIcon: { fontSize: 12 },
  avatarHint: { color: colors.text.tertiary, fontSize: 12 },
  errorText: { color: '#ffb3b3', fontSize: 13 },
  label: { color: colors.text.secondary, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.glass.surface, borderRadius: 10, borderWidth: 1,
    borderColor: colors.glass.border, color: colors.text.primary,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  inputMultiline: { height: 88, textAlignVertical: 'top', paddingTop: 10 },
  select: {
    backgroundColor: colors.glass.surface, borderRadius: 10, borderWidth: 1,
    borderColor: colors.glass.border, paddingHorizontal: 12, paddingVertical: 12,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.background.secondary, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: 400, overflow: 'hidden',
    borderTopWidth: 1, borderColor: colors.glass.border,
  },
  modalHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  modalTitle: { color: colors.text.primary, fontSize: 16, fontWeight: '700' },
  modalItem: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  modalItemText: { color: colors.text.primary, fontSize: 14 },
});
