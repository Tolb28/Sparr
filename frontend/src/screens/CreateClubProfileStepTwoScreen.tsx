import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, View, Pressable, StyleSheet } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarImage, AvatarFallbackText } from '@/components/ui/avatar';
import { GlassCard } from '@/components/ui/glass-card';
import { SparrButton } from '@/components/ui/sparr-button';
import { RootStackParamList } from '../navigation/AppNavigator';
import { createClub, uploadClubAvatar, uploadClubCover } from '../api/clubs';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { showErrorNotification } from '@/src/services/notificationService';

type RouteType = RouteProp<RootStackParamList, 'CreateClubStepTwo'>;

export default function CreateClubProfileStepTwoScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const c = useThemeColors();
  const route = useRoute<RouteType>();

  const [avatarFile, setAvatarFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [coverFile, setCoverFile]   = useState<{ uri: string; name: string; type: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showErrorNotification('Please allow photo library access.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled) return;
    const asset = result.assets[0];
    setAvatarFile({
      uri: asset.uri,
      name: 'club-avatar.jpg',
      type: asset.mimeType ?? 'image/jpeg',
    });
  };

  const pickCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showErrorNotification('Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setCoverFile({
      uri: asset.uri,
      name: 'club-cover.jpg',
      type: asset.mimeType ?? 'image/jpeg',
    });
  };

  const handleFinish = async () => {
    try {
      setSaving(true);
      const resp = await createClub({
        title: route.params.title,
        location: route.params.location,
        bio: route.params.bio,
        join_policy: route.params.joinPolicy,
      });

      const clubId = Number(resp?.club?.idclubs);
      if (!clubId) throw new Error('Club was not created correctly');

      if (avatarFile) {
        const fd = new FormData();
        fd.append('avatar', { uri: avatarFile.uri, name: avatarFile.name, type: avatarFile.type } as any);
        await uploadClubAvatar(clubId, fd);
      }

      if (coverFile) {
        const fd = new FormData();
        fd.append('cover', { uri: coverFile.uri, name: coverFile.name, type: coverFile.type } as any);
        await uploadClubCover(clubId, fd);
      }

      navigation.replace('ClubProfile', { clubId });
    } catch (error: any) {
      showErrorNotification(error?.message || 'Unable to create club');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background.secondary }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: (insets.top || 0) + 4, borderBottomColor: c.border.light }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.iconBtn, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color={c.text.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: c.text.primary }]}>Create Club · Step 2/2</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Step indicator */}
        <View style={styles.stepBar}>
          <View style={[styles.stepDot, { backgroundColor: c.primary.main + '88', borderColor: c.primary.main }]} />
          <View style={[styles.stepLine, { backgroundColor: c.primary.main + '66' }]} />
          <View style={[styles.stepDot, styles.stepActive, { backgroundColor: c.primary.main, borderColor: c.primary.main }]} />
        </View>

        <View style={styles.body}>
          <Text style={[styles.pageTitle, { color: c.text.primary }]}>Add Club Photos</Text>
          <Text style={[styles.pageSub, { color: c.text.secondary }]}>Optional — add an avatar and cover photo for your club.</Text>

          {/* Cover photo picker */}
          <Pressable onPress={pickCover} style={[styles.coverPicker, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]}>
            {coverFile ? (
              <Image
                source={{ uri: coverFile.uri }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.coverEmpty}>
                <Ionicons name="image-outline" size={28} color={c.text.tertiary} />
                <Text style={[styles.coverPickerLabel, { color: c.text.tertiary }]}>Tap to add cover photo (16:9)</Text>
              </View>
            )}
            <View style={[styles.coverCameraOverlay, { backgroundColor: c.primary.main }]}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </Pressable>

          {/* Avatar picker */}
          <View style={styles.avatarCenter}>
            <Pressable onPress={pickAvatar} style={styles.avatarWrap}>
              <Avatar size="2xl">
                {avatarFile ? (
                  <AvatarImage source={{ uri: avatarFile.uri }} />
                ) : (
                  <AvatarFallbackText>+</AvatarFallbackText>
                )}
              </Avatar>
              <View style={[styles.cameraOverlay, { backgroundColor: c.primary.main }]}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            </Pressable>
            <Text style={[styles.avatarHint, { color: c.text.tertiary }]}>Tap to choose image</Text>
          </View>

          {/* Club summary */}
          <GlassCard variant="medium" radius={14} padding={14}>
            <Text style={[styles.summaryTitle, { color: c.text.primary }]}>{route.params.title}</Text>
            {!!route.params.location && <Text style={[styles.summarySub, { color: c.text.secondary }]}>{route.params.location}</Text>}
            {!!route.params.bio && <Text style={[styles.summarySub, { color: c.text.secondary }]}>{route.params.bio}</Text>}
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]}>
                <Text style={[styles.badgeText, { color: c.text.tertiary }]}>{route.params.joinPolicy.toUpperCase()}</Text>
              </View>
            </View>
          </GlassCard>

          <SparrButton
            label="Create Club Profile"
            variant="primary"
            loading={saving}
            onPress={handleFinish}
            fullWidth
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 6,
  },
  stepDot: {
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 1,
  },
  stepDone: {},
  stepActive: { width: 24 },
  stepLine: { width: 32, height: 2 },
  stepLineDone: {},
  body: { padding: 16, gap: 14 },
  pageTitle: { fontSize: 22, fontWeight: '800' },
  pageSub: { fontSize: 13, marginTop: -6 },
  avatarCenter: { alignItems: 'center', gap: 8 },
  avatarWrap: { position: 'relative' },
  cameraOverlay: {
    position: 'absolute', bottom: 4, right: 4,
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarHint: { fontSize: 12 },
  summaryTitle: { fontSize: 15, fontWeight: '700' },
  summarySub: { fontSize: 12, marginTop: 3 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '600' },
  // Cover photo
  coverPicker: {
    width: '100%', height: 130, borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed', overflow: 'hidden', position: 'relative',
  },
  coverEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  coverPreview: { flex: 1 },
  coverPickerLabel: { fontSize: 12 },
  coverCameraOverlay: {
    position: 'absolute', bottom: 8, right: 8,
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
});
