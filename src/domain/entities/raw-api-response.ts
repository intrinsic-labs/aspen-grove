import { ULID } from '../value-objects';
import { Provider } from './provider';

/**
 * RawApiResponse entity
 *
 * Complete, unmodified API response stored for model-generated Nodes.
 * These are evidence records and should never be modified after creation.
 *
 * See docs/architecture/model/provenance.md
 */
export interface RawApiResponse {
  readonly id: ULID;
  readonly nodeId: ULID;
  readonly provider: Provider;
  readonly requestId?: string;
  readonly modelIdentifier: string;
  readonly responseBody: string;
  readonly responseHeaders: string;
  readonly requestTimestamp: Date;
  readonly responseTimestamp: Date;
  readonly latencyMs: number;
  readonly tokenUsage?: TokenUsage;
  readonly compressionType: CompressionType;
  readonly createdAt: Date;
}

/**
 * Token usage information from the API response
 */
export interface TokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

/**
 * Compression type for stored response data
 */
export type CompressionType = 'none' | 'gzip';
