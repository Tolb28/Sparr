import { Platform } from 'react-native';
import { getToken, ServerIP } from './tokenHandler';
import { buildAuthHeaders } from './profile';

export async function getDrillsGrouped() {
  const token = await getToken();
  const response = await fetch(`${ServerIP}/auth/training/drills/grouped`, {
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
    throw new Error(errorMessage || 'Failed to fetch drills');
  }

  return response.json();
}

export async function getCombinationsGrouped() {
  const token = await getToken();
  const response = await fetch(`${ServerIP}/auth/training/combinations/grouped`, {
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
    throw new Error(errorMessage || 'Failed to fetch combinations');
  }

  return response.json();
}

export async function getTechniquesGrouped() {
  const token = await getToken();
  const response = await fetch(`${ServerIP}/auth/training/techniques/grouped`, {
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
    throw new Error(errorMessage || 'Failed to fetch techniques');
  }

  return response.json();
}

export async function getTechnique(id: number) {
  const token = await getToken();
  const response = await fetch(`${ServerIP}/auth/training/techniques/${id}`, {
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
    throw new Error(errorMessage || 'Failed to fetch technique');
  }

  return response.json();
}

export async function getDrill(id: number) {
  const token = await getToken();
  const response = await fetch(`${ServerIP}/auth/training/drills/${id}`, {
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
    throw new Error(errorMessage || 'Failed to fetch drill');
  }

  return response.json();
}

export async function getCombination(id: number) {
  const token = await getToken();
  const response = await fetch(`${ServerIP}/auth/training/combinations/${id}`, {
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
    throw new Error(errorMessage || 'Failed to fetch combination');
  }

  return response.json();
}

export type RecommendedContentType = 'technique' | 'drill' | 'combination';
export type RecommendedContentFilter = 'all' | 'techniques' | 'drills' | 'combinations';

export interface RecommendedContentItem {
  content_type: RecommendedContentType;
  content_id: number;
  title: string;
  description: string | null;
  category_name: string | null;
  score: number;
  popularity: number;
  reasons: string[];
  source_url: string | null;
  video_url: string | null;
}

export interface TrainingContentRecommendations {
  techniques: RecommendedContentItem[];
  drills: RecommendedContentItem[];
  combinations: RecommendedContentItem[];
}

export async function getTrainingContentRecommendations(
  contentType: RecommendedContentFilter = 'all',
  limitPerType: number = 6,
  includeReasons: boolean = true
): Promise<TrainingContentRecommendations> {
  const query = new URLSearchParams({
    contentType,
    limitPerType: String(limitPerType),
    includeReasons: String(includeReasons),
  });

  const response = await fetch(`${ServerIP}/auth/training/recommendations?${query.toString()}`, {
    method: 'GET',
    headers: await buildAuthHeaders({
      'Content-Type': 'application/json',
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
    throw new Error(errorMessage || 'Failed to fetch personalized recommendations');
  }

  const data = await response.json();
  return data?.recommendations || { techniques: [], drills: [], combinations: [] };
}

export type FavoriteContentType = 'technique' | 'drill' | 'combination';

export async function getUserFavorites(contentType?: FavoriteContentType): Promise<Array<{ content_type: FavoriteContentType; content_id: number }>> {
  const headers = await buildAuthHeaders({
    'Content-Type': 'application/json',
  });

  const query = contentType ? `?contentType=${contentType}` : '';
  const response = await fetch(`${ServerIP}/auth/training/favorites${query}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      throw new Error(`Server error: ${response.statusText}`);
    }
    const errorMessage = errorData?.error || errorData?.message;
    throw new Error(errorMessage || 'Failed to fetch favorites');
  }

  return response.json();
}

export async function addFavorite(contentType: FavoriteContentType, contentId: number): Promise<void> {
  const headers = await buildAuthHeaders({
    'Content-Type': 'application/json',
  });

  const response = await fetch(`${ServerIP}/auth/training/favorites/${contentType}/${contentId}`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      throw new Error(`Server error: ${response.statusText}`);
    }
    const errorMessage = errorData?.error || errorData?.message;
    throw new Error(errorMessage || 'Failed to add favorite');
  }
}

export async function removeFavorite(contentType: FavoriteContentType, contentId: number): Promise<void> {
  const headers = await buildAuthHeaders({
    'Content-Type': 'application/json',
  });

  const response = await fetch(`${ServerIP}/auth/training/favorites/${contentType}/${contentId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      throw new Error(`Server error: ${response.statusText}`);
    }
    const errorMessage = errorData?.error || errorData?.message;
    throw new Error(errorMessage || 'Failed to remove favorite');
  }
}
