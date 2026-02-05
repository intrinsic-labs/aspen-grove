import { ULID } from '../value-objects';
import { Provider } from './provider';

/**
 * LocalModel entity
 *
 * Represents a user-defined model endpoint for local or custom model inference.
 * Referenced by ModelRef as `local:{ulid}`.
 */
export interface LocalModel {
  readonly id: ULID;
  readonly name: string;
  readonly identifier: string;
  readonly provider: Provider;
  readonly endpoint: string;
  readonly authConfig: LocalModelAuthConfig;
  readonly defaultParameters?: LocalModelParameters;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Authentication configuration for local models
 */
export interface LocalModelAuthConfig {
  readonly type: 'none' | 'apiKey' | 'bearer' | 'custom';
  readonly apiKey?: string;
  readonly headerName?: string;
  readonly customHeaders?: Record<string, string>;
}

/**
 * Default parameters for local model inference
 */
export interface LocalModelParameters {
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly topP?: number;
  readonly topK?: number;
  readonly customParameters?: Record<string, unknown>;
}
