// src/api/login.ts
import { Platform } from 'react-native';
import * as Keychain from "react-native-keychain";

const BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:4000/api'
  : 'http://10.0.2.2:4000/api'; // Android fix if needed

export async function login(email: string, password: string) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    // 1. Try to parse the response body as JSON first
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      // If the body isn't JSON, throw a generic error instead
      throw new Error(`Server error: ${response.statusText}`);
    }
    
    // 2. Access the specific 'error' property from the parsed JSON object
    // The server sends { "error": "Invalid credentials" }
    const errorMessage = errorData.error;

    // 3. Throw a new clean Error object using just the specific message string
    throw new Error(errorMessage || 'Login failed');
  }

  // If the response was OK (status 200), parse and return the successful data

  return response.json();
}
