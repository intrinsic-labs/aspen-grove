/**
 * LocalModel WatermelonDB Model
 *
 * Represents a user-defined model for local inference servers or custom endpoints.
 * Unlike remote models (fetched from catalogs), these are persisted locally.
 */

import { Model } from '@nozbe/watermelondb';
import { field, json, writer } from '@nozbe/watermelondb/decorators';
import type { LocalModel, AuthConfig, ModelCapabilities, LocalModelProvider } from '../../../domain';

/**
 * Sanitizer for auth_config JSON field.
 */
function sanitizeAuthConfig(raw: unknown): AuthConfig | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const data = raw as Record<string, unknown>;

  if (typeof data.type !== 'string') {
    return null;
  }

  return {
    type: data.type as AuthConfig['type'],
    credentialRef: typeof data.credentialRef === 'string' ? data.credentialRef : null,
  };
}

/**
 * Sanitizer for capabilities JSON field.
 */
function sanitizeCapabilities(raw: unknown): ModelCapabilities {
  const defaults: ModelCapabilities = {
    supportsImages: false,
    supportsAudio: false,
    supportsToolUse: false,
    maxContextTokens: 4096,
    maxOutputTokens: 4096,
  };

  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const data = raw as Record<string, unknown>;

  return {
    supportsImages: typeof data.supportsImages === 'boolean' ? data.supportsImages : defaults.supportsImages,
    supportsAudio: typeof data.supportsAudio === 'boolean' ? data.supportsAudio : defaults.supportsAudio,
    supportsToolUse: typeof data.supportsToolUse === 'boolean' ? data.supportsToolUse : defaults.supportsToolUse,
    maxContextTokens: typeof data.maxContextTokens === 'number' ? data.maxContextTokens : defaults.maxContextTokens,
    maxOutputTokens: typeof data.maxOutputTokens === 'number' ? data.maxOutputTokens : defaults.maxOutputTokens,
  };
}

/**
 * WatermelonDB model for LocalModel entities.
 */
export class LocalModelModel extends Model {
  static table = 'local_models';

  /** User-defined model identifier (e.g., 'llama3:70b') */
  @field('identifier') identifier!: string;

  /** Provider type: 'local' or 'custom' */
  @field('provider') provider!: LocalModelProvider;

  /** Full URL to the model endpoint */
  @field('endpoint') endpoint!: string;

  /** Authentication configuration (stored as JSON) */
  @json('auth_config', sanitizeAuthConfig) authConfig!: AuthConfig | null;

  /** Model capabilities (stored as JSON) */
  @json('capabilities', sanitizeCapabilities) capabilities!: ModelCapabilities;

  /** Creation timestamp in milliseconds */
  @field('created_at') createdAt!: number;

  /** Last update timestamp in milliseconds */
  @field('updated_at') updatedAt!: number;

  /**
   * Convert this model to a domain entity.
   */
  toDomain(): LocalModel {
    return {
      id: this.id,
      identifier: this.identifier,
      provider: this.provider,
      endpoint: this.endpoint,
      authConfig: this.authConfig,
      capabilities: this.capabilities,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Update the endpoint URL.
   */
  @writer async updateEndpoint(endpoint: string): Promise<void> {
    await this.update((record) => {
      record.endpoint = endpoint;
      record.updatedAt = Date.now();
    });
  }

  /**
   * Update the capabilities.
   */
  @writer async updateCapabilities(capabilities: ModelCapabilities): Promise<void> {
    await this.update((record) => {
      record.capabilities = capabilities;
      record.updatedAt = Date.now();
    });
  }
}
