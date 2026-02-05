import { ContentHash, ULID } from '../value-objects';

/**
 * TimestampCertificate
 *
 * RFC 3161 timestamp authority certificate proving a hash existed at a specific time.
 * Provides third-party signed proof of when a Node's content hash was created.
 *
 * See docs/architecture/model/provenance.md
 */
export interface TimestampCertificate {
  readonly id: ULID;
  /** Reference to the Node this timestamp certifies */
  readonly nodeId: ULID;
  /** The hash that was timestamped (should match Node.contentHash) */
  readonly contentHash: ContentHash;
  /** URL of the timestamp authority used (e.g., FreeTSA) */
  readonly timestampAuthority: string;
  /** Base64-encoded timestamp certificate */
  readonly certificate: string;
  /** The certified time from the authority */
  readonly timestamp: Date;
  /** Whether the certificate has been verified locally */
  readonly verified: boolean;
  /** When verification was performed */
  readonly verifiedAt?: Date;
  readonly createdAt: Date;
}
