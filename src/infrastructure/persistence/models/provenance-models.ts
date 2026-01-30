/**
 * Provenance WatermelonDB Models
 *
 * Models for provenance-related entities:
 * - RawApiResponse: Complete API response stored for model-generated Nodes
 * - TimestampCertificate: RFC 3161 timestamp proof
 *
 * These are evidence records and should NEVER be modified after creation.
 */

import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, json } from '@nozbe/watermelondb/decorators';
import type {
  RawApiResponse,
  TimestampCertificate,
  TokenUsage,
  LlmProvider,
  CompressionType,
  Ulid,
  Timestamp,
} from '../../../domain';

/**
 * Sanitizer for token_usage JSON field.
 */
function sanitizeTokenUsage(raw: unknown): TokenUsage | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const data = raw as Record<string, unknown>;

  if (
    typeof data.promptTokens !== 'number' ||
    typeof data.completionTokens !== 'number' ||
    typeof data.totalTokens !== 'number'
  ) {
    return null;
  }

  return {
    promptTokens: data.promptTokens,
    completionTokens: data.completionTokens,
    totalTokens: data.totalTokens,
  };
}

/**
 * WatermelonDB model for raw_api_responses table.
 *
 * Stores complete, unmodified API responses for model-generated nodes.
 * These are evidence records for provenance verification.
 *
 * IMPORTANT: Never modify after creation - these are immutable evidence.
 */
export class RawApiResponseModel extends Model {
  static table = 'raw_api_responses';

  /** Reference to the Node this response generated */
  @field('node_id') nodeId!: string;

  /** LLM provider that generated the response */
  @field('provider') provider!: string;

  /** Provider's request identifier from response headers */
  @field('request_id') requestId!: string | null;

  /** Model name/identifier as returned by the API */
  @field('model_identifier') modelIdentifier!: string;

  /** Complete JSON response body (may be compressed) */
  @field('response_body') responseBody!: string;

  /** HTTP response headers as JSON (may be compressed) */
  @field('response_headers') responseHeaders!: string;

  /** Timestamp when the request was sent (milliseconds) */
  @field('request_timestamp') requestTimestamp!: number;

  /** Timestamp when the response was received (milliseconds) */
  @field('response_timestamp') responseTimestamp!: number;

  /** Response time in milliseconds */
  @field('latency_ms') latencyMs!: number;

  /** Token usage information (stored as JSON) */
  @json('token_usage', sanitizeTokenUsage) tokenUsage!: TokenUsage | null;

  /** How the response body and headers are compressed */
  @field('compression_type') compressionType!: string;

  /** Creation timestamp */
  @readonly @date('created_at') createdAt!: Date;

  /**
   * Convert this model to a domain entity.
   */
  toDomain(): RawApiResponse {
    return {
      id: this.id as Ulid,
      nodeId: this.nodeId as Ulid,
      provider: this.provider as LlmProvider,
      requestId: this.requestId,
      modelIdentifier: this.modelIdentifier,
      responseBody: this.responseBody,
      responseHeaders: this.responseHeaders,
      requestTimestamp: this.requestTimestamp as Timestamp,
      responseTimestamp: this.responseTimestamp as Timestamp,
      latencyMs: this.latencyMs,
      tokenUsage: this.tokenUsage,
      compressionType: this.compressionType as CompressionType,
      createdAt: this.createdAt.getTime() as Timestamp,
    };
  }
}

/**
 * WatermelonDB model for timestamp_certificates table.
 *
 * Stores RFC 3161 timestamp certificates that prove a hash
 * existed at a specific time, providing third-party attestation.
 */
export class TimestampCertificateModel extends Model {
  static table = 'timestamp_certificates';

  /** Reference to the Node this timestamp certifies */
  @field('node_id') nodeId!: string;

  /** The hash that was timestamped (should match Node.contentHash) */
  @field('content_hash') contentHash!: string;

  /** URL of the timestamp authority used */
  @field('timestamp_authority') timestampAuthority!: string;

  /** Base64-encoded timestamp certificate */
  @field('certificate') certificate!: string;

  /** The certified time from the authority (milliseconds) */
  @field('timestamp') timestamp!: number;

  /** Whether the certificate has been verified locally */
  @field('verified') verified!: boolean;

  /** When verification was performed (null if not verified) */
  @field('verified_at') verifiedAt!: number | null;

  /** Creation timestamp */
  @readonly @date('created_at') createdAt!: Date;

  /**
   * Convert this model to a domain entity.
   */
  toDomain(): TimestampCertificate {
    return {
      id: this.id as Ulid,
      nodeId: this.nodeId as Ulid,
      contentHash: this.contentHash,
      timestampAuthority: this.timestampAuthority,
      certificate: this.certificate,
      timestamp: this.timestamp as Timestamp,
      verified: this.verified,
      verifiedAt: this.verifiedAt as Timestamp | null,
      createdAt: this.createdAt.getTime() as Timestamp,
    };
  }
}
