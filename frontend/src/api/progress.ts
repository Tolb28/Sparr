import { buildAuthHeaders } from './profile';
import { ServerIP } from './tokenHandler';

export type ProgressTimeframe = 'week' | 'month' | 'year' | 'lifetime';

export interface ProgressMetrics {
  workouts_completed: number;
  club_sessions: number;
  streak_days: number;
  interactions_count: number;
  clubs_joined: number;
  posts_created: number;
  friends_count: number;
  score: number;
  total_hours: number;
}

export interface Snapshot {
  snapshot_date: string;
  workouts_completed: number;
  club_sessions: number;
  streak_days: number;
  interactions_count: number;
  score: number;
}

export interface ProgressData {
  range: ProgressTimeframe;
  metrics: ProgressMetrics;
  snapshots: Snapshot[];
}

export interface ProgressDelta {
  delta: number;
  percent: number;
  trend: 'up' | 'down' | 'flat';
}

export interface NormalizedSnapshot extends Snapshot {
  normalized: Record<string, number>;
}

const CACHE_TTL_MS = 60 * 60 * 1000;
const progressCache = new Map<string, { data: ProgressData; expiresAt: number }>();

const metricDefaults: ProgressMetrics = {
  workouts_completed: 0,
  club_sessions: 0,
  streak_days: 0,
  interactions_count: 0,
  clubs_joined: 0,
  posts_created: 0,
  friends_count: 0,
  score: 0,
  total_hours: 0,
};

function getCacheKey(profileId: string, timeframe: ProgressTimeframe) {
  return `${profileId}:${timeframe}`;
}

function normalizeMetrics(raw: Partial<ProgressMetrics> | null | undefined): ProgressMetrics {
  return {
    workouts_completed: Number(raw?.workouts_completed ?? 0),
    club_sessions: Number(raw?.club_sessions ?? 0),
    streak_days: Number(raw?.streak_days ?? 0),
    interactions_count: Number(raw?.interactions_count ?? 0),
    clubs_joined: Number(raw?.clubs_joined ?? 0),
    posts_created: Number(raw?.posts_created ?? 0),
    friends_count: Number(raw?.friends_count ?? 0),
    score: Number(raw?.score ?? 0),
    total_hours: Number(raw?.total_hours ?? 0),
  };
}

function normalizeSnapshot(raw: Partial<Snapshot> | null | undefined): Snapshot {
  return {
    snapshot_date: String(raw?.snapshot_date ?? ''),
    workouts_completed: Number(raw?.workouts_completed ?? 0),
    club_sessions: Number(raw?.club_sessions ?? 0),
    streak_days: Number(raw?.streak_days ?? 0),
    interactions_count: Number(raw?.interactions_count ?? 0),
    score: Number(raw?.score ?? 0),
  };
}

function parseProgressResponse(raw: any, fallbackRange: ProgressTimeframe): ProgressData {
  const rawRange = String(raw?.range ?? '').toLowerCase();
  const normalizedRange =
    rawRange === 'weekly'
      ? 'week'
      : rawRange === 'monthly'
        ? 'month'
        : rawRange;
  const snapshots: Snapshot[] = Array.isArray(raw?.snapshots)
    ? (raw.snapshots as Array<Partial<Snapshot> | null | undefined>)
      .map((snapshot) => normalizeSnapshot(snapshot))
      .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
    : [];
  return {
    range: (normalizedRange as ProgressTimeframe) || fallbackRange,
    metrics: normalizeMetrics(raw?.metrics ?? metricDefaults),
    snapshots,
  };
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 2) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error || errorData?.message || `Request failed (${response.status})`;
        const error = new Error(message);
        if (response.status >= 500 && attempt < retries) {
          lastError = error;
          await delay(400 * (attempt + 1));
          continue;
        }
        throw error;
      }
      return response.json().catch(() => ({}));
    } catch (error) {
      lastError = error as Error;
      if (attempt >= retries) break;
      await delay(400 * (attempt + 1));
    }
  }

  throw lastError ?? new Error('Failed to fetch progress data.');
}

export async function getProgressByTimeframe(
  profileId: string,
  timeframe: ProgressTimeframe
): Promise<ProgressData> {
  const cacheKey = getCacheKey(profileId, timeframe);
  const cached = progressCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const response = await fetchWithRetry(
    `${ServerIP}/auth/gamification/profiles/${profileId}/progress?range=${timeframe}`,
    {
      method: 'GET',
      headers: await buildAuthHeaders({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      }),
    }
  );

  const parsed = parseProgressResponse(response, timeframe);
  progressCache.set(cacheKey, { data: parsed, expiresAt: Date.now() + CACHE_TTL_MS });
  return parsed;
}

export function aggregateMetrics(snapshots: Snapshot[]): ProgressMetrics {
  if (!snapshots.length) return { ...metricDefaults };

  const totals = snapshots.reduce(
    (acc, snapshot) => {
      acc.workouts_completed += snapshot.workouts_completed;
      acc.club_sessions += snapshot.club_sessions;
      acc.interactions_count += snapshot.interactions_count;
      acc.streak_days = Math.max(acc.streak_days, snapshot.streak_days);
      acc.score = snapshot.score;
      return acc;
    },
    { ...metricDefaults }
  );

  return totals;
}

export function calculateMetricDelta(current: number, previous: number): ProgressDelta {
  const delta = current - previous;
  const percent =
    previous === 0 ? (current === 0 ? 0 : 100) : Math.round((delta / previous) * 100);
  const trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  return { delta, percent, trend };
}

export function normalizeMetricsForChart(
  snapshots: Snapshot[],
  minVal?: number,
  maxVal?: number
): NormalizedSnapshot[] {
  if (!snapshots.length) return [];

  const metricKeys = Object.keys(snapshots[0]).filter((key) => key !== 'snapshot_date');
  const minByKey: Record<string, number> = {};
  const maxByKey: Record<string, number> = {};

  metricKeys.forEach((key) => {
    if (minVal !== undefined) {
      minByKey[key] = minVal;
    } else {
      minByKey[key] = Math.min(...snapshots.map((snap) => Number((snap as any)[key] ?? 0)));
    }

    if (maxVal !== undefined) {
      maxByKey[key] = maxVal;
    } else {
      maxByKey[key] = Math.max(...snapshots.map((snap) => Number((snap as any)[key] ?? 0)));
    }
  });

  return snapshots.map((snapshot) => {
    const normalized: Record<string, number> = {};
    metricKeys.forEach((key) => {
      const value = Number((snapshot as any)[key] ?? 0);
      const min = minByKey[key];
      const max = maxByKey[key];
      normalized[key] = max === min ? 0 : (value - min) / (max - min);
    });
    return { ...snapshot, normalized };
  });
}
