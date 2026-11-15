import { useCallback } from 'react';
import type { IEdgeRepository } from '@application/repositories';
import { resolveBranchLeaf } from '@application/services/resolve-branch-leaf';
import type { ULID } from '@domain/value-objects';
import type { ChatRow } from '../types';

type UseRetraceBranchInput = {
  readonly rows: readonly ChatRow[];
  readonly edgeRepo: Pick<IEdgeRepository, 'findBySourceNodeId'>;
  readonly rewindToNode: (nodeId: ULID) => Promise<void>;
};

/**
 * Retrace Branch: makes current the end of the branch that runs down from
 * a node (Latent Spaces' `LoomTree.retrace(from:)`; see `resolveBranchLeaf`).
 */
export const useRetraceBranch = ({
  rows,
  edgeRepo,
  rewindToNode,
}: UseRetraceBranchInput) =>
  useCallback(
    async (nodeId: ULID) => {
      const leaf = await resolveBranchLeaf(
        nodeId,
        rows.map((row) => row.id),
        { edgeRepository: edgeRepo }
      );
      await rewindToNode(leaf);
    },
    [edgeRepo, rewindToNode, rows]
  );
