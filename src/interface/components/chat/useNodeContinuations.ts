import { useCallback, useMemo, useState } from 'react';
import type { IEdgeRepository, INodeRepository, IPathRepository } from '@application/repositories';
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
    previewText: node.content.type === 'text' ? node.content.text : `[${node.content.type}]`,
    isOnActivePath: activeIndex !== undefined,
    onBranchCount: Math.max(1, onBranchCount),
    isBookmarked: node.metadata.bookmarked,
  };
};

export const useNodeContinuations = (input: UseNodeContinuationsInput) => {
  const { edgeRepo, nodeRepo, pathRepo, pathId } = input;

  const [sourceNodeId, setSourceNodeId] = useState<ULID | null>(null);
  const [sourceLocalId, setSourceLocalId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ContinuationPreview[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<ULID | undefined>(undefined);

  const visible = useMemo(() => Boolean(sourceNodeId), [sourceNodeId]);

  const hide = useCallback(() => {
    setSourceNodeId(null);
    setSourceLocalId(undefined);
    setItems([]);
    setSelectedNodeId(undefined);
    setLoading(false);
    setError(null);
  }, []);

  const reload = useCallback(
    async (nextSourceNodeId: ULID) => {
      if (!pathId) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [sourceNode, outgoingEdges, pathNodes] = await Promise.all([
          nodeRepo.findById(nextSourceNodeId, true),
          edgeRepo.findBySourceNodeId(nextSourceNodeId),
          pathRepo.getNodeSequence(pathId),
        ]);

        setSourceNodeId(nextSourceNodeId);
        setSourceLocalId(sourceNode ? String(sourceNode.localId) : undefined);

        const continuationTargets = outgoingEdges
          .filter((edge) => edge.edgeType === 'continuation')
          .map((edge) => edge.targetNodeId);
        const targetNodes = await Promise.all(
          continuationTargets.map((nodeId) => nodeRepo.findById(nodeId, true))
        );
        const resolved = targetNodes.filter((node): node is Node => Boolean(node));
        resolved.sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());

        const activePathNodeIds = pathNodes.map((node) => node.nodeId);
        const activeIndexByNodeId = new Map<ULID, number>();
        activePathNodeIds.forEach((nodeId, index) => {
          activeIndexByNodeId.set(nodeId, index);
        });

        const nextItems = resolved.map((node) =>
          toContinuationPreview({
            node,
            activePathNodeIds,
            activeIndexByNodeId,
          })
        );
        setItems(nextItems);
        setSelectedNodeId(nextItems[0]?.nodeId);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [edgeRepo, nodeRepo, pathId, pathRepo]
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
    selectedNodeId,
    setSelectedNodeId,
    showForNode: reload,
    reloadForCurrentNode: sourceNodeId ? () => reload(sourceNodeId) : undefined,
    hide,
    toggleBookmark,
  };
};
