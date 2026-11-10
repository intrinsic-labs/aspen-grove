import type { Database } from '@nozbe/watermelondb';
import type { IContinuationCountPreferenceRepository } from '@application/repositories';
import { clampContinuationCount } from '@application/services/dialogue-continuation';

const CONTINUATION_COUNT_KEY = 'aspen_grove.parallel_continuations.count';

/**
 * The app-wide continuation count, kept in WatermelonDB's local key-value
 * storage (as the chosen voice is) so it needs no schema change.
 */
export class WatermelonContinuationCountPreferenceRepository implements IContinuationCountPreferenceRepository {
  private readonly database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  async get(): Promise<number> {
    try {
      const stored = await this.database.localStorage.get<number>(
        CONTINUATION_COUNT_KEY
      );
      return clampContinuationCount(stored);
    } catch {
      return clampContinuationCount(undefined); // Unreadable: the default.
    }
  }

  async set(count: number): Promise<number> {
    const next = clampContinuationCount(count);
    await this.database.localStorage.set(CONTINUATION_COUNT_KEY, next);
    return next;
  }
}
