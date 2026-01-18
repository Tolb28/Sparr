import { Platform } from 'react-native';
import { getToken, ServerIP } from './tokenHandler';
import { getProfile } from './profileHandler';

export async function createPost(
  description?: string,
  imageUri?: string,
  videoUri?: string
) {
  const token = await getToken();
  const profileData = await getProfile();
  const profile = profileData ? JSON.parse(profileData) : null;

  const formData = new FormData();

  if (description !== undefined) {
    formData.append('description', description);
  }

  // Handle file uploads on native platforms
  if (imageUri) {
    // Extract filename and determine correct type
    const filename = imageUri.split('/').pop() || 'post-image.jpg';
    const extension = filename.split('.').pop()?.toLowerCase() || 'jpg';
    
    const mimeTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
    };
    
    const type = mimeTypes[extension] || 'image/jpeg';
    
    console.log('[POST FRONTEND] Image URI:', imageUri);
    console.log('[POST FRONTEND] Image filename:', filename, 'extension:', extension, 'type:', type);
    
    const imageFile = {
      uri: imageUri,
      type: type,
      name: filename,
    } as any;
    formData.append('image', imageFile);
  }

  if (videoUri) {
    // Extract filename and determine correct type
    const filename = videoUri.split('/').pop() || 'post-video.mp4';
    const extension = filename.split('.').pop()?.toLowerCase() || 'mp4';
    
    const mimeTypes: { [key: string]: string } = {
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'mkv': 'video/x-matroska',
      'webm': 'video/webm',
    };
    
    const type = mimeTypes[extension] || 'video/mp4';
    
    console.log('[POST FRONTEND] Video URI:', videoUri);
    console.log('[POST FRONTEND] Video filename:', filename, 'extension:', extension, 'type:', type);
    
    const videoFile = {
      uri: videoUri,
      type: type,
      name: filename,
    } as any;
    formData.append('video', videoFile);
  }

  if (profile && profile.id_profiles) {
    formData.append('profileId', profile.id_profiles.toString());
  }

  console.log('[POST FRONTEND] Sending request to:', `${ServerIP}/auth/posts`);
  console.log('[POST FRONTEND] Form data keys:', formData);
  console.log('[POST FRONTEND] Description:', description);
  console.log('[POST FRONTEND] ProfileId:', profile?.id_profiles);
  console.log('[POST FRONTEND] Has image:', !!imageUri);
  console.log('[POST FRONTEND] Has video:', !!videoUri);

  const response = await fetch(`${ServerIP}/auth/posts`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      throw new Error(`Server error: ${response.statusText}`);
    }
    const errorMessage = errorData?.error || errorData?.message;
    throw new Error(errorMessage || 'Failed to create post');
  }

  return response.json();
}
