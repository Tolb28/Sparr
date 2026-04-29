import { getToken, ServerIP } from './tokenHandler';
import { getActiveProfileId } from './profileHandler';

async function authFetch(path: string, opts: RequestInit = {}) {
  const token = await getToken();
  const activeProfileId = await getActiveProfileId();
  const response = await fetch(`${ServerIP}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(activeProfileId ? { 'X-Profile-Id': String(activeProfileId) } : {}),
    },
    ...opts,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error || 'Request failed');
  }

  return response.json().catch(() => ({}));
}

export async function listClubs(query: { query?: string; location?: string; joinPolicy?: string; verified?: boolean; limit?: number; offset?: number } = {}) {
  const params = new URLSearchParams();
  if (query.query) params.append('query', query.query);
  if (query.location) params.append('location', query.location);
  if (query.joinPolicy) params.append('joinPolicy', query.joinPolicy);
  if (query.verified !== undefined) params.append('verified', String(query.verified));
  params.append('limit', String(query.limit ?? 20));
  params.append('offset', String(query.offset ?? 0));

  const data = await authFetch(`/auth/clubs?${params.toString()}`);
  return data?.clubs ?? [];
}

export async function getClub(clubId: number) {
  const data = await authFetch(`/auth/clubs/${clubId}`);
  return data?.club ?? data;
}

export async function getMyClubMemberships() {
  const data = await authFetch('/auth/clubs/memberships/me');
  return data?.memberships ?? [];
}

export async function createClub(payload: any) {
  return authFetch('/auth/clubs', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateClub(clubId: number, payload: any) {
  return authFetch(`/auth/clubs/${clubId}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function joinClub(clubId: number) {
  return authFetch(`/auth/clubs/${clubId}/join`, { method: 'POST' });
}

export async function requestJoinClub(clubId: number) {
  return authFetch(`/auth/clubs/${clubId}/join-requests`, { method: 'POST' });
}

export async function listJoinRequests(clubId: number) {
  const data = await authFetch(`/auth/clubs/${clubId}/join-requests`);
  return data?.requests ?? [];
}

export async function reviewJoinRequest(clubId: number, requestId: number, status: 'approved' | 'rejected') {
  return authFetch(`/auth/clubs/${clubId}/join-requests/${requestId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function listClubTrainings(clubId: number) {
  const data = await authFetch(`/auth/clubs/${clubId}/trainings`);
  return data?.trainings ?? [];
}

export async function createClubTraining(clubId: number, payload: any) {
  return authFetch(`/auth/clubs/${clubId}/trainings`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function addClubTrainingToCalendar(clubId: number, trainingId: number) {
  return authFetch(`/auth/clubs/${clubId}/trainings/${trainingId}/add-to-calendar`, { method: 'POST' });
}

export async function uploadClubAvatar(clubId: number, payload: FormData) {
  const token = await getToken();
  const activeProfileId = await getActiveProfileId();

  const response = await fetch(`${ServerIP}/auth/clubs/${clubId}/avatar`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(activeProfileId ? { 'X-Profile-Id': String(activeProfileId) } : {}),
    },
    body: payload,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error || 'Request failed');
  }

  return response.json().catch(() => ({}));
}

export async function uploadClubCover(clubId: number, payload: FormData) {
  const token = await getToken();
  const activeProfileId = await getActiveProfileId();

  const response = await fetch(`${ServerIP}/auth/clubs/${clubId}/cover`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(activeProfileId ? { 'X-Profile-Id': String(activeProfileId) } : {}),
    },
    body: payload,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error || 'Request failed');
  }

  return response.json().catch(() => ({}));
}

export async function leaveClub(clubId: number) {
  return authFetch(`/auth/clubs/${clubId}/leave`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export async function getClubMembers(clubId: number, offset = 0, limit = 50) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const data = await authFetch(`/auth/clubs/${clubId}/members?${params.toString()}`);
  return data?.members ?? [];
}

export async function updateMemberRole(clubId: number, profileId: number, role: string) {
  return authFetch(`/auth/clubs/${clubId}/members/${profileId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function removeMember(clubId: number, profileId: number) {
  return authFetch(`/auth/clubs/${clubId}/members/${profileId}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Club posts
// ---------------------------------------------------------------------------

export async function getClubPosts(clubId: number, offset = 0, limit = 20) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const data = await authFetch(`/auth/clubs/${clubId}/posts?${params.toString()}`);
  return data?.posts ?? [];
}

export async function createClubPost(
  clubId: number,
  description?: string,
  imageUri?: string,
  videoUri?: string
) {
  const token = await getToken();
  const activeProfileId = await getActiveProfileId();

  const formData = new FormData();
  if (description) formData.append('description', description);

  if (imageUri) {
    const filename = imageUri.split('/').pop() || 'post-image.jpg';
    const extension = filename.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeTypes: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
    formData.append('image', { uri: imageUri, type: mimeTypes[extension] || 'image/jpeg', name: filename } as any);
  }

  if (videoUri) {
    const filename = videoUri.split('/').pop() || 'post-video.mp4';
    const extension = filename.split('.').pop()?.toLowerCase() || 'mp4';
    const mimeTypes: Record<string, string> = { mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo', webm: 'video/webm' };
    formData.append('video', { uri: videoUri, type: mimeTypes[extension] || 'video/mp4', name: filename } as any);
  }

  const response = await fetch(`${ServerIP}/auth/clubs/${clubId}/posts`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(activeProfileId ? { 'X-Profile-Id': String(activeProfileId) } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to create club post');
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// Club training plans
// ---------------------------------------------------------------------------

export async function getClubTrainingPlans(clubId: number) {
  const data = await authFetch(`/auth/clubs/${clubId}/training-plans`);
  return data?.plans ?? [];
}

export async function getClubSelectedCalendar(clubId: number) {
  return authFetch(`/auth/clubs/${clubId}/calendar/selected`);
}

export async function createClubTrainingPlan(clubId: number, payload: { title: string; description?: string }) {
  const data = await authFetch(`/auth/clubs/${clubId}/training-plans`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data?.plan ?? data;
}

export async function copyClubTrainingPlan(clubId: number, planId: number) {
  const data = await authFetch(`/auth/clubs/${clubId}/training-plans/${planId}/copy`, { method: 'POST' });
  return data?.plan ?? data;
}

export async function selectClubCalendar(clubId: number, calendarId: number) {
  return authFetch(`/auth/clubs/${clubId}/calendars/${calendarId}/select`, { method: 'POST' });
}

export async function createClubCalendarFull(clubId: number, payload: {
  title: string;
  calendar_type: 'day' | 'order';
  num_weeks?: number;
  order_start_date?: string | null;
  slots: Array<{
    type: 'training' | 'rest' | 'special_event';
    order?: number;
    week_number?: number;
    day_of_week?: number;
    id_trainings?: number;
    start_time?: string | null;
    event_title?: string;
    event_description?: string;
    event_starts_at?: string;
    event_ends_at?: string;
  }>;
}) {
  return authFetch(`/auth/clubs/${clubId}/training-plans/full`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
