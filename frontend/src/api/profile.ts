import { Platform } from 'react-native';
import { getToken, ServerIP, deleteToken } from './tokenHandler';
import { storeProfile, removeProfile } from './profileHandler';


export async function getUserProfile() {
  // read token from keychain
  const token = await getToken();

  const response = await fetch(`${ServerIP}/auth/profile`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
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

  const data = await response.json();
  console.log('Fetched profile from server:', data);
  await storeProfile(data?.profile ?? data);

  return data;
}


export async function updateProfile(updates: any) {
  const token = await getToken();

  console.log('Updating profile with data:', updates);

  // If updates is FormData (contains a file), send it as multipart/form-data
  if (updates instanceof FormData) {
    const response = await fetch(`${ServerIP}/auth/profile`, {
      method: 'PUT',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // Don't set Content-Type header for FormData - the browser will set it with boundary
      },
      body: updates,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        throw new Error(`Server error: ${response.statusText}`);
      }
      const errorMessage = errorData?.error || errorData?.message;
      throw new Error(errorMessage || 'Failed to update profile');
    }

    const data = await response.json();
    // Store the updated profile
    await storeProfile(data?.profile ?? data);
    return data;
  }

  // Otherwise, send as JSON
  const response = await fetch(`${ServerIP}/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      throw new Error(`Server error: ${response.statusText}`);
    }
    const errorMessage = errorData?.error || errorData?.message;
    throw new Error(errorMessage || 'Failed to update profile');
  }

  const data = await response.json();
  // Store the updated profile
  await storeProfile(data?.profile ?? data);
  return data;
}

export async function deleteProfile() {
  const token = await getToken();

  const response = await fetch(`${ServerIP}/auth/profile`, {
    method: 'DELETE',
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
    throw new Error(errorMessage || 'Failed to delete profile');
  }

  return response.json();
}

export async function createProfile(payload: any) {
  const token = await getToken();

  // If payload is FormData (contains a file), send it as multipart/form-data
  if (payload instanceof FormData) {
    const response = await fetch(`${ServerIP}/auth/profile`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // Don't set Content-Type header for FormData - the browser will set it with boundary
      },
      body: payload,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        throw new Error(`Server error: ${response.statusText}`);
      }
      const errorMessage = errorData?.error || errorData?.message;
      throw new Error(errorMessage || 'Failed to create profile');
    }

    return response.json();
  }

  // Otherwise, send as JSON
  const response = await fetch(`${ServerIP}/auth/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      throw new Error(`Server error: ${response.statusText}`);
    }
    const errorMessage = errorData?.error || errorData?.message;
    throw new Error(errorMessage || 'Failed to create profile');
  }

  return response.json();
}

export async function getForeignProfile(id : number) {
  // read token from keychain
  const token = await getToken();

  const response = await fetch(`${ServerIP}/auth/profile/foreign/${id}`, {
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