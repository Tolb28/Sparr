import React, { createContext, useCallback, useContext, useMemo, useRef, useState, useEffect } from 'react';
import { getActiveProfileId } from '@/src/api/profileHandler';
import { getBadgeCatalog } from '@/src/api/gamification';
import {
  getProgressByTimeframe,
  ProgressMetrics,
  ProgressTimeframe,
  Snapshot,
} from '@/src/api/progress';

export interface ProgressBadge {
  id_badges: number;
  title: string;
  description: string;
  icon_path: string;
  icon_name: string;
  color: string;
  metric_key?: string;
  threshold?: number;
  rule_window?: string;
  earned: boolean;
  current_value?: number;
  progress?: number;
}

export interface ProgressContextValue {
  timeframe: ProgressTimeframe;
  metrics: ProgressMetrics | null;
  snapshots: Snapshot[];
  badges: ProgressBadge[];
  loading: boolean;
  error: string | null;
  lastRefresh: number | null;
  setTimeframe: (timeframe: ProgressTimeframe) => void;
  refresh: (force?: boolean) => Promise<void>;
}

const CACHE_TTL_MS = 60 * 60 * 1000;
const ProgressContext = createContext<ProgressContextValue | undefined>(undefined);

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWithRetry<T>(operation: () => Promise<T>, retries = 1) {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt >= retries) break;
      await delay(400 * (attempt + 1));
    }
  }
  throw lastError ?? new Error('Failed to load progress data.');
}

export const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [timeframe, setTimeframe] = useState<ProgressTimeframe>('week');
  const [metrics, setMetrics] = useState<ProgressMetrics | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [badges, setBadges] = useState<ProgressBadge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);

  const refreshHistory = useRef<Record<ProgressTimeframe, number | undefined>>({
    week: undefined,
    month: undefined,
    year: undefined,
    lifetime: undefined,
  });

  const loadProgress = useCallback(
    async (selectedTimeframe: ProgressTimeframe, force = false) => {
      const cachedAt = refreshHistory.current[selectedTimeframe];
      const isFresh = !force && cachedAt && Date.now() - cachedAt < CACHE_TTL_MS;
      if (isFresh) {
        try {
          const profileId = await getActiveProfileId();
          if (!profileId) {
            setMetrics(null);
            setSnapshots([]);
            setBadges([]);
            setLastRefresh(null);
            setError('No active profile selected.');
            return;
          }

          const progress = await getProgressByTimeframe(String(profileId), selectedTimeframe);
          setMetrics(progress.metrics);
          setSnapshots(progress.snapshots);
          setLastRefresh(cachedAt ?? null);
          setError(null);
          return;
        } catch {
          // Fall through to force reload if cached read fails.
        }
      }

      setLoading(true);
      setError(null);

      try {
        const profileId = await getActiveProfileId();
        if (!profileId) {
          setMetrics(null);
          setSnapshots([]);
          setBadges([]);
          setLastRefresh(null);
          setError('No active profile selected.');
          return;
        }

        const progress = await runWithRetry(() => getProgressByTimeframe(String(profileId), selectedTimeframe));
        let badgeData: ProgressBadge[] = [];
        try {
          const catalog = await runWithRetry(() => getBadgeCatalog());
          badgeData = Array.isArray(catalog)
            ? catalog.map((badge: any) => ({
              ...badge,
              earned: Boolean(badge?.earned),
            }))
            : [];
        } catch {
          badgeData = [];
        }

        setMetrics(progress.metrics);
        setSnapshots(progress.snapshots);
        setBadges(badgeData);

        const now = Date.now();
        refreshHistory.current[selectedTimeframe] = now;
        setLastRefresh(now);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load progress data.';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const refresh = useCallback(async (force = true) => {
    await loadProgress(timeframe, force);
  }, [loadProgress, timeframe]);

  useEffect(() => {
    loadProgress(timeframe);
  }, [loadProgress, timeframe]);

  const value = useMemo(
    () => ({
      timeframe,
      metrics,
      snapshots,
      badges,
      loading,
      error,
      lastRefresh,
      setTimeframe,
      refresh,
    }),
    [timeframe, metrics, snapshots, badges, loading, error, lastRefresh, refresh]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
};

export function useProgress(): ProgressContextValue {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within a ProgressProvider.');
  }
  return context;
}

export function useProgressRefresh() {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgressRefresh must be used within a ProgressProvider.');
  }

  return async () => {
    await context.refresh(true);
  };
}

export function useTimeframeToggle() {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useTimeframeToggle must be used within a ProgressProvider.');
  }

  return (nextTimeframe: ProgressTimeframe) => {
    context.setTimeframe(nextTimeframe);
  };
}
