import { Platform } from 'react-native';
import { ServerIP } from './tokenHandler';

interface RegisterResponse {
  token: string;
  user: { id: string; email: string; username?: string };
}

export async function register(email: string, password: string): Promise<RegisterResponse> {
  const payload: any = { email, password };
  const response = await fetch(`${ServerIP}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      throw new Error(`Server error: ${response.statusText}`);
    }
    const errorMessage = errorData.error;
    throw new Error(errorMessage || 'Registration failed');
  }

  return response.json();
}
