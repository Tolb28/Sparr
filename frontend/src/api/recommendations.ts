import { getToken, ServerIP } from './tokenHandler';
import { getProfile } from './profileHandler';

export interface NearbyClub {
  idclubs: number;
  title: string;
  location: string;
  members_count: number;
  avatar_url: string | null;
  join_policy: string;
}

export interface PopularTraining {
  id_trainings: number;
  title: string;
  description: string | null;
  popularity: number;
}

export interface SuggestedBoxer {
  id_profiles: number;
  display_name: string;
  username: string;
  location: string | null;
  title_style: string | null;
  title_weight: string | null;
  avatar_url: string | null;
}

export interface PopularCalendar {
  id_training_calendar: number;
  calendar_name: string;
  creator_name: string;
  creator_avatar?: string;
  subscriber_count: number;
  training_count: number;
}

export interface Recommendations {
  nearbyClubs: NearbyClub[];
  popularTrainings: PopularTraining[];
  suggestedBoxers: SuggestedBoxer[];
  popularCalendars: PopularCalendar[];
}

export async function getRecommendations(): Promise<Recommendations> {
  const token = await getToken();
  const profileData = await getProfile();
  const profile = profileData ? JSON.parse(profileData) : null;
  const profileId = profile?.id_profiles;

  const response = await fetch(`${ServerIP}/auth/discovery/recommendations`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(profileId ? { 'X-Profile-Id': String(profileId) } : {}),
    },
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data?.message || 'Failed to load recommendations');
  }

  return data.recommendations;
}
