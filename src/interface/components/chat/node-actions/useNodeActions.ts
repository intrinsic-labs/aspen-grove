import { useCallback } from 'react';
import * as Clipboard from 'expo-clipboard';
import type { INodeRepository } from '@application/repositories';
import type { ULID } from '@domain/value-objects';
import { contentToDisplayText } from '../node-text';
import type { ChatRow, ChatSession } from '../types';

type UseNodeActionsInput = {
  readonly rows: readonly ChatRow[];
  readonly session: ChatSession | null;
  readonly nodeRepo: Pick<INodeRepository, 'findById' | 'updateMetadata'>;
  readonly refreshRowsAndContinuations: (session: ChatSession) => Promise<void>;
};

/**
 * Single-node actions that don't generate: look up a loaded row, copy its
 * text, toggle its bookmark or prune flag, and relabel its bookmark.
 */
export const useNodeActions = ({
  rows,
  session,
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

  // An empty label clears it, so the sheet falls back to "Bookmarked Node".
  const renameBookmark = useCallback(
    async (nodeId: ULID, label: string) => {
      if (!session) {
        return;
      }
      const trimmed = label.trim();
      await nodeRepo.updateMetadata(nodeId, {
        bookmarkLabel: trimmed.length > 0 ? trimmed : null,
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
    toggleBookmark,
    renameBookmark,
    togglePrune,
  };
};
