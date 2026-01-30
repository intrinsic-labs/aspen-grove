/**
 * Raw API Response Entity
 *
 * Complete, unmodified API response stored for model-generated Nodes.
 * This is evidence record - never modify after creation.
 *
 * Used for provenance verification to ensure model-generated content
 * can be tied back to the actual API response.
 */

import type { Ulid, Timestamp, LlmProvider, CompressionType } from '../base';

/**
 * Token usage information from API response
 */
export interface TokenUsage {
  /** Number of tokens in the input/prompt */
  readonly promptTokens: number;

  /** Number of tokens in the output/completion */
  readonly completionTokens: number;

  /** Total tokens (prompt + completion) */
  readonly totalTokens: number;
}

/**
 * Create a TokenUsage object
 */
export function createTokenUsage(
  promptTokens: number,
  completionTokens: number
): TokenUsage {
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

/**
 * Type guard for TokenUsage
 */
export function isTokenUsage(value: unknown): value is TokenUsage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const usage = value as Record<string, unknown>;

  return (
    typeof usage.promptTokens === 'number' &&
    typeof usage.completionTokens === 'number' &&
    typeof usage.totalTokens === 'number'
  );
}

/**
 * RawApiResponse entity - evidence record for model-generated Nodes.
 *
 * Key characteristics:
 * - One RawApiResponse per model-generated Node
 * - Human-authored Nodes do not have RawApiResponse records
 * - Response body and headers are stored compressed
 * - Never modify after creation - these are evidence records
 *
 * The hash of the raw response bytes is used in computing the
 * contentHash for model-generated nodes, providing tamper evidence.
 */
export interface RawApiResponse {
  /** ULID primary identifier */
  readonly id: Ulid;

  /** Reference to the Node this response generated */
  readonly nodeId: Ulid;

  /** LLM provider that generated the response */
  readonly provider: LlmProvider;

  /** Provider's request identifier from response headers (if available) */
  readonly requestId: string | null;

  /** Model name/identifier as returned by the API */
  readonly modelIdentifier: string;

  /**
   * Complete JSON response body (may be compressed).
   * Check compressionType to determine if decompression is needed.
   */
  readonly responseBody: string;

  /**
   * HTTP response headers as JSON object (may be compressed).
   * Check compressionType to determine if decompression is needed.
   */
  readonly responseHeaders: string;

  /** Timestamp when the request was sent (milliseconds) */
  readonly requestTimestamp: Timestamp;

  /** Timestamp when the response was received (milliseconds) */
  readonly responseTimestamp: Timestamp;

  /** Response time in milliseconds */
  readonly latencyMs: number;

  /** Token usage information (if provided by API) */
  readonly tokenUsage: TokenUsage | null;

  /** How the response body and headers are compressed */
  readonly compressionType: CompressionType;

  /** Creation timestamp in milliseconds */
  readonly createdAt: Timestamp;
}

/**
 * Input for creating a new RawApiResponse
 */
export interface CreateRawApiResponseInput {
  /** ULID for the new record (pre-generated) */
  id: Ulid;

  /** Node this response generated */
  nodeId: Ulid;

  /** LLM provider */
  provider: LlmProvider;

  /** Provider's request ID (if available) */
  requestId?: string;

  /** Model identifier from API response */
  modelIdentifier: string;

  /** Response body (will be compressed if compressionType is gzip) */
  responseBody: string;

  /** Response headers as JSON string */
  responseHeaders: string;

  /** When request was sent */
  requestTimestamp: Timestamp;

  /** When response was received */
  responseTimestamp: Timestamp;

  /** Token usage (if available) */
  tokenUsage?: TokenUsage;

  /** Compression type used */
  compressionType: CompressionType;
}

/**
 * Calculate latency from request/response timestamps
 */
export function calculateLatency(
  requestTimestamp: Timestamp,
  responseTimestamp: Timestamp
): number {
  return responseTimestamp - requestTimestamp;
}
