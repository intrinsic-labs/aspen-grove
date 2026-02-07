import { Node, TimestampCertificate } from '@domain/entities';
import { ContentHash, ULID } from '@domain/value-objects';

/**
 * Repository interface for TimestampCertificate persistence operations.
 * Infrastructure layer implements this contract.
 *
 * Manages RFC 3161 timestamp certificates for provenance verification.
 */
export interface ITimestampCertificateRepository {
  // === Basic CRUD ===

  /** Find a TimestampCertificate by ID, or null if not found. */
  findById(id: ULID): Promise<TimestampCertificate | null>;

  /** Create a new TimestampCertificate. Initially unverified. */
  create(input: CreateTimestampCertificateInput): Promise<TimestampCertificate>;

  /** Delete a TimestampCertificate by ID. */
  delete(id: ULID): Promise<boolean>;

  // === Queries ===

  /** Find the TimestampCertificate for a Node. */
  findByNodeId(nodeId: ULID): Promise<TimestampCertificate | null>;

  /**
   * Find Nodes awaiting timestamp certificates.
   * Used by background job to request certificates for new Nodes.
   */
  findPending(): Promise<Node[]>;

  /**
   * Find TimestampCertificates that haven't been verified locally.
   * Used by background verification job.
   */
  findUnverified(): Promise<TimestampCertificate[]>;

  // === Verification ===

  /**
   * Mark a certificate as locally verified.
   * Sets verified = true and verifiedAt = current timestamp.
   */
  markVerified(id: ULID): Promise<TimestampCertificate>;

  // === Cleanup ===

  /** Delete the TimestampCertificate for a specific Node. */
  deleteByNodeId(nodeId: ULID): Promise<boolean>;
}

/** Input for creating a new TimestampCertificate. */
export type CreateTimestampCertificateInput = {
  readonly nodeId: ULID;
  /** Should match Node.contentHash */
  readonly contentHash: ContentHash;
  /** URL of the timestamp authority used */
  readonly timestampAuthority: string;
  /** Base64-encoded timestamp certificate */
  readonly certificate: string;
  /** The certified time from the authority */
  readonly timestamp: Date;
};
