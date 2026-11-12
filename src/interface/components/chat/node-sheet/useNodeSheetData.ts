import { useCallback, useEffect, useState } from 'react';
import type {
  IAgentRepository,
  IEdgeRepository,
  INodeRepository,
  IRawApiResponseRepository,
} from '@application/repositories';
import { resolveNodeModelLabels } from '@application/services/resolve-node-model-labels';
import {
  verifyModelNodeProvenance,
  type ModelNodeProvenanceVerificationResult,
} from '@application/services/provenance';
import type { NodeAuthorType, TokenUsage } from '@domain/entities';
import type { ULID } from '@domain/value-objects';

export type NodeSheetData = {
  readonly nodeId: ULID;
  readonly localId: string;
  readonly authorType: NodeAuthorType;
  /** The model it came from, "User" or "System" (Latent Spaces' `modelId`). */
  readonly modelLabel: string;
  readonly text: string;
  readonly createdAt: Date;
  readonly editedFrom?: ULID;
  readonly bookmarked: boolean;
  readonly pruned: boolean;
  readonly excluded: boolean;
  readonly contentHash: string;
  /** Present for model nodes with a stored raw API response. */
  readonly generation?: {
    readonly provider: string;
    readonly modelIdentifier: string;
    readonly requestId?: string;
    readonly latencyMs: number;
    readonly tokenUsage?: TokenUsage;
    readonly responseTimestamp: Date;
  };
  /** Hash-chain verification result; only computed for model nodes. */
  readonly provenance?: ModelNodeProvenanceVerificationResult;
};

type UseNodeSheetDataInput = {
  readonly nodeId: ULID | null;
  readonly nodeRepo: Pick<INodeRepository, 'findById'>;
  readonly edgeRepo: Pick<IEdgeRepository, 'findContinuationsByTargetNodeId'>;
  readonly rawApiResponseRepo: Pick<
    IRawApiResponseRepository,
    'findByNodeId' | 'findModelIdentifiersByNodeIds'
  >;
  readonly agentRepo: Pick<IAgentRepository, 'findById'>;
};

/**
 * Loads everything a node sheet shows: the node's text and metadata, the
 * model it came from, the stored raw-API-response evidence record, and a
 * live hash-chain provenance verification (model nodes only).
 */
export const useNodeSheetData = (input: UseNodeSheetDataInput) => {
  const { nodeId, nodeRepo, edgeRepo, rawApiResponseRepo, agentRepo } = input;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<NodeSheetData | null>(null);

  const reload = useCallback(async () => {
    if (!nodeId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const node = await nodeRepo.findById(nodeId, true);
      if (!node) {
        throw new Error(`Node not found: ${nodeId}`);
      }

      const isModelNode = node.authorType === 'model';
      const modelLabels = await resolveNodeModelLabels([node], {
        rawApiResponseRepository: rawApiResponseRepo,
        agentRepository: agentRepo,
      });
      const [rawApiResponse, provenance] = isModelNode
        ? await Promise.all([
            rawApiResponseRepo.findByNodeId(node.id),
            verifyModelNodeProvenance({
              nodeId: node.id,
              nodeRepository: nodeRepo,
              edgeRepository: edgeRepo,
              rawApiResponseRepository: rawApiResponseRepo,
            }),
          ])
        : [null, undefined];

      setData({
        nodeId: node.id,
        localId: String(node.localId),
        authorType: node.authorType,
        modelLabel: modelLabels.get(node.id) ?? '',
        text:
          node.content.type === 'text'
            ? node.content.text
            : `[${node.content.type}]`,
        createdAt: node.createdAt,
        editedFrom: node.editedFrom,
        bookmarked: node.metadata.bookmarked,
        pruned: node.metadata.pruned,
        excluded: node.metadata.excluded,
        contentHash: String(node.contentHash),
        ...(rawApiResponse
          ? {
              generation: {
                provider: rawApiResponse.provider,
                modelIdentifier: rawApiResponse.modelIdentifier,
                requestId: rawApiResponse.requestId,
                latencyMs: rawApiResponse.latencyMs,
                tokenUsage: rawApiResponse.tokenUsage,
                responseTimestamp: rawApiResponse.responseTimestamp,
              },
            }
          : {}),
        ...(provenance ? { provenance } : {}),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [agentRepo, edgeRepo, nodeId, nodeRepo, rawApiResponseRepo]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { loading, error, data, reload };
};
