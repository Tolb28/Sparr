import { Platform } from 'react-native';
import { getToken, ServerIP } from './tokenHandler';


async function authFetch(path: string, opts: RequestInit = {}) {
  const token = await getToken();
  const response = await fetch(`${ServerIP}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...opts,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error || 'Request failed');
  }
  return response.json().catch(() => ({}));
}

export async function getSelectedCalendarForProfile() {
  return authFetch('/auth/training/calendars/selected');
}

export async function listPublicCalendars() {
  const token = await getToken();
  const response = await fetch(`${ServerIP}/auth/training/calendars/public`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!response.ok) throw new Error('Failed to list public calendars');
  return response.json();
}

export async function createCalendar(payload: any) {
  return authFetch('/auth/training/calendars', { method: 'POST', body: JSON.stringify(payload) });
}

export async function selectCalendar(id: number) {
  return authFetch(`/auth/training/calendars/${id}/select`, { method: 'POST' });
}

export async function getCalendarById(id: number) {
  const token = await getToken();
  const response = await fetch(`${ServerIP}/auth/training/calendars/${id}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!response.ok) throw new Error('Failed to fetch calendar');
  return response.json();
}

export async function getTraining(id: number) {
  const token = await getToken();
  const response = await fetch(`${ServerIP}/auth/training/trainings/${id}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!response.ok) throw new Error('Failed to fetch training');
  return response.json();
}

export async function getTrainings() {
  const token = await getToken();
  const response = await fetch(`${ServerIP}/auth/training/trainings`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!response.ok) throw new Error('Failed to fetch trainings');
  return response.json();
}

export async function listDrills() {
  const token = await getToken();
  const response = await fetch(`${ServerIP}/auth/training/drills`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!response.ok) throw new Error('Failed to fetch drills');
  return response.json();
}

export async function listTechniques() {
  const token = await getToken();
  const response = await fetch(`${ServerIP}/auth/training/techniques`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!response.ok) throw new Error('Failed to fetch techniques');
  return response.json();
}

export async function listCombinations() {
  const token = await getToken();
  const response = await fetch(`${ServerIP}/auth/training/combinations`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!response.ok) throw new Error('Failed to fetch combinations');
  return response.json();
}

export async function createTraining(payload: any) {
  return authFetch('/auth/training/trainings', { method: 'POST', body: JSON.stringify(payload) });
}

export async function addTrainingComponent(trainingId: number, payload: any) {
  return authFetch(`/auth/training/trainings/${trainingId}/components`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function addTrainingToCalendar(calendarId: number, payload: any) {
  return authFetch(`/auth/training/calendars/${calendarId}/trainings`, { method: 'POST', body: JSON.stringify(payload) });
}
