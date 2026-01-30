/**
 * Timestamp Certificate Entity
 *
 * RFC 3161 timestamp authority certificate proving a hash existed
 * at a specific time. Provides third-party attestation of when
 * content was created.
 */

import type { Ulid, Timestamp } from '../base';

/**
 * TimestampCertificate entity - proof of existence at a point in time.
 *
 * Key characteristics:
 * - One certificate per Node (optional - depends on network availability)
 * - Obtained asynchronously after Node creation
 * - Provides third-party timestamp attestation
 * - Failed attempts don't block Node creation
 */
export interface TimestampCertificate {
  /** ULID primary identifier */
  readonly id: Ulid;

  /** Reference to the Node this timestamp certifies */
  readonly nodeId: Ulid;

  /** The hash that was timestamped (should match Node.contentHash) */
  readonly contentHash: string;

  /** URL of the timestamp authority used (e.g., 'https://freetsa.org') */
  readonly timestampAuthority: string;

  /** Base64-encoded timestamp certificate from the authority */
  readonly certificate: string;

  /** The certified time from the authority (milliseconds) */
  readonly timestamp: Timestamp;

  /** Whether the certificate has been verified locally */
  readonly verified: boolean;

  /** When verification was performed (null if not verified) */
  readonly verifiedAt: Timestamp | null;

  /** Creation timestamp in milliseconds */
  readonly createdAt: Timestamp;
}

/**
 * Input for creating a TimestampCertificate
 */
export interface CreateTimestampCertificateInput {
  /** ULID for the new certificate (pre-generated) */
  id: Ulid;

  /** Node reference */
  nodeId: Ulid;

  /** The hash that was timestamped */
  contentHash: string;

  /** Timestamp authority URL */
  timestampAuthority: string;

  /** Base64-encoded certificate */
  certificate: string;

  /** Certified time from authority */
  timestamp: Timestamp;

  /** Initial verification status (typically false until verified) */
  verified?: boolean;
}

/**
 * Status of a timestamp certificate
 */
export enum TimestampStatus {
  /** Certificate obtained and verified */
  Certified = 'certified',
  /** Certificate obtained but not yet verified */
  Pending = 'pending',
  /** No certificate available (network failure, etc.) */
  Unavailable = 'unavailable',
}

/**
 * Default timestamp authority URLs
 */
export const DEFAULT_TIMESTAMP_AUTHORITY = 'https://freetsa.org/tsr';

/**
 * Fallback timestamp authorities
 */
export const FALLBACK_TIMESTAMP_AUTHORITIES = [
  'https://freetsa.org/tsr',
  // Additional authorities can be added here
] as const;

/**
 * Get the timestamp status for display
 */
export function getTimestampStatus(
  certificate: TimestampCertificate | null
): TimestampStatus {
  if (!certificate) {
    return TimestampStatus.Unavailable;
  }

  if (certificate.verified) {
    return TimestampStatus.Certified;
  }

  return TimestampStatus.Pending;
}

/**
 * Check if a certificate is valid (verified and hash matches)
 */
export function isCertificateValid(
  certificate: TimestampCertificate,
  expectedHash: string
): boolean {
  return certificate.verified && certificate.contentHash === expectedHash;
}
