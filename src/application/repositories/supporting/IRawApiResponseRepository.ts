import {
  CompressionType,
  Provider,
  RawApiResponse,
  TokenUsage,
} from '@domain/entities';
import { ULID } from '@domain/value-objects';

/**
 * Repository interface for RawApiResponse persistence operations.
 * Infrastructure layer implements this contract.
 *
 * RawApiResponses are evidence records for model-generated Nodes.
 * They should never be modified after creation.
 */
export interface IRawApiResponseRepository {
  // === Basic CRUD ===

  /** Find a RawApiResponse by ID, or null if not found. */
  findById(id: ULID): Promise<RawApiResponse | null>;

  /**
   * Find the RawApiResponse for a Node.
   * Decompresses responseBody and responseHeaders on retrieval.
   */
  findByNodeId(nodeId: ULID): Promise<RawApiResponse | null>;

  /**
   * Create a new RawApiResponse record.
   * Implementation should compress responseBody and responseHeaders (gzip).
   */
  create(input: CreateRawApiResponseInput): Promise<RawApiResponse>;

  /** Delete a RawApiResponse by ID. */
  delete(id: ULID): Promise<boolean>;

  /** Delete the RawApiResponse for a specific Node. */
  deleteByNodeId(nodeId: ULID): Promise<boolean>;
}

/** Input for creating a new RawApiResponse. */
export type CreateRawApiResponseInput = {
  readonly nodeId: ULID;
  readonly provider: Provider;
  /** Provider's request identifier from headers. */
  readonly requestId?: string;
  /** The model name returned by the API. */
  readonly modelIdentifier: string;
  /** Complete JSON response body (will be compressed). */
  readonly responseBody: string;
  /** JSON object of HTTP headers (will be compressed). */
  readonly responseHeaders: string;
  readonly requestTimestamp: Date;
  readonly responseTimestamp: Date;
  readonly latencyMs: number;
  readonly tokenUsage?: TokenUsage;
};
