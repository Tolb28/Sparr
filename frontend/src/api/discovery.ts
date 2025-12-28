import { Platform } from 'react-native';
import { getToken, ServerIP } from './tokenHandler';

export async function getDiscoveryFeed(limit: number = 20, offset: number = 0) {
  const token = await getToken();

  const response = await fetch(
    `${ServerIP}/auth/discovery?limit=${limit}&offset=${offset}`,
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
