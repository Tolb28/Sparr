import { Platform } from 'react-native';
import { getToken, ServerIP } from './tokenHandler';
import { getProfile } from './profileHandler';

export async function getDiscoveryFeed(limit: number = 20, offset: number = 0) {
  const token = await getToken();

  const profileData = await getProfile();
  const profile = profileData ? JSON.parse(profileData) : null;
  const profileId = profile ? profile.id_profiles : null;

  const response = await fetch(
    `${ServerIP}/auth/discovery?limit=${limit}&offset=${offset}&profileId=${profileId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data?.message || 'Could not load discovery feed');
  }

  return data.posts;
}

export async function getCommentsForPost(postId: number, limit: number = 20, offset: number = 0) {
  const token = await getToken();
  const response = await fetch(
    `${ServerIP}/auth/discovery/${postId}/comments?limit=${limit}&offset=${offset}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data?.message || 'Could not load comments');
  }

  return data.comments;
}