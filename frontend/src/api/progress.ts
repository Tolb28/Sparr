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

export interface HoursBreakdownEntry {
  date: string;
  hours: number;
}

export async function fetchHoursBreakdown(
  profileId: string,
  timeframe: ProgressTimeframe
): Promise<HoursBreakdownEntry[]> {
  const response = await fetchWithRetry(
    `${ServerIP}/auth/gamification/profiles/${profileId}/hours-breakdown?range=${timeframe}`,
    {
      method: 'GET',
      headers: await buildAuthHeaders({ 'Content-Type': 'application/json' }),
    }
  );
  return (response as any)?.breakdown ?? [];
}

export interface SessionsBreakdownEntry {
  date: string;
  count: number;
}

const offsetMap: Record<ProgressTimeframe, number> = { week: 7, month: 30, year: 365, lifetime: 3650 };

export async function fetchSessionsBreakdown(
  profileId: string,
  timeframe: ProgressTimeframe,
  compare = false
): Promise<SessionsBreakdownEntry[]> {
  const offset = compare ? (offsetMap[timeframe] ?? 7) : 0;
  const response = await fetchWithRetry(
    `${ServerIP}/auth/gamification/profiles/${profileId}/sessions-breakdown?range=${timeframe}&offset=${offset}`,
    {
      method: 'GET',
      headers: await buildAuthHeaders({ 'Content-Type': 'application/json' }),
    }
  );
  return (response as any)?.breakdown ?? [];
}

export interface DailySeriesPoint {
  /** ISO date (YYYY-MM-DD) for daily buckets, or YYYY-MM for monthly buckets. */
  key: string;
  /** Display label, e.g. "Mon", "Apr 16", "Apr". */
  label: string;
  value: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toLocalDate(dateStr: string): Date | null {
  // Parse YYYY-MM-DD as a local date (avoid UTC shift from `new Date('YYYY-MM-DD')`).
  const [y, m, d] = dateStr.split('-').map((n) => Number(n));
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDayLabel(date: Date, timeframe: ProgressTimeframe): string {
  if (timeframe === 'week') return date.toLocaleDateString(undefined, { weekday: 'short' });
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * 'sum' for additive metrics (sessions, hours); 'last' for level/running metrics
 * (streak_days, score) where summing a bucket would be meaningless.
 */
export type SeriesAggregate = 'sum' | 'last';

/**
 * Builds a continuous series for the selected timeframe, zero-filling missing days so
 * charts have a sensible, gap-free axis. Week/month bucket by day; year/lifetime bucket
 * by month (to avoid 365/3650-point arrays). Entries outside the window are ignored.
 */
export function buildDailySeries<T>(
  timeframe: ProgressTimeframe,
  entries: T[],
  getDate: (entry: T) => string,
  getValue: (entry: T) => number,
  aggregate: SeriesAggregate = 'sum',
  today: Date = new Date()
): DailySeriesPoint[] {
  const anchor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const byKey = new Map<string, { value: number; dateMs: number }>();
  for (const entry of entries) {
    const d = toLocalDate(getDate(entry));
    if (!d) continue;
    const key =
      timeframe === 'week' || timeframe === 'month'
        ? getDate(entry).slice(0, 10)
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const value = getValue(entry);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { value, dateMs: d.getTime() });
    } else if (aggregate === 'sum') {
      existing.value += value;
    } else if (d.getTime() >= existing.dateMs) {
      existing.value = value;
      existing.dateMs = d.getTime();
    }
  }

  // Daily buckets for week (7) and month (30).
  if (timeframe === 'week' || timeframe === 'month') {
    const span = timeframe === 'week' ? 7 : 30;
    const points: DailySeriesPoint[] = [];
    for (let i = span - 1; i >= 0; i -= 1) {
      const date = new Date(anchor.getTime() - i * DAY_MS);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      points.push({
        key,
        label: formatDayLabel(date, timeframe),
        value: byKey.get(key)?.value ?? 0,
      });
    }
    return points;
  }

  // Monthly buckets for year (12) and lifetime (12, trailing year).
  const points: DailySeriesPoint[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const date = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    points.push({
      key,
      label: date.toLocaleDateString(undefined, { month: 'short' }),
      value: byKey.get(key)?.value ?? 0,
    });
  }
  return points;
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
