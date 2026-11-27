import type { Database } from '@nozbe/watermelondb';
import {
  fetchOpenRouterCatalog,
  type OpenRouterCatalogModel,
} from './openrouter/catalog';

// v4 adds positive base-model evidence (weight identity and routes).
const CACHE_KEY = 'openrouter_model_catalog_v4';
const STALE_CACHE_KEYS = [
  'openrouter_model_catalog_v1',
  'openrouter_model_catalog_v2',
  'openrouter_model_catalog_v3',
] as const;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CachedCatalog = {
  readonly fetchedAt: number;
  readonly models: readonly OpenRouterCatalogModel[];
};

/**
 * OpenRouter model catalog with a 24h persisted cache.
 *
 * The catalog is public (no API key) but large and slow-changing, so we cache
 * it in WatermelonDB's key-value LocalStorage. A failed refresh falls back to
 * stale cache when available — offline users keep their last known catalog.
 */
export class OpenRouterModelCatalog {
  private readonly database: Database;
  private inFlight: Promise<readonly OpenRouterCatalogModel[]> | null = null;
  /** The last catalog read or written, so repeat reads skip the parse. */
  private memo: CachedCatalog | null = null;

  constructor(database: Database) {
    this.database = database;
  }

  async getModels(options?: {
    readonly forceRefresh?: boolean;
  }): Promise<readonly OpenRouterCatalogModel[]> {
    const cached = await this.readCache();
    const isFresh =
      cached !== null && Date.now() - cached.fetchedAt < CACHE_TTL_MS;

    if (isFresh && !options?.forceRefresh) {
      return cached.models;
    }

    if (!this.inFlight) {
      this.inFlight = this.refresh(cached);
    }
    try {
      return await this.inFlight;
    } finally {
      this.inFlight = null;
    }
  }

  /**
   * The catalog as last saved, however old, without going to the network;
   * empty when none has been saved. For lookups made while sending.
   */
  async getCachedModels(): Promise<readonly OpenRouterCatalogModel[]> {
    return (await this.readCache())?.models ?? [];
  }

  private async refresh(
    stale: CachedCatalog | null
  ): Promise<readonly OpenRouterCatalogModel[]> {
    try {
      const models = await fetchOpenRouterCatalog();
      await this.writeCache({ fetchedAt: Date.now(), models });
      return models;
    } catch (error) {
      if (stale) {
        return stale.models;
      }
      throw error instanceof Error
        ? error
        : new Error('Failed to load OpenRouter model catalog');
    }
  }

  private async readCache(): Promise<CachedCatalog | null> {
    if (this.memo) {
      return this.memo;
    }
    try {
      const raw = await this.database.localStorage.get<string>(CACHE_KEY);
      if (typeof raw !== 'string' || raw.length === 0) {
        return null;
      }
      const parsed = JSON.parse(raw) as CachedCatalog;
      if (
        typeof parsed.fetchedAt !== 'number' ||
        !Array.isArray(parsed.models)
      ) {
        return null;
      }
      this.memo = parsed;
      return parsed;
    } catch {
      // Unreadable cache is equivalent to no cache.
      return null;
    }
  }

  private async writeCache(catalog: CachedCatalog): Promise<void> {
    this.memo = catalog;
    try {
      await this.database.localStorage.set(CACHE_KEY, JSON.stringify(catalog));
      for (const key of STALE_CACHE_KEYS) {
        await this.database.localStorage.remove(key);
      }
    } catch {
      // Cache write failure is non-fatal; the fetch result is still returned.
    }
  }
}
