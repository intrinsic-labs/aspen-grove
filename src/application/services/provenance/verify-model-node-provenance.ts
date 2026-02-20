import type {
  IEdgeRepository,
  INodeRepository,
  IRawApiResponseRepository,
} from '@application/repositories';
import {
  computeModelContentHash,
  computeSha256Hash,
} from '@application/services/content-hash-service';
import type { ContentHash, ULID } from '@domain/value-objects';

export type ModelNodeProvenanceStatus =
  | 'valid'
  | 'nodeNotFound'
  | 'notModelNode'
  | 'missingRawApiResponse'
  | 'missingParentNode'
  | 'hashMismatch';

export type VerifyModelNodeProvenanceInput = {
  readonly nodeId: ULID;
  readonly nodeRepository: Pick<INodeRepository, 'findById'>;
  readonly edgeRepository: Pick<IEdgeRepository, 'findContinuationsByTargetNodeId'>;
  readonly rawApiResponseRepository: Pick<IRawApiResponseRepository, 'findByNodeId'>;
};

export type ModelNodeProvenanceVerificationResult = {
  readonly isValid: boolean;
  readonly status: ModelNodeProvenanceStatus;
  readonly nodeId: ULID;
  readonly rawApiResponseId?: ULID;
  readonly rawResponseHash?: ContentHash;
  readonly expectedContentHash?: ContentHash;
  readonly storedContentHash?: ContentHash;
  readonly parentNodeCount?: number;
  readonly missingParentNodeIds?: readonly ULID[];
};

const buildRawResponseBytes = (responseHeaders: string, responseBody: string): string => {
  return `${responseHeaders}\n\n${responseBody}`;
};

/**
 * Verifies model-node provenance by recomputing the node hash from persisted evidence.
 *
 * Algorithm matches docs/architecture/model/provenance.md:
 * content + parent hashes + createdAt + authorAgentId + SHA-256(raw response bytes)
 */
export const verifyModelNodeProvenance = async (
  input: VerifyModelNodeProvenanceInput
): Promise<ModelNodeProvenanceVerificationResult> => {
  const node = await input.nodeRepository.findById(input.nodeId, true);
  if (!node) {
    return {
      isValid: false,
      status: 'nodeNotFound',
      nodeId: input.nodeId,
    };
  }

  if (node.authorType !== 'model') {
    return {
      isValid: false,
      status: 'notModelNode',
      nodeId: input.nodeId,
      storedContentHash: node.contentHash,
    };
  }

  const [rawApiResponse, continuationEdges] = await Promise.all([
    input.rawApiResponseRepository.findByNodeId(node.id),
    input.edgeRepository.findContinuationsByTargetNodeId(node.id),
  ]);

  if (!rawApiResponse) {
    return {
      isValid: false,
      status: 'missingRawApiResponse',
      nodeId: node.id,
      storedContentHash: node.contentHash,
    };
  }

  const parentNodeIds = continuationEdges.flatMap((edge) =>
    edge.sources.map((source) => source.nodeId)
  );

  const parentNodes = await Promise.all(
    parentNodeIds.map((parentNodeId) =>
      input.nodeRepository.findById(parentNodeId, true)
    )
  );

  const missingParentNodeIds = parentNodes
    .map((parentNode, index) => (parentNode ? null : parentNodeIds[index]))
    .filter((parentNodeId): parentNodeId is ULID => Boolean(parentNodeId));

  if (missingParentNodeIds.length > 0) {
    return {
      isValid: false,
      status: 'missingParentNode',
      nodeId: node.id,
      rawApiResponseId: rawApiResponse.id,
      storedContentHash: node.contentHash,
      missingParentNodeIds,
    };
  }

  const parentHashes: ContentHash[] = [];
  for (const parentNode of parentNodes) {
    if (parentNode) {
      parentHashes.push(parentNode.contentHash);
    }
  }
  const rawResponseBytes = buildRawResponseBytes(
    rawApiResponse.responseHeaders,
    rawApiResponse.responseBody
  );
  const rawResponseHash = await computeSha256Hash(rawResponseBytes);
  const expectedContentHash = await computeModelContentHash(
    node.content,
    parentHashes,
    node.createdAt,
    node.authorAgentId,
    rawResponseHash
  );

  if (expectedContentHash !== node.contentHash) {
    return {
      isValid: false,
      status: 'hashMismatch',
      nodeId: node.id,
      rawApiResponseId: rawApiResponse.id,
      rawResponseHash,
      expectedContentHash,
      storedContentHash: node.contentHash,
      parentNodeCount: parentHashes.length,
    };
  }

  return {
    isValid: true,
    status: 'valid',
    nodeId: node.id,
    rawApiResponseId: rawApiResponse.id,
    rawResponseHash,
    expectedContentHash,
    storedContentHash: node.contentHash,
    parentNodeCount: parentHashes.length,
  };
};
