import { Platform } from 'react-native';
import { getToken, ServerIP } from './tokenHandler';


export async function getFriends() {
  const token = await getToken();
  console.log('Fetching friends with token:', token);
  const res = await fetch(`${ServerIP}/auth/friends`, {
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
