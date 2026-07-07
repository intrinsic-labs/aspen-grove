import type { Database } from '@nozbe/watermelondb';
import {
  fetchOpenRouterCatalog,
  type OpenRouterCatalogModel,
} from './openrouter/catalog';

const CACHE_KEY = 'openrouter_model_catalog_v1';
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
      return parsed;
    } catch {
      // Unreadable cache is equivalent to no cache.
      return null;
    }
  }

  private async writeCache(catalog: CachedCatalog): Promise<void> {
    try {
      await this.database.localStorage.set(CACHE_KEY, JSON.stringify(catalog));
    } catch {
      // Cache write failure is non-fatal; the fetch result is still returned.
    }
  }
}
