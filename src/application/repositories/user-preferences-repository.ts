/**
 * User Preferences Repository Interface
 *
 * Abstract contract for UserPreferences persistence operations.
 * UserPreferences is a singleton - exactly one record per app installation.
 */

import type {
  UserPreferences,
  CreateUserPreferencesInput,
  UpdateUserPreferencesInput,
  Ulid,
} from '../../domain';

/**
 * Simple observable interface for reactive queries.
 */
export interface Observable<T> {
  subscribe(observer: Observer<T>): Subscription;
}

export interface Observer<T> {
  next: (value: T) => void;
  error?: (error: Error) => void;
  complete?: () => void;
}

export interface Subscription {
  unsubscribe(): void;
}

/**
 * UserPreferences repository interface.
 *
 * Manages the singleton UserPreferences record. This is a global settings
 * store that is not tied to any specific Agent or Grove.
 *
 * Key characteristics:
 * - Singleton: Exactly one record exists per app installation
 * - Created automatically on first app launch
 * - Provides app-wide user settings
 */
export interface IUserPreferencesRepository {
  /**
   * Create the UserPreferences record.
   *
   * Should only be called once during app initialization.
   * Subsequent calls should throw a ConflictError.
   *
   * @param input - Preferences creation parameters
   * @returns The created UserPreferences
   * @throws ConflictError if preferences already exist
   */
  create(input: CreateUserPreferencesInput): Promise<UserPreferences>;

  /**
   * Get the UserPreferences record.
   *
   * Returns the singleton preferences record.
   *
   * @returns The UserPreferences or null if not yet created
   */
  get(): Promise<UserPreferences | null>;

  /**
   * Get the UserPreferences record, throwing if not found.
   *
   * Use this when preferences are expected to exist (after app initialization).
   *
   * @returns The UserPreferences
   * @throws NotFoundError if preferences haven't been created yet
   */
  getOrThrow(): Promise<UserPreferences>;

  /**
   * Update UserPreferences.
   *
   * @param changes - Properties to update
   * @returns The updated UserPreferences
   * @throws NotFoundError if preferences haven't been created yet
   */
  update(changes: UpdateUserPreferencesInput): Promise<UserPreferences>;

  /**
   * Check if UserPreferences exist.
   *
   * Useful for initialization checks without loading the full record.
   *
   * @returns true if preferences have been created
   */
  exists(): Promise<boolean>;

  /**
   * Get the ID of the UserPreferences record.
   *
   * Useful when you just need the ID for references without loading all data.
   *
   * @returns The preferences ULID or null if not created
   */
  getId(): Promise<Ulid | null>;

  // ============================================
  // Observable Methods (for reactive UI updates)
  // ============================================

  /**
   * Observe the UserPreferences for changes.
   *
   * Returns an observable that emits whenever preferences are updated.
   * Useful for reactive UIs that need to respond to settings changes
   * (e.g., theme changes, font size adjustments).
   *
   * @returns Observable of UserPreferences updates
   */
  observe(): Observable<UserPreferences | null>;
}
