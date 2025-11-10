// src/api/index.ts
import { Platform } from 'react-native';

const BASE_URL =
  Platform.OS === 'ios'
    ? 'http://localhost:4000'
    : 'http://10.0.2.2:4000'; // Android emulator points to host machine

interface LoginResponse {
  token: string;
  user: { id: string; email: string; username: string };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  return response.json();
}

export async function getProfile(userId: string) {
  const response = await fetch(`${BASE_URL}/users/${userId}`);
  if (!response.ok) throw new Error('Failed to fetch profile');
  return response.json();
}

