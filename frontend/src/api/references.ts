import { Platform } from 'react-native';
import { getToken, ServerIP } from './tokenHandler';


export async function getProfileReferences() {
  const token = await getToken();
    const response = await fetch(`${ServerIP}/auth/profile/references`, {
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
    throw new Error(errorMessage || 'Failed to fetch references');
  }

  return response.json();
}
