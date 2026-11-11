import { useCallback, type MutableRefObject } from 'react';
import * as Clipboard from 'expo-clipboard';
import type { ImperativeRouter } from 'expo-router';
import type { INodeRepository } from '@application/repositories';
import type { ULID } from '@domain/value-objects';
import { contentToDisplayText } from '../node-text';
import type { ChatRow, ChatSession } from '../types';

type UseNodeActionsInput = {
  readonly rows: readonly ChatRow[];
  readonly session: ChatSession | null;
  readonly activeTreeIdRef: MutableRefObject<ULID | null>;
  readonly router: Pick<ImperativeRouter, 'push'>;
  readonly nodeRepo: Pick<INodeRepository, 'findById' | 'updateMetadata'>;
  readonly refreshRowsAndContinuations: (session: ChatSession) => Promise<void>;
};

/**
 * Single-node actions that don't generate: look up a loaded row, copy its
 * text, open its detail route, and toggle its bookmark or prune flag.
 */
export const useNodeActions = ({
  rows,
  session,
  activeTreeIdRef,
  router,
  nodeRepo,
  refreshRowsAndContinuations,
}: UseNodeActionsInput) => {
  const getRowById = useCallback(
    (nodeId: ULID) => rows.find((row) => row.id === nodeId),
    [rows]
  );

  const copyNodeText = useCallback(
    async (nodeId: ULID) => {
      const row = getRowById(nodeId);
      if (row) {
        await Clipboard.setStringAsync(row.text);
        return;
      }

      const node = await nodeRepo.findById(nodeId, true);
      if (!node) {
        return;
      }

      await Clipboard.setStringAsync(contentToDisplayText(node.content));
    },
    [getRowById, nodeRepo]
  );

  const openNodeDetail = useCallback(
    (nodeId: ULID) => {
      const treeId = session?.treeId ?? activeTreeIdRef.current;
      if (!treeId) {
        return;
      }
      router.push({
        pathname: '/tree/[treeId]/node/[nodeId]',
        params: { treeId, nodeId },
      });
    },
    [activeTreeIdRef, router, session?.treeId]
  );

  const toggleBookmark = useCallback(
    async (nodeId: ULID) => {
      const node = await nodeRepo.findById(nodeId, true);
      if (!node || !session) {
        return;
      }
      await nodeRepo.updateMetadata(nodeId, {
        bookmarked: !node.metadata.bookmarked,
      });
      await refreshRowsAndContinuations(session);
    },
    [nodeRepo, refreshRowsAndContinuations, session]
  );

  // Pruned nodes stay on the tree (and any path) but are excluded from
  // generation context by the context assembler.
  const togglePrune = useCallback(
    async (nodeId: ULID) => {
      const node = await nodeRepo.findById(nodeId, true);
      if (!node || !session) {
        return;
      }
      await nodeRepo.updateMetadata(nodeId, {
        pruned: !node.metadata.pruned,
      });
      await refreshRowsAndContinuations(session);
    },
    [nodeRepo, refreshRowsAndContinuations, session]
  );

  return {
    getRowById,
    copyNodeText,
    openNodeDetail,
    toggleBookmark,
    togglePrune,
  };
};
