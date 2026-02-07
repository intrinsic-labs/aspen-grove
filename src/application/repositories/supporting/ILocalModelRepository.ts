import {
  LocalModel,
  LocalModelAuthConfig,
  LocalModelParameters,
  Provider,
} from '@domain/entities';
import { ULID } from '@domain/value-objects';

/**
 * Repository interface for LocalModel persistence operations.
 * Infrastructure layer implements this contract.
 *
 * LocalModels are user-defined model endpoints for local or custom inference
 * (Ollama, LM Studio, llama.cpp, custom endpoints). Remote provider models
 * are fetched dynamically via ModelCatalogService, not stored here.
 */
export interface ILocalModelRepository {
  // === Basic CRUD ===

  /** Find a LocalModel by ID, or null if not found. */
  findById(id: ULID): Promise<LocalModel | null>;

  /** Find a LocalModel by its user-defined identifier. */
  findByIdentifier(identifier: string): Promise<LocalModel | null>;

  /** Create a new LocalModel. */
  create(input: CreateLocalModelInput): Promise<LocalModel>;

  /** Update a LocalModel's mutable fields. */
  update(input: UpdateLocalModelInput): Promise<LocalModel>;

  /** Permanently delete a LocalModel. */
  delete(id: ULID): Promise<boolean>;

  // === Queries ===

  /** Find all LocalModels, optionally filtered by provider type. */
  findAll(provider?: Provider): Promise<LocalModel[]>;
}

/** Input for creating a new LocalModel. */
export type CreateLocalModelInput = {
  readonly name: string;
  readonly identifier: string;
  readonly provider: Provider;
  readonly endpoint: string;
  readonly authConfig: LocalModelAuthConfig;
  readonly defaultParameters?: LocalModelParameters;
};

/** Input for updating a LocalModel's mutable fields. */
export type UpdateLocalModelInput = {
  readonly id: ULID;
  readonly changes: {
    readonly name?: string;
    readonly identifier?: string;
    readonly endpoint?: string;
    readonly authConfig?: LocalModelAuthConfig;
    readonly defaultParameters?: LocalModelParameters;
  };
};
