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
  KeyboardAvoidingView,
  Platform,
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
import { useThemeColors } from '@/src/hooks/useThemeColors';
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
  const c = useThemeColors();
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
      setError(e?.message ?? 'Failed to create profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: c.background.secondary }]}>
        <ActivityIndicator size="large" color={c.primary.main} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background.secondary }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100, paddingTop: (insets.top || 0) + 8 }}>
        <View style={styles.body}>
          <Text style={[styles.pageTitle, { color: c.text.primary }]}>Create Profile</Text>
          <Text style={[styles.pageSub, { color: c.text.secondary }]}>Set up your athlete identity</Text>

          {/* Avatar */}
          <View style={styles.avatarCenter}>
            <Pressable onPress={pickImage} style={styles.avatarWrap}>
              <Avatar size="xl">
                <AvatarFallbackText>+</AvatarFallbackText>
                <AvatarImage source={{ uri: form.avatar || undefined }} />
              </Avatar>
              <View style={[styles.cameraOverlay, { backgroundColor: c.primary.main }]}>
                <Text style={styles.cameraIcon}>📷</Text>
              </View>
            </Pressable>
            <Text style={[styles.avatarHint, { color: c.text.tertiary }]}>Tap to add photo</Text>
          </View>

          {!!error && (
            <GlassCard variant="red" radius={10} padding={12}>
              <Text style={styles.errorText}>{error}</Text>
            </GlassCard>
          )}

          {/* Basic info */}
          <GlassCard variant="medium" radius={14} padding={16}>
            <Text style={[styles.label, { color: c.text.secondary }]}>Display Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.glass.surface, borderColor: c.glass.border, color: c.text.primary }]}
              placeholder="Display name"
              value={form.display_name ?? ''}
              onChangeText={(t) => setForm({ ...form, display_name: t })}
              placeholderTextColor={c.text.tertiary}
            />

            <Text style={[styles.label, { marginTop: 14, color: c.text.secondary }]}>Username</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.glass.surface, borderColor: c.glass.border, color: c.text.primary }]}
              placeholder="Username"
              value={form.username ?? ''}
              onChangeText={(t) => setForm({ ...form, username: t })}
              placeholderTextColor={c.text.tertiary}
              autoCapitalize="none"
            />

            <Text style={[styles.label, { marginTop: 14, color: c.text.secondary }]}>Location</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.glass.surface, borderColor: c.glass.border, color: c.text.primary }]}
              placeholder="Location"
              value={form.location ?? ''}
              onChangeText={(t) => setForm({ ...form, location: t })}
              placeholderTextColor={c.text.tertiary}
            />

            <Text style={[styles.label, { marginTop: 14, color: c.text.secondary }]}>Bio</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline, { backgroundColor: c.glass.surface, borderColor: c.glass.border, color: c.text.primary }]}
              placeholder="Bio"
              multiline
              numberOfLines={4}
              value={form.bio ?? ''}
              onChangeText={(t) => setForm({ ...form, bio: t })}
              placeholderTextColor={c.text.tertiary}
            />
          </GlassCard>

          {/* Weight class + boxing style */}
          <GlassCard variant="medium" radius={14} padding={16}>
            <Text style={[styles.label, { color: c.text.secondary }]}>Weight Class</Text>
            <Pressable style={[styles.select, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]} onPress={() => setWeightDropdownOpen(true)}>
              <Text style={{ color: selectedWeightClassTitle ? c.text.primary : c.text.tertiary, fontSize: 14 }}>
                {selectedWeightClassTitle || '— select weight class —'}
              </Text>
            </Pressable>

            <Text style={[styles.label, { marginTop: 14, color: c.text.secondary }]}>Boxing Style</Text>
            <Pressable style={[styles.select, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]} onPress={() => setStyleDropdownOpen(true)}>
              <Text style={{ color: selectedBoxingStyleTitle ? c.text.primary : c.text.tertiary, fontSize: 14 }}>
                {selectedBoxingStyleTitle || '— select boxing style —'}
              </Text>
            </Pressable>

            <Text style={[styles.label, { marginTop: 14, color: c.text.secondary }]}>Experience Level</Text>
            <Pressable style={[styles.select, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]} onPress={() => setExperienceDropdownOpen(true)}>
              <Text style={{ color: selectedExperienceTitle ? c.text.primary : c.text.tertiary, fontSize: 14 }}>
                {selectedExperienceTitle || '— select experience level —'}
              </Text>
            </Pressable>

            <Text style={[styles.label, { marginTop: 14, color: c.text.secondary }]}>Height (cm)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.glass.surface, borderColor: c.glass.border, color: c.text.primary }]}
              keyboardType="number-pad"
              placeholder="e.g. 178"
              value={form.height_cm != null ? String(form.height_cm) : ''}
              onChangeText={(t) => {
                const onlyDigits = t.replace(/[^0-9]/g, '');
                setForm({ ...form, height_cm: onlyDigits ? Number(onlyDigits) : null });
              }}
              placeholderTextColor={c.text.tertiary}
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
              <View style={[styles.modalSheet, { backgroundColor: c.background.secondary, borderColor: c.glass.border }]}>
                <View style={[styles.modalHeader, { borderBottomColor: c.border.light }]}>
                  <Text style={[styles.modalTitle, { color: c.text.primary }]}>Select Weight Class</Text>
                </View>
                <FlatList
                  data={[{ id_weight_class: null, title_weight: 'None' }, ...weightClasses]}
                  keyExtractor={(item) => String(item.id_weight_class)}
                  renderItem={({ item }) => (
                    <Pressable style={[styles.modalItem, { borderBottomColor: c.border.light }]} onPress={() => {
                      setSelectedWeightClassTitle(item.title_weight);
                      setForm({ ...form, id_weight_class: item.id_weight_class });
                      setWeightDropdownOpen(false);
                    }}>
                      <Text style={[styles.modalItemText, { color: c.text.primary }]}>{item.title_weight}</Text>
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
              <View style={[styles.modalSheet, { backgroundColor: c.background.secondary, borderColor: c.glass.border }]}>
                <View style={[styles.modalHeader, { borderBottomColor: c.border.light }]}>
                  <Text style={[styles.modalTitle, { color: c.text.primary }]}>Select Boxing Style</Text>
                </View>
                <FlatList
                  data={[{ id_boxing_style: null, title_style: 'None' }, ...boxingStyles]}
                  keyExtractor={(item) => String(item.id_boxing_style)}
                  renderItem={({ item }) => (
                    <Pressable style={[styles.modalItem, { borderBottomColor: c.border.light }]} onPress={() => {
                      setSelectedBoxingStyleTitle(item.title_style);
                      setForm({ ...form, id_boxing_style: item.id_boxing_style });
                      setStyleDropdownOpen(false);
                    }}>
                      <Text style={[styles.modalItemText, { color: c.text.primary }]}>{item.title_style}</Text>
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
              <View style={[styles.modalSheet, { backgroundColor: c.background.secondary, borderColor: c.glass.border }]}>
                <View style={[styles.modalHeader, { borderBottomColor: c.border.light }]}>
                  <Text style={[styles.modalTitle, { color: c.text.primary }]}>Select Experience Level</Text>
                </View>
                <FlatList
                  data={EXPERIENCE_LEVELS}
                  keyExtractor={(item) => String(item.value ?? 'none')}
                  renderItem={({ item }) => (
                    <Pressable style={[styles.modalItem, { borderBottomColor: c.border.light }]} onPress={() => {
                      setSelectedExperienceTitle(item.label);
                      setForm({ ...form, experience_level: item.value });
                      setExperienceDropdownOpen(false);
                    }}>
                      <Text style={[styles.modalItemText, { color: c.text.primary }]}>{item.label}</Text>
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
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16, gap: 14 },
  pageTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  pageSub: { fontSize: 13, textAlign: 'center', marginTop: -6 },
  avatarCenter: { alignItems: 'center', gap: 6, marginVertical: 8 },
  avatarWrap: { position: 'relative' },
  cameraOverlay: {
    position: 'absolute', bottom: 4, right: 4,
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  cameraIcon: { fontSize: 12 },
  avatarHint: { fontSize: 12 },
  errorText: { color: '#ffb3b3', fontSize: 13 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  input: {
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  inputMultiline: { height: 88, textAlignVertical: 'top', paddingTop: 10 },
  select: {
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 12,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: 400, overflow: 'hidden',
    borderTopWidth: 1,
  },
  modalHeader: { padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalItem: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalItemText: { fontSize: 14 },
});
