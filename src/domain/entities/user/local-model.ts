/**
 * Local Model Entity
 *
 * User-defined models for local inference servers or custom endpoints.
 * Unlike remote models (fetched from provider catalogs), local models
 * are persisted and configured by the user.
 */

import type { Ulid, Timestamp, LocalModelProvider } from '../base';
import { AuthType } from '../base';
import type { ModelCapabilities } from '../agent/model-capabilities';

/**
 * Authentication configuration for local model endpoints
 */
export interface AuthConfig {
  /** Authentication type */
  readonly type: AuthType;

  /**
   * Reference to credential in secure storage.
   * Format: 'local_model_{ulid}'
   */
  readonly credentialRef: string | null;
}

/**
 * Default auth config (no authentication)
 */
export const NO_AUTH_CONFIG: AuthConfig = {
  type: AuthType.None,
  credentialRef: null,
};

/**
 * Create an AuthConfig object
 */
export function createAuthConfig(type: AuthType, credentialRef: string | null = null): AuthConfig {
  return {
    type,
    credentialRef: type === AuthType.None ? null : credentialRef,
  };
}

/**
 * LocalModel entity - a user-defined model for local/custom inference.
 *
 * Key characteristics:
 * - Persisted locally (unlike remote models from catalog)
 * - User configures endpoint and capabilities
 * - Can have custom authentication
 * - Referenced by Agents via 'local:{ulid}' modelRef
 */
export interface LocalModel {
  /** ULID primary identifier */
  readonly id: Ulid;

  /**
   * User-defined model identifier.
   * e.g., 'llama3:70b', 'my-fine-tune'
   */
  readonly identifier: string;

  /** Provider type (local or custom) */
  readonly provider: LocalModelProvider;

  /** Full URL to the model endpoint */
  readonly endpoint: string;

  /** Authentication configuration */
  readonly authConfig: AuthConfig | null;

  /** Model capabilities (user-specified, cannot be introspected) */
  readonly capabilities: ModelCapabilities;

  /** Creation timestamp in milliseconds */
  readonly createdAt: Timestamp;

  /** Last update timestamp in milliseconds */
  readonly updatedAt: Timestamp;
}

/**
 * Input for creating a new LocalModel
 */
export interface CreateLocalModelInput {
  /** ULID for the new model (pre-generated) */
  id: Ulid;

  /** Model identifier */
  identifier: string;

  /** Provider type */
  provider: LocalModelProvider;

  /** Endpoint URL */
  endpoint: string;

  /** Optional authentication config */
  authConfig?: AuthConfig;

  /** Model capabilities */
  capabilities: Partial<ModelCapabilities>;
}

/**
 * Input for updating a LocalModel
 */
export interface UpdateLocalModelInput {
  /** New identifier */
  identifier?: string;

  /** New endpoint URL */
  endpoint?: string;

  /** New authentication config */
  authConfig?: AuthConfig | null;

  /** Updated capabilities */
  capabilities?: Partial<ModelCapabilities>;
}

/**
 * Filters for querying local models
 */
export interface LocalModelFilters {
  /** Filter by provider type */
  provider?: LocalModelProvider;
}

/**
 * Type guard for AuthConfig
 */
export function isAuthConfig(value: unknown): value is AuthConfig {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const config = value as Record<string, unknown>;

  return (
    typeof config.type === 'string' &&
    Object.values(AuthType).includes(config.type as AuthType) &&
    (config.credentialRef === null || typeof config.credentialRef === 'string')
  );
}

/**
 * Create a model reference for a local model
 */
export function createLocalModelRef(modelId: Ulid): string {
  return `local:${modelId}`;
}

/**
 * Check if a model reference is for a local model
 */
export function isLocalModelRef(modelRef: string): boolean {
  return modelRef.startsWith('local:');
}

/**
 * Extract the model ID from a local model reference
 */
export function parseLocalModelRef(modelRef: string): Ulid | null {
  if (!isLocalModelRef(modelRef)) {
    return null;
  }
  return modelRef.slice(6); // 'local:'.length === 6
}
