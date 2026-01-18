import React, { useState } from 'react';
import {
  TextInput,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
  Pressable as RNPressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Ionicons } from '@expo/vector-icons';
import { createPost } from '../api/posts';
import { useNavigation } from '@react-navigation/native';

export default function CreatePostScreen() {
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setVideoUri(null); // Clear video if image is selected
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        setVideoUri(result.assets[0].uri);
        setImageUri(null); // Clear image if video is selected
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick video');
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
      await createPost(
        description.trim() || undefined,
        imageUri || undefined,
        videoUri || undefined
      );
      
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
    <Box className="flex-1 bg-white">
      <ScrollView className="flex-1 px-4 py-4">
        <VStack space="lg">
          {/* Description Input */}
          <VStack space="xs">
            <Text className="text-sm font-semibold text-gray-700">Description</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 text-base text-gray-900 min-h-[120px]"
              placeholder="What's on your mind? (optional if media is selected)"
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              editable={!loading}
            />
          </VStack>

          {/* Media Preview */}
          {imageUri && (
            <VStack space="xs">
              <HStack space="sm" className="justify-between items-start">
                <Text className="text-sm font-semibold text-gray-700">Image</Text>
                <RNPressable
                  onPress={() => setImageUri(null)}
                  disabled={loading}
                >
                  <Ionicons name="close" size={20} color="#4B5563" />
                </RNPressable>
              </HStack>
              <Image
                source={{ uri: imageUri }}
                style={{ width: '100%', height: 300, borderRadius: 8 }}
              />
            </VStack>
          )}

          {videoUri && (
            <VStack space="xs">
              <HStack space="sm" className="justify-between items-start">
                <Text className="text-sm font-semibold text-gray-700">Video Selected</Text>
                <RNPressable
                  onPress={() => setVideoUri(null)}
                  disabled={loading}
                >
                  <Ionicons name="close" size={20} color="#4B5563" />
                </RNPressable>
              </HStack>
              <Box className="w-full h-32 bg-gray-200 rounded-lg justify-center items-center">
                <Text className="text-gray-600">Video ready to upload</Text>
              </Box>
            </VStack>
          )}

          {/* Media Selection Buttons */}
          {!imageUri && !videoUri && (
            <VStack space="xs">
              <Text className="text-sm font-semibold text-gray-700">Add Media (optional)</Text>
              <HStack space="sm">
                <Button
                  onPress={pickImage}
                  disabled={loading}
                  action="primary"
                  className="flex-1"
                >
                  <ButtonText>Pick Image</ButtonText>
                </Button>
                <Button
                  onPress={pickVideo}
                  disabled={loading}
                  action="primary"
                  className="flex-1"
                >
                  <ButtonText>Pick Video</ButtonText>
                </Button>
              </HStack>
            </VStack>
          )}

          {/* Submit Button */}
          <Button
            onPress={handleSubmit}
            disabled={loading}
            action="primary"
            className="w-full"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ButtonText>Create Post</ButtonText>
            )}
          </Button>
        </VStack>
      </ScrollView>
    </Box>
  );
}
