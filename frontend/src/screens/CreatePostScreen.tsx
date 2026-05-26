import React, { useState } from 'react';
import {
  TextInput,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
  Pressable,
  View,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { createPost } from '../api/posts';
import { createClubPost } from '../api/clubs';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/glass-card';
import { SparrButton } from '@/components/ui/sparr-button';
import { colors } from '@/src/theme/colors';

export default function CreatePostScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, 'CreatePost'>>();
  const clubId = route.params?.clubId;
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const pickMedia = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.type === 'video') {
          setVideoUri(asset.uri);
          setImageUri(null);
        } else {
          setImageUri(asset.uri);
          setVideoUri(null);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick media');
    }
  };

  const handleSubmit = async () => {
    // Validate: description OR media required
    if (!description.trim() && !imageUri && !videoUri) {
      Alert.alert('Required', 'Please add a description or select an image/video');
      return;
    }

    setLoading(true);
    try {
      if (clubId) {
        await createClubPost(
          clubId,
          description.trim() || undefined,
          imageUri || undefined,
          videoUri || undefined
        );
      } else {
        await createPost(
          description.trim() || undefined,
          imageUri || undefined,
          videoUri || undefined
        );
      }
      
      // Clear form
      setDescription('');
      setImageUri(null);
      setVideoUri(null);
      
      // Navigate back and trigger refresh
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: (insets.top || 0) + 6 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>{clubId ? 'New Club Post' : 'New Post'}</Text>
        <View style={styles.headerRight} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.screenSub}>{clubId ? 'Share an update with your club' : 'Share your boxing progress'}</Text>

        {/* Caption input */}
        <GlassCard variant="medium" radius={14} padding={14} style={styles.captionCard}>
          <TextInput
            placeholder="What's on your mind? (optional if media is selected)"
            placeholderTextColor={colors.text.tertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            editable={!loading}
            style={styles.captionInput}
          />
        </GlassCard>

        {/* Image preview */}
        {imageUri && (
          <View style={styles.mediaPreview}>
            <Pressable onPress={() => setImageUri(null)} style={styles.mediaRemove} disabled={loading}>
              <Ionicons name="close-circle" size={26} color={colors.primary.main} />
            </Pressable>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          </View>
        )}

        {/* Video preview */}
        {videoUri && (
          <GlassCard variant="medium" radius={14} padding={14} style={styles.videoPreview}>
            <View style={styles.videoPreviewRow}>
              <Ionicons name="videocam-outline" size={24} color={colors.text.secondary} />
              <Text style={styles.videoText}>Video ready to upload</Text>
              <Pressable onPress={() => setVideoUri(null)} disabled={loading}>
                <Ionicons name="close" size={20} color={colors.text.secondary} />
              </Pressable>
            </View>
          </GlassCard>
        )}

        {/* Media button */}
        {!imageUri && !videoUri && (
          <View style={styles.mediaButtons}>
            <Pressable style={styles.mediaBtn} onPress={pickMedia} disabled={loading}>
              <Ionicons name="attach-outline" size={22} color={colors.text.secondary} />
              <Text style={styles.mediaBtnText}>Add Media</Text>
            </Pressable>
          </View>
        )}

        <SparrButton
          label="Share Post"
          variant="primary"
          loading={loading}
          onPress={handleSubmit}
          fullWidth
          style={styles.submitBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.secondary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: colors.text.primary, fontSize: 17, fontWeight: '700' },
  headerRight: { width: 34 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },
  screenSub: { color: colors.text.tertiary, fontSize: 13, marginBottom: 20 },
  captionCard: { marginBottom: 16 },
  captionInput: {
    color: colors.text.primary, fontSize: 15, lineHeight: 22,
    minHeight: 120, textAlignVertical: 'top',
  },
  mediaPreview: { position: 'relative', marginBottom: 16, borderRadius: 14, overflow: 'hidden' },
  mediaRemove: { position: 'absolute', top: 10, right: 10, zIndex: 1 },
  previewImage: { width: '100%', height: 280, borderRadius: 14 },
  videoPreview: { marginBottom: 16 },
  videoPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  videoText: { flex: 1, color: colors.text.secondary, fontSize: 14 },
  mediaButtons: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  mediaBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12,
    backgroundColor: colors.background.card, borderWidth: 1, borderColor: colors.border.light,
  },
  mediaBtnText: { color: colors.text.secondary, fontSize: 14, fontWeight: '600' },
  submitBtn: { marginTop: 4 },
});
