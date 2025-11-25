import { Platform } from 'react-native';
import { getToken } from './tokenHandler';

const BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:4000/api'
  : 'http://10.0.2.2:4000/api'; // Android fix if needed

export async function getUserProfile() {
  // read token from keychain
  const token = await getToken();

  const response = await fetch(`${BASE_URL}/auth/profile`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      throw new Error(`Server error: ${response.statusText}`);
    }
    const errorMessage = errorData?.error || errorData?.message;
    throw new Error(errorMessage || 'Failed to fetch profile');
  }

  return response.json();
}
