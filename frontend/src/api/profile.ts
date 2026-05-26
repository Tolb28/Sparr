import { Platform } from 'react-native';
import { getToken, ServerIP, deleteToken } from './tokenHandler';
import { getActiveProfileId, setActiveProfileId, storeProfile, removeProfile } from './profileHandler';

async function getProfileContextHeaders() {
  const activeProfileId = await getActiveProfileId();
  const headers: Record<string, string> = {};
  if (activeProfileId) {
    headers['X-Profile-Id'] = String(activeProfileId);
  }
  return headers;
}

export async function buildAuthHeaders(base: Record<string, string> = {}) {
  const token = await getToken();
  const profileContext = await getProfileContextHeaders();
  const headers: Record<string, string> = {
    ...base,
    ...profileContext,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}


export async function getUserProfile() {
  const response = await fetch(`${ServerIP}/auth/profile`, {
    method: 'GET',
    headers: await buildAuthHeaders({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    }),
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
  if (data?.profile?.id_profiles) {
    await setActiveProfileId(Number(data.profile.id_profiles));
  }

  return data;
}


export async function updateProfile(updates: any) {
  console.log('Updating profile with data:', updates);

  // If updates is FormData (contains a file), send it as multipart/form-data
  if (updates instanceof FormData) {
    const response = await fetch(`${ServerIP}/auth/profile`, {
      method: 'PUT',
      headers: await buildAuthHeaders(),
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
    headers: await buildAuthHeaders({ 'Content-Type': 'application/json' }),
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
  const response = await fetch(`${ServerIP}/auth/profile`, {
    method: 'DELETE',
    headers: await buildAuthHeaders({ 'Content-Type': 'application/json' }),
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

export async function getMyProfiles() {
  const token = await getToken();
  const response = await fetch(`${ServerIP}/auth/profiles`, {
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
    throw new Error(errorData?.error || errorData?.message || 'Failed to fetch linked profiles');
  }

  const data = await response.json();
  return data?.profiles || [];
}
