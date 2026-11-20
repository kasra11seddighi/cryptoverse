// Provides an in-memory TTL cache with request coalescing and stale-on-error fallback.

export interface CacheResult<T> {
  value: T;
  /** Epoch ms when the value was loaded from its source. */
  fetchedAt: number;
  stale: boolean;
}

interface Entry<T> {
  value: T;
  fetchedAt: number;
  expiresAt: number;
}

export interface TtlCacheOptions {
  maxEntries?: number;
  now?: () => number;
  /** Called when a stale copy is served because the loader failed. */
  onStaleServed?: (key: string, error: unknown) => void;
}

/**
 * In-memory cache with a TTL per entry, request coalescing and stale-on-error fallback.
 * It lives in one process and is emptied on restart; a shared store (for example Redis)
 * would be needed to share it between several server instances.
 */
export class TtlCache<T> {
  private readonly entries = new Map<string, Entry<T>>();
  private readonly inflight = new Map<string, Promise<CacheResult<T>>>();
  private readonly maxEntries: number;
  private readonly now: () => number;
  private readonly onStaleServed: ((key: string, error: unknown) => void) | undefined;

  constructor(options: TtlCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? 500;
    this.now = options.now ?? Date.now;
    this.onStaleServed = options.onStaleServed;
  }

  /**
   * Returns a fresh cached value, or loads it. Concurrent callers for the same key share one load.
   * If loading fails and an entry younger than `maxStaleMs` exists, that entry is returned as stale.
   */
  getOrLoad(key: string, ttlMs: number, maxStaleMs: number, loader: () => Promise<T>): Promise<CacheResult<T>> {
    const now = this.now();
    const entry = this.entries.get(key);
    if (entry && entry.expiresAt > now) {
      return Promise.resolve({ value: entry.value, fetchedAt: entry.fetchedAt, stale: false });
    }

    const pending = this.inflight.get(key);
    if (pending) return pending;

    const load = (async (): Promise<CacheResult<T>> => {
      try {
        const value = await loader();
        const fetchedAt = this.now();
        this.store(key, { value, fetchedAt, expiresAt: fetchedAt + ttlMs });
        return { value, fetchedAt, stale: false };
      } catch (error) {
        const old = this.entries.get(key);
        if (old && this.now() - old.fetchedAt <= maxStaleMs) {
          this.onStaleServed?.(key, error);
          return { value: old.value, fetchedAt: old.fetchedAt, stale: true };
        }
        throw error;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, load);
    return load;
  }

  get size(): number {
    return this.entries.size;
  }

  private store(key: string, entry: Entry<T>): void {
    this.entries.delete(key);
    this.entries.set(key, entry);
    // Maps iterate in insertion order, so the first key is the oldest.
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
    }
  }
}
