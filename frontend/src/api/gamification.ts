import { buildAuthHeaders } from './profile';
import { ServerIP } from './tokenHandler';

async function authFetch(path: string, opts: RequestInit = {}) {
  const headers = await buildAuthHeaders({
    'Content-Type': 'application/json',
  });
  const response = await fetch(`${ServerIP}${path}`, {
    ...opts,
    headers: {
      ...headers,
      ...(opts.headers as Record<string, string> | undefined),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error || 'Request failed');
  }

  return response.json().catch(() => ({}));
}

export async function getBadgeCatalog() {
  const data = await authFetch('/auth/gamification/badges/catalog');
  return data?.badges ?? [];
}

export async function getProfileBadges(profileId: number) {
  const data = await authFetch(`/auth/gamification/profiles/${profileId}/badges`);
  return data?.badges ?? [];
}

export async function getProfileProgress(profileId: number, range: 'weekly' | 'monthly' = 'weekly') {
  return authFetch(`/auth/gamification/profiles/${profileId}/progress?range=${range}`);
}

export async function recalculateGamification(profileId: number) {
  return authFetch(`/auth/gamification/recalculate/${profileId}`, { method: 'POST' });
}

export async function logWorkoutCompletion(trainingId: number | null, durationSeconds: number | null) {
  return authFetch('/auth/gamification/complete', {
    method: 'POST',
    body: JSON.stringify({ training_id: trainingId, duration_seconds: durationSeconds }),
  });
}
