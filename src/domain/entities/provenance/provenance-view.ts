/**
 * Provenance View
 *
 * A computed view combining provenance data for display.
 * Not a stored entity - assembled from Node, RawApiResponse,
 * and TimestampCertificate data.
 */

import type { Ulid, Timestamp, VerificationStatus } from '../base';

/**
 * Hash chain status for a node or path
 */
export enum HashChainStatus {
  /** All hashes match, chain intact */
  Valid = 'valid',
  /** One or more hashes don't match */
  Invalid = 'invalid',
  /** Hash has not been verified yet */
  Unverified = 'unverified',
}

/**
 * Timestamp status for display
 */
export enum TimestampStatus {
  /** Certificate obtained and verified */
  Certified = 'certified',
  /** Certificate obtained but not yet verified */
  Pending = 'pending',
  /** No certificate available */
  Unavailable = 'unavailable',
}

/**
 * API evidence status for display
 */
export enum ApiEvidenceStatus {
  /** Raw API response is stored and available */
  Available = 'available',
  /** No API response (human node or missing data) */
  Unavailable = 'unavailable',
}

/**
 * ProvenanceView - computed view combining provenance data for display.
 *
 * This is assembled from multiple entities, not stored directly.
 * Used for displaying provenance information in the UI.
 */
export interface ProvenanceView {
  /** Node ID this provenance view is for */
  readonly nodeId: Ulid;

  /** The node's content hash */
  readonly contentHash: string;

  /** Status of the hash chain verification */
  readonly hashChainStatus: HashChainStatus;

  /** Status of the timestamp certificate */
  readonly timestampStatus: TimestampStatus;

  /** Certified time from timestamp authority (if available) */
  readonly certifiedTime: Timestamp | null;

  /** Timestamp authority URL (if available) */
  readonly timestampAuthority: string | null;

  /** Status of API evidence availability */
  readonly apiEvidenceStatus: ApiEvidenceStatus;

  /** Provider's request ID for cross-referencing (if available) */
  readonly providerRequestId: string | null;

  /** Model identifier from API response (if available) */
  readonly modelIdentifier: string | null;

  /** When the provenance was last verified (if ever) */
  readonly lastVerifiedAt: Timestamp | null;
}

/**
 * Create an empty/default provenance view for a node
 */
export function createUnverifiedProvenanceView(
  nodeId: Ulid,
  contentHash: string
): ProvenanceView {
  return {
    nodeId,
    contentHash,
    hashChainStatus: HashChainStatus.Unverified,
    timestampStatus: TimestampStatus.Unavailable,
    certifiedTime: null,
    timestampAuthority: null,
    apiEvidenceStatus: ApiEvidenceStatus.Unavailable,
    providerRequestId: null,
    modelIdentifier: null,
    lastVerifiedAt: null,
  };
}

/**
 * Summary of provenance for a path (multiple nodes)
 */
export interface PathProvenanceView {
  /** Starting node ID (root) */
  readonly fromNodeId: Ulid;

  /** Ending node ID */
  readonly toNodeId: Ulid;

  /** Total nodes in the path */
  readonly nodeCount: number;

  /** Overall hash chain status for the entire path */
  readonly overallHashStatus: HashChainStatus;

  /** Number of nodes with valid hashes */
  readonly validCount: number;

  /** Number of nodes with invalid hashes */
  readonly invalidCount: number;

  /** Number of nodes not yet verified */
  readonly unverifiedCount: number;

  /** Number of nodes with timestamp certificates */
  readonly timestampedCount: number;

  /** Individual node provenance views (optional, for detailed display) */
  readonly nodeViews?: readonly ProvenanceView[];
}

/**
 * Compute overall hash status from individual statuses
 */
export function computeOverallHashStatus(
  statuses: readonly HashChainStatus[]
): HashChainStatus {
  if (statuses.length === 0) {
    return HashChainStatus.Unverified;
  }

  // If any are invalid, the whole chain is invalid
  if (statuses.includes(HashChainStatus.Invalid)) {
    return HashChainStatus.Invalid;
  }

  // If any are unverified, we can't say the chain is valid
  if (statuses.includes(HashChainStatus.Unverified)) {
    return HashChainStatus.Unverified;
  }

  // All are valid
  return HashChainStatus.Valid;
}
