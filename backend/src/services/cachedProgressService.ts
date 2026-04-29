import { cacheService } from './cacheService';
import { logError } from './errorService';
import { getProfileProgress } from './gamificationService';

const DEFAULT_TTL_MS = 3600000;
const cacheTtlMs = Number(process.env.CACHE_TTL_MS) > 0 ? Number(process.env.CACHE_TTL_MS) : DEFAULT_TTL_MS;

const logCacheEvent = (event: 'cache_hit' | 'cache_miss', profileId: number, range: string) => {
  console.log(event, { profileId, range, timestamp: new Date().toISOString() });
};

export async function getProfileProgressCached(profileId: number, range: string) {
  const cacheKey = `progress:${profileId}:${range}`;

  const cached = await cacheService.get(cacheKey);
  if (cached) {
    try {
      logCacheEvent('cache_hit', profileId, range);
      return JSON.parse(cached);
    } catch (error) {
      await cacheService.del(cacheKey);
      logError(error, { profileId, endpoint: 'getProfileProgressCached' });
    }
  }

  const progress = await getProfileProgress(profileId, range as any);
  await cacheService.set(cacheKey, JSON.stringify(progress), cacheTtlMs);
  logCacheEvent('cache_miss', profileId, range);

  return progress;
}
