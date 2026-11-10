import { useCallback, useMemo, useRef, useState } from 'react';
import type {
  IEdgeRepository,
  INodeRepository,
  IPathRepository,
} from '@application/repositories';
import type { Node } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import type { ContinuationPreview } from './types';

type UseNodeContinuationsInput = {
  readonly edgeRepo: Pick<IEdgeRepository, 'findBySourceNodeId'>;
  readonly nodeRepo: Pick<INodeRepository, 'findById' | 'updateMetadata'>;
  readonly pathRepo: Pick<IPathRepository, 'getNodeSequence'>;
  readonly pathId?: ULID;
};

const toContinuationPreview = (input: {
  readonly node: Node;
  readonly activePathNodeIds: readonly ULID[];
  readonly activeIndexByNodeId: ReadonlyMap<ULID, number>;
}): ContinuationPreview => {
  const { node, activePathNodeIds, activeIndexByNodeId } = input;
  const activeIndex = activeIndexByNodeId.get(node.id);
  const onBranchCount =
    activeIndex !== undefined ? activePathNodeIds.length - activeIndex : 1;

  return {
    nodeId: node.id,
    localId: String(node.localId),
    previewText:
      node.content.type === 'text'
        ? node.content.text
        : `[${node.content.type}]`,
    isOnActivePath: activeIndex !== undefined,
    onBranchCount: Math.max(1, onBranchCount),
    isBookmarked: node.metadata.bookmarked,
  };
};

export const useNodeContinuations = (input: UseNodeContinuationsInput) => {
  const { edgeRepo, nodeRepo, pathRepo, pathId } = input;

  const [sourceNodeId, setSourceNodeIdState] = useState<ULID | null>(null);
  // The node the rail shows right now, readable after an await: a load
  // finishing after the rail was closed or moved must not reopen or replace it.
  const sourceRef = useRef<ULID | null>(null);
  const setSourceNodeId = useCallback((next: ULID | null) => {
    sourceRef.current = next;
    setSourceNodeIdState(next);
  }, []);
  const [sourceLocalId, setSourceLocalId] = useState<string | undefined>(
    undefined
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ContinuationPreview[]>([]);

  const visible = useMemo(() => Boolean(sourceNodeId), [sourceNodeId]);

  const hide = useCallback(() => {
    setSourceNodeId(null);
    setSourceLocalId(undefined);
    setItems([]);
    setLoading(false);
    setError(null);
  }, [setSourceNodeId]);

  const reload = useCallback(
    async (nextSourceNodeId: ULID) => {
      if (!pathId) {
        return;
      }

      const isChangingSource = nextSourceNodeId !== sourceRef.current;
      if (isChangingSource) {
        setSourceNodeId(nextSourceNodeId);
        setSourceLocalId(undefined);
        setItems([]);
      }

      setLoading(true);
      setError(null);

      try {
        const [sourceNode, outgoingEdges, pathNodes] = await Promise.all([
          nodeRepo.findById(nextSourceNodeId, true),
          edgeRepo.findBySourceNodeId(nextSourceNodeId),
          pathRepo.getNodeSequence(pathId),
        ]);
        if (sourceRef.current !== nextSourceNodeId) {
          return;
        }
        setSourceLocalId(sourceNode ? String(sourceNode.localId) : undefined);

        const continuationTargets = outgoingEdges
          .filter((edge) => edge.edgeType === 'continuation')
          .map((edge) => edge.targetNodeId);
        const targetNodes = await Promise.all(
          continuationTargets.map((nodeId) => nodeRepo.findById(nodeId, true))
        );
        const resolved = targetNodes.filter((node): node is Node =>
          Boolean(node)
        );
        resolved.sort(
          (left, right) => left.createdAt.getTime() - right.createdAt.getTime()
        );

        const activePathNodeIds = pathNodes.map((node) => node.nodeId);
        const activeIndexByNodeId = new Map<ULID, number>();
        activePathNodeIds.forEach((nodeId, index) => {
          activeIndexByNodeId.set(nodeId, index);
        });

        if (sourceRef.current !== nextSourceNodeId) {
          return;
        }
        const nextItems = resolved.map((node) =>
          toContinuationPreview({
            node,
            activePathNodeIds,
            activeIndexByNodeId,
          })
        );
        setItems(nextItems);
      } catch (caught) {
        if (sourceRef.current !== nextSourceNodeId) {
          return;
        }
        setError(caught instanceof Error ? caught.message : String(caught));
        setItems([]);
      } finally {
        if (sourceRef.current === nextSourceNodeId) {
          setLoading(false);
        }
      }
    },
    [edgeRepo, nodeRepo, pathId, pathRepo, setSourceNodeId]
  );

  /**
   * Reloads the rail only if it is open on `nodeId` now, so a background
   * refresh (a parallel card saving) never reopens a closed rail or replaces
   * the node the user moved to.
   */
  const refreshIfShowing = useCallback(
    async (nodeId: ULID) => {
      if (sourceRef.current !== nodeId) {
        return;
      }
      await reload(nodeId);
    },
    [reload]
  );

  const toggleBookmark = useCallback(
    async (nodeId: ULID) => {
      const node = await nodeRepo.findById(nodeId, true);
      if (!node) {
        return;
      }
      const updated = await nodeRepo.updateMetadata(nodeId, {
        bookmarked: !node.metadata.bookmarked,
      });
      setItems((current) =>
        current.map((item) =>
          item.nodeId === nodeId
            ? {
                ...item,
                isBookmarked: updated.metadata.bookmarked,
              }
            : item
        )
      );
    },
    [nodeRepo]
  );

  return {
    visible,
    sourceNodeId,
    sourceLocalId,
    loading,
    error,
    items,
    showForNode: reload,
    refreshIfShowing,
    reloadForCurrentNode: sourceNodeId ? () => reload(sourceNodeId) : undefined,
    hide,
    toggleBookmark,
  };
};
