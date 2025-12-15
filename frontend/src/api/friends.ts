import { Platform } from 'react-native';
import { getToken } from './tokenHandler';

const BASE_URL = Platform.OS === 'web' ? 'http://localhost:4000/api' : 'http://10.0.2.2:4000/api';

export async function getFriends() {
  const token = await getToken();
  console.log('Fetching friends with token:', token);
  const res = await fetch(`${BASE_URL}/auth/friends`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  console.log('Response status:', res.status);
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch (e) { /* ignore */ }
    throw new Error(err?.error ?? 'Failed to fetch friends');
  }

  const data = await res.json();
  // returns { friends: [...] }
  return data.friends ?? data;
}
