import { getToken, ServerIP } from './tokenHandler';
import { getActiveProfileId } from './profileHandler';


async function authFetch(path: string, opts: RequestInit = {}) {
  const token = await getToken();
  const activeProfileId = await getActiveProfileId();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (activeProfileId) headers['X-Profile-Id'] = String(activeProfileId);
  const response = await fetch(`${ServerIP}${path}`, {
    headers,
    ...opts,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error || 'Request failed');
  }
  return response.json().catch(() => ({}));
}

// ---------------------------------------------------------------------------
// Calendars
// ---------------------------------------------------------------------------

export async function getSelectedCalendarForProfile() {
  return authFetch('/auth/training/calendars/selected');
}

export async function listPublicCalendars() {
  return authFetch('/auth/training/calendars/public');
}

export async function listUserCalendars() {
  return authFetch('/auth/training/calendars/mine');
}

export async function createCalendar(payload: any) {
  return authFetch('/auth/training/calendars', { method: 'POST', body: JSON.stringify(payload) });
}

export async function selectCalendar(id: number) {
  return authFetch(`/auth/training/calendars/${id}/select`, { method: 'POST' });
}

export async function getCalendarById(id: number) {
  return authFetch(`/auth/training/calendars/${id}`);
}

export async function getCalendarPreview(id: number) {
  return authFetch(`/auth/training/calendars/${id}/preview`);
}

export async function updateCalendarApi(
  id: number,
  payload: {
    title?: string;
    privacy?: string;
    calendar_type?: string;
    num_weeks?: number;
    order_start_date?: string | null;
    replace_trainings?: boolean;
  }
) {
  return authFetch(`/auth/training/calendars/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteCalendarApi(id: number) {
  return authFetch(`/auth/training/calendars/${id}`, { method: 'DELETE' });
}

export async function addTrainingToCalendar(calendarId: number, payload: any) {
  return authFetch(`/auth/training/calendars/${calendarId}/trainings`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function removeTrainingFromCalendar(calendarId: number, itemId: number) {
  return authFetch(`/auth/training/calendars/${calendarId}/trainings/${itemId}`, { method: 'DELETE' });
}

export async function reorderCalendarTrainings(calendarId: number, orderedIds: number[]) {
  return authFetch(`/auth/training/calendars/${calendarId}/trainings/reorder`, {
    method: 'PUT', body: JSON.stringify({ orderedIds }),
  });
}

// ---------------------------------------------------------------------------
// Trainings
// ---------------------------------------------------------------------------

export async function getTraining(id: number) {
  return authFetch(`/auth/training/trainings/${id}`);
}

export async function getTrainings() {
  return authFetch('/auth/training/trainings');
}

export async function createTraining(payload: { title: string; description?: string }) {
  return authFetch('/auth/training/trainings', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateTrainingApi(id: number, payload: { title?: string; description?: string }) {
  return authFetch(`/auth/training/trainings/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteTrainingApi(id: number) {
  return authFetch(`/auth/training/trainings/${id}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Training components
// ---------------------------------------------------------------------------

export async function addTrainingComponent(trainingId: number, payload: any) {
  return authFetch(`/auth/training/trainings/${trainingId}/components`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateTrainingComponent(compId: number, payload: any) {
  return authFetch(`/auth/training/trainings/components/${compId}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteTrainingComponent(compId: number) {
  return authFetch(`/auth/training/trainings/components/${compId}`, { method: 'DELETE' });
}

export async function reorderTrainingComponents(trainingId: number, orderedIds: number[]) {
  return authFetch(`/auth/training/trainings/${trainingId}/components/reorder`, {
    method: 'PUT', body: JSON.stringify({ orderedIds }),
  });
}

// ---------------------------------------------------------------------------
// Drills / Techniques / Combinations
// ---------------------------------------------------------------------------

export async function listDrills() {
  return authFetch('/auth/training/drills');
}

export async function listTechniques() {
  return authFetch('/auth/training/techniques');
}

export async function listCombinations() {
  return authFetch('/auth/training/combinations');
}
