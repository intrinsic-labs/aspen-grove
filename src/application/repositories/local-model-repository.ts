/**
 * LocalModel Repository Interface
 *
 * Abstract contract for LocalModel persistence operations.
 * LocalModels are user-defined models for local inference servers or custom endpoints.
 */

import type {
  LocalModel,
  CreateLocalModelInput,
  UpdateLocalModelInput,
  LocalModelFilters,
  LocalModelProvider,
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
 * LocalModel repository interface.
 *
 * Manages persistence for LocalModel entities. Unlike remote models
 * (fetched dynamically from provider catalogs), local models are
 * user-configured and stored locally.
 */
export interface ILocalModelRepository {
  /**
   * Create a new LocalModel.
   *
   * @param input - LocalModel creation parameters
   * @returns The created LocalModel
   */
  create(input: CreateLocalModelInput): Promise<LocalModel>;

  /**
   * Find a LocalModel by ID.
   *
   * @param id - LocalModel ULID
   * @returns The LocalModel or null if not found
   */
  findById(id: Ulid): Promise<LocalModel | null>;

  /**
   * Find a LocalModel by its identifier.
   *
   * Identifiers are user-defined names like 'llama3:70b' or 'my-fine-tune'.
   * Not guaranteed to be unique, but typically are.
   *
   * @param identifier - User-defined model identifier
   * @returns The LocalModel or null if not found
   */
  findByIdentifier(identifier: string): Promise<LocalModel | null>;

  /**
   * List all LocalModels with optional filtering.
   *
   * @param filters - Optional filters (by provider type)
   * @returns Array of LocalModels
   */
  findAll(filters?: LocalModelFilters): Promise<LocalModel[]>;

  /**
   * Find LocalModels by provider type.
   *
   * @param provider - Provider type ('local' or 'custom')
   * @returns Array of LocalModels using that provider
   */
  findByProvider(provider: LocalModelProvider): Promise<LocalModel[]>;

  /**
   * Update a LocalModel.
   *
   * @param id - LocalModel ULID
   * @param changes - Properties to update
   * @returns The updated LocalModel
   * @throws NotFoundError if LocalModel doesn't exist
   */
  update(id: Ulid, changes: UpdateLocalModelInput): Promise<LocalModel>;

  /**
   * Delete a LocalModel.
   *
   * Note: Deleting a LocalModel that is referenced by Agents will leave
   * those Agents with an invalid modelRef. Consider checking for references
   * before deletion.
   *
   * @param id - LocalModel ULID
   * @returns true if deletion succeeded
   */
  delete(id: Ulid): Promise<boolean>;

  /**
   * Check if a LocalModel exists.
   *
   * @param id - LocalModel ULID
   * @returns true if the LocalModel exists
   */
  exists(id: Ulid): Promise<boolean>;

  /**
   * Count LocalModels.
   *
   * @param filters - Optional filters
   * @returns Count of matching LocalModels
   */
  count(filters?: LocalModelFilters): Promise<number>;

  /**
   * Check if any Agents reference this LocalModel.
   *
   * Useful before deletion to warn users about broken references.
   *
   * @param id - LocalModel ULID
   * @returns true if any Agents reference this model
   */
  hasAgentReferences(id: Ulid): Promise<boolean>;

  // ============================================
  // Observable Methods (for reactive UI updates)
  // ============================================

  /**
   * Observe a LocalModel for changes.
   *
   * Returns an observable that emits whenever the LocalModel is updated.
   *
   * @param id - LocalModel ULID
   * @returns Observable of LocalModel updates
   */
  observe(id: Ulid): Observable<LocalModel | null>;

  /**
   * Observe all LocalModels.
   *
   * Returns an observable that emits when any LocalModel changes.
   * Useful for model selection UIs.
   *
   * @param filters - Optional filters
   * @returns Observable of LocalModel arrays
   */
  observeAll(filters?: LocalModelFilters): Observable<LocalModel[]>;
}
