import type { ModelNodeProvenanceStatus } from '@application/services/provenance';

/** How a node sheet words each provenance verification result. */
export const provenanceStatusLabel: Record<ModelNodeProvenanceStatus, string> =
  {
    valid: 'Verified — hash chain intact',
    nodeNotFound: 'Node not found',
    notModelNode: 'Not a model node',
    missingRawApiResponse: 'No raw API response stored',
    missingParentNode: 'Missing parent node(s)',
    hashMismatch: 'HASH MISMATCH — content does not match evidence',
  };

/** A long hash or id, shortened to its ends. */
export const shortHash = (value: string): string =>
  value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value;
