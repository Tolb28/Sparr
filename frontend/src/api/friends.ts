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

export async function getPendingRequests() {
  const token = await getToken();
  console.log('Fetching pending friend requests with token:', token);
  const res = await fetch(`${ServerIP}/auth/friends/requests/pending`, {
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
    throw new Error(err?.error ?? 'Failed to fetch friend requests');
  }

  const data = await res.json();
  // returns { requests: [...] }
  return data.requests ?? data;
}

export async function acceptFriendRequest(recipientProfileId: number, requesterProfileId: number) {
  const token = await getToken();
  const res = await fetch(`${ServerIP}/auth/friends/requests/${requesterProfileId}/accept`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch (e) { /* ignore */ }
    throw new Error(err?.error ?? 'Failed to accept friend request');
  }

  return await res.json();
}

export async function declineFriendRequest(recipientProfileId: number, requesterProfileId: number) {
  const token = await getToken();
  const res = await fetch(`${ServerIP}/auth/friends/requests/${requesterProfileId}/decline`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch (e) { /* ignore */ }
    throw new Error(err?.error ?? 'Failed to decline friend request');
  }

  return await res.json();
}

export async function checkFriendStatus(targetProfileId: number) {
  const token = await getToken();
  const res = await fetch(`${ServerIP}/auth/friends/status/${targetProfileId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch (e) { /* ignore */ }
    throw new Error(err?.error ?? 'Failed to check friend status');
  }

  const data = await res.json();
  return data.status; // 'friends', 'pending_sent', 'pending_received', or 'none'
}

export async function sendFriendRequest(targetProfileId: number) {
  const token = await getToken();
  const res = await fetch(`${ServerIP}/auth/friends/request/${targetProfileId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch (e) { /* ignore */ }
    throw new Error(err?.error ?? 'Failed to send friend request');
  }

  return await res.json();
}

export async function unfriend(targetProfileId: number) {
  const token = await getToken();
  const res = await fetch(`${ServerIP}/auth/friends/${targetProfileId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch (e) { /* ignore */ }
    throw new Error(err?.error ?? 'Failed to unfriend user');
  }

  return await res.json();
}
