/**
 * Provenance Repository Interfaces
 *
 * Abstract contracts for provenance data persistence operations.
 * Includes RawApiResponse (API evidence) and TimestampCertificate (RFC 3161).
 *
 * These entities provide tamper evidence for model-generated nodes
 * and third-party timestamp attestation.
 */

import type {
  RawApiResponse,
  CreateRawApiResponseInput,
  TimestampCertificate,
  CreateTimestampCertificateInput,
  LlmProvider,
  Ulid,
} from '../../domain';

/**
 * Raw API Response repository interface.
 *
 * Manages persistence for RawApiResponse entities - the evidence records
 * that store complete API responses for model-generated nodes.
 *
 * IMPORTANT: These are evidence records and should NEVER be modified
 * after creation. Any tampering invalidates the node's hash chain.
 */
export interface IRawApiResponseRepository {
  /**
   * Create a new RawApiResponse record.
   *
   * Called immediately after receiving an API response, before any parsing.
   * The response body and headers should already be compressed if needed.
   *
   * @param input - RawApiResponse creation parameters
   * @returns The created RawApiResponse
   */
  create(input: CreateRawApiResponseInput): Promise<RawApiResponse>;

  /**
   * Find a RawApiResponse by ID.
   *
   * @param id - RawApiResponse ULID
   * @returns The RawApiResponse or null if not found
   */
  findById(id: Ulid): Promise<RawApiResponse | null>;

  /**
   * Find the RawApiResponse for a specific Node.
   *
   * Each model-generated node has exactly one RawApiResponse.
   * Human-authored nodes do not have RawApiResponse records.
   *
   * @param nodeId - Node ULID
   * @returns The RawApiResponse or null if not found (human node or missing)
   */
  findByNodeId(nodeId: Ulid): Promise<RawApiResponse | null>;

  /**
   * Check if a Node has an associated RawApiResponse.
   *
   * Useful for determining if verification is possible without loading the full record.
   *
   * @param nodeId - Node ULID
   * @returns true if the node has a RawApiResponse
   */
  existsForNode(nodeId: Ulid): Promise<boolean>;

  /**
   * Find RawApiResponses by provider and time range.
   *
   * Useful for debugging, research, and provider-specific analysis.
   *
   * @param provider - LLM provider
   * @param from - Start timestamp (inclusive)
   * @param to - End timestamp (inclusive)
   * @returns Array of RawApiResponses
   */
  findByProviderAndTimeRange(
    provider: LlmProvider,
    from: number,
    to: number
  ): Promise<RawApiResponse[]>;

  /**
   * Delete a RawApiResponse.
   *
   * WARNING: Deleting a RawApiResponse will make the associated node's
   * hash unverifiable. Only do this for cleanup/archival purposes.
   *
   * @param id - RawApiResponse ULID
   * @returns true if deletion succeeded
   */
  delete(id: Ulid): Promise<boolean>;

  /**
   * Delete RawApiResponse for a Node.
   *
   * Used when hard-deleting a node (cascade delete).
   *
   * @param nodeId - Node ULID
   * @returns true if deletion succeeded (or no record existed)
   */
  deleteByNodeId(nodeId: Ulid): Promise<boolean>;

  /**
   * Get storage statistics for provenance data.
   *
   * Useful for displaying storage usage in settings.
   *
   * @returns Storage statistics
   */
  getStorageStats(): Promise<{
    /** Total number of stored responses */
    count: number;
    /** Estimated total size in bytes (approximate) */
    estimatedSizeBytes: number;
  }>;
}

/**
 * Timestamp Certificate repository interface.
 *
 * Manages persistence for TimestampCertificate entities - RFC 3161
 * timestamps that prove a hash existed at a specific time.
 */
export interface ITimestampCertificateRepository {
  /**
   * Create a new TimestampCertificate.
   *
   * Called after successfully obtaining a timestamp from an authority.
   *
   * @param input - TimestampCertificate creation parameters
   * @returns The created TimestampCertificate
   */
  create(input: CreateTimestampCertificateInput): Promise<TimestampCertificate>;

  /**
   * Find a TimestampCertificate by ID.
   *
   * @param id - TimestampCertificate ULID
   * @returns The TimestampCertificate or null if not found
   */
  findById(id: Ulid): Promise<TimestampCertificate | null>;

  /**
   * Find the TimestampCertificate for a specific Node.
   *
   * Each node can have at most one TimestampCertificate.
   * Not all nodes will have certificates (network failures, etc.).
   *
   * @param nodeId - Node ULID
   * @returns The TimestampCertificate or null if not found
   */
  findByNodeId(nodeId: Ulid): Promise<TimestampCertificate | null>;

  /**
   * Check if a Node has an associated TimestampCertificate.
   *
   * @param nodeId - Node ULID
   * @returns true if the node has a TimestampCertificate
   */
  existsForNode(nodeId: Ulid): Promise<boolean>;

  /**
   * Find all unverified certificates.
   *
   * Used by background job to process pending verifications.
   *
   * @param limit - Maximum certificates to return
   * @returns Array of unverified TimestampCertificates
   */
  findUnverified(limit?: number): Promise<TimestampCertificate[]>;

  /**
   * Mark a certificate as verified.
   *
   * Called after successfully verifying the certificate signature.
   *
   * @param id - TimestampCertificate ULID
   * @returns The updated TimestampCertificate
   * @throws NotFoundError if certificate doesn't exist
   */
  markVerified(id: Ulid): Promise<TimestampCertificate>;

  /**
   * Find certificates by timestamp authority.
   *
   * Useful for authority-specific queries and analysis.
   *
   * @param authority - Timestamp authority URL
   * @returns Array of TimestampCertificates from this authority
   */
  findByAuthority(authority: string): Promise<TimestampCertificate[]>;

  /**
   * Delete a TimestampCertificate.
   *
   * @param id - TimestampCertificate ULID
   * @returns true if deletion succeeded
   */
  delete(id: Ulid): Promise<boolean>;

  /**
   * Delete TimestampCertificate for a Node.
   *
   * Used when hard-deleting a node (cascade delete).
   *
   * @param nodeId - Node ULID
   * @returns true if deletion succeeded (or no record existed)
   */
  deleteByNodeId(nodeId: Ulid): Promise<boolean>;

  /**
   * Count certificates by verification status.
   *
   * @returns Counts of verified and unverified certificates
   */
  countByStatus(): Promise<{
    verified: number;
    unverified: number;
  }>;
}
