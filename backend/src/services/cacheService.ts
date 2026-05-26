import { createClient, RedisClientType } from 'redis';

export interface CacheService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs: number): Promise<void>;
  del(key: string): Promise<void>;
  delPattern(pattern: string): Promise<void>;
  isAvailable(): boolean;
}

const patternToRegex = (pattern: string) => {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
};

class MemoryCacheService implements CacheService {
  private store = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const regex = patternToRegex(pattern);
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  isAvailable(): boolean {
    return true;
  }
}

export class RedisCacheService implements CacheService {
  private client: RedisClientType;
  private available = false;

  constructor(private url: string) {
    this.client = createClient({ url: this.url });
    this.client.on('error', (error) => {
      this.available = false;
      console.error('Redis error', { error: error instanceof Error ? error.message : String(error) });
    });
  }

  async connect(): Promise<boolean> {
    try {
      await this.client.connect();
      this.available = true;
      return true;
    } catch (error) {
      this.available = false;
      console.error('Redis connection failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  async get(key: string): Promise<string | null> {
    if (!this.available) return null;
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    if (!this.available) return;
    await this.client.set(key, value, { PX: ttlMs });
  }

  async del(key: string): Promise<void> {
    if (!this.available) return;
    await this.client.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.available) return;
    const keys: string[] = [];
    for await (const key of this.client.scanIterator({ MATCH: pattern })) {
      keys.push(key);
      if (keys.length >= 100) {
        await this.client.del(keys);
        keys.length = 0;
      }
    }
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }
}

let cacheService: CacheService = new MemoryCacheService();

const logBackend = (backend: 'redis' | 'memory') => {
  console.log('Cache backend', { backend, timestamp: new Date().toISOString() });
};

const redisUrl = process.env.REDIS_URL;
if (redisUrl) {
  const redisCache = new RedisCacheService(redisUrl);
  redisCache
    .connect()
    .then((connected) => {
      if (connected) {
        cacheService = redisCache;
        logBackend('redis');
      } else {
        logBackend('memory');
      }
    })
    .catch(() => {
      logBackend('memory');
    });
} else {
  logBackend('memory');
}

export { cacheService, MemoryCacheService };
