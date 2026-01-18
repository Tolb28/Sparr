import { Platform } from 'react-native';
import { getToken, ServerIP } from './tokenHandler';
import { getProfile } from './profileHandler';

export async function getDiscoveryFeed(limit: number = 20, offset: number = 0, search?: string) {
  const token = await getToken();

  const profileData = await getProfile();
  const profile = profileData ? JSON.parse(profileData) : null;
  const profileId = profile ? profile.id_profiles : null;

  let url = `${ServerIP}/auth/discovery?limit=${limit}&offset=${offset}&profileId=${profileId}`;
  if (search && search.trim()) {
    url += `&search=${encodeURIComponent(search)}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data?.message || 'Could not load discovery feed');
  }

  return data.posts;
}

export async function getProfilePosts(profileId: number, limit: number = 20, offset: number = 0) {
  const token = await getToken();

  const currentProfileData = await getProfile();
  const currentProfile = currentProfileData ? JSON.parse(currentProfileData) : null;
  const currentProfileId = currentProfile ? currentProfile.id_profiles : null;

  const response = await fetch(
    `${ServerIP}/auth/discovery?limit=${limit}&offset=${offset}&profileId=${currentProfileId}&ownerId=${profileId}`,
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
    throw new Error(data?.message || 'Could not load profile posts');
  }

  return data.posts;
}

export async function getCommentsForPost(postId: number, limit: number = 20, offset: number = 0) {
  const token = await getToken();
  const profileData = await getProfile();
  const profile = profileData ? JSON.parse(profileData) : null;
  const profileId = profile ? profile.id_profiles : null;
  const response = await fetch(
    `${ServerIP}/auth/discovery/${postId}/comments?limit=${limit}&offset=${offset}&profileId=${profileId}`,
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