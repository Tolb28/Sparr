import { getToken, ServerIP } from './tokenHandler';
import { getActiveProfileId } from './profileHandler';

export interface BoxingStyle {
  id_boxing_style: number;
  title_style: string;
}

export interface WeightClass {
  id_weight_class: number;
  title_weight: string;
}

export interface References {
  boxing_styles: BoxingStyle[];
  weight_classes: WeightClass[];
}

async function buildAuthHeaders(base: Record<string, string> = {}) {
  const token = await getToken();
  const activeProfileId = await getActiveProfileId();
  const headers: Record<string, string> = { ...base };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (activeProfileId) {
    headers['X-Profile-Id'] = String(activeProfileId);
  }
  return headers;
}

export const getReferences = async (): Promise<References> => {
  const response = await fetch(`${ServerIP}/auth/profile/references`, {
    method: 'GET',
    headers: await buildAuthHeaders({
      'Content-Type': 'application/json',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch references');
  }

  const data = await response.json();
  return data.data || data;
};

// Backward-compatible alias
export const getProfileReferences = getReferences;
