import { useCallback, useRef, useState } from 'react';
import type { ULID } from '@domain/value-objects';
import type { ContinuationMenuAction } from '../continuation-menu';
import type { BookmarkMenuAction } from './bookmark-menu';
import type { NodeInfoMenuAction } from './node-info-menu';
import type { NodeSheetKind, NodeSheetTarget } from './node-sheet-target';

type NodeAction = (nodeId: ULID) => Promise<void>;

type UseNodeSheetInput = {
  readonly rewindToNode: NodeAction;
  readonly retraceBranch: NodeAction;
  readonly copyNodeText: NodeAction;
  readonly toggleBookmark: NodeAction;
  readonly togglePrune: NodeAction;
  readonly startEditForNode: NodeAction;
  /** Asks for a bookmark's new label and saves it. */
  readonly renameBookmark: (
    nodeId: ULID,
    currentLabel: string | undefined
  ) => Promise<void>;
};

/**
 * The node sheet: which node it shows, and what its menus do. Moving the
 * path (Rewind, Make Current, Retrace) closes it, as Latent Spaces' does,
 * and so does Node Info's Bookmark (NodeSheetView.swift:85-106) and a
 * bookmark sheet's "Bookmarked", which removes the bookmark
 * (BookmarkSheet.swift:131-142). Edit waits until the sheet has gone, so the
 * composer can take focus.
 */
export const useNodeSheet = ({
  rewindToNode,
  retraceBranch,
  copyNodeText,
  toggleBookmark,
  togglePrune,
  startEditForNode,
  renameBookmark,
}: UseNodeSheetInput) => {
  const [target, setTarget] = useState<NodeSheetTarget | null>(null);
  const afterDismissRef = useRef<(() => void) | null>(null);

  const open = useCallback((nodeId: ULID, kind: NodeSheetKind) => {
    setTarget({ nodeId, kind });
  }, []);
  const close = useCallback(() => setTarget(null), []);
  const onDismissed = useCallback(() => {
    const next = afterDismissRef.current;
    afterDismissRef.current = null;
    next?.();
  }, []);

  const onInfoAction = useCallback(
    async (nodeId: ULID, action: NodeInfoMenuAction) => {
      switch (action) {
        case 'copy':
          await copyNodeText(nodeId);
          break;
        case 'rewind':
          close();
          await rewindToNode(nodeId);
          break;
        case 'bookmark':
          close();
          await toggleBookmark(nodeId);
          break;
        case 'edit':
          afterDismissRef.current = () => void startEditForNode(nodeId);
          close();
          break;
        case 'prune':
          await togglePrune(nodeId);
          break;
      }
    },
    [
      close,
      copyNodeText,
      rewindToNode,
      startEditForNode,
      toggleBookmark,
      togglePrune,
    ]
  );

  const onContinuationAction = useCallback(
    async (nodeId: ULID, action: ContinuationMenuAction) => {
      switch (action) {
        case 'makeCurrent':
          close();
          await rewindToNode(nodeId);
          break;
        case 'retrace':
          close();
          await retraceBranch(nodeId);
          break;
        case 'copy':
          await copyNodeText(nodeId);
          break;
        case 'bookmark':
          await toggleBookmark(nodeId);
          break;
      }
    },
    [close, copyNodeText, retraceBranch, rewindToNode, toggleBookmark]
  );

  const onBookmarkAction = useCallback(
    async (
      nodeId: ULID,
      action: BookmarkMenuAction,
      label: string | undefined
    ) => {
      switch (action) {
        case 'rename':
          await renameBookmark(nodeId, label);
          break;
        case 'bookmark':
          close();
          await toggleBookmark(nodeId);
          break;
        default:
          await onContinuationAction(nodeId, action);
      }
    },
    [close, onContinuationAction, renameBookmark, toggleBookmark]
  );

  return {
    target,
    open,
    close,
    onDismissed,
    onInfoAction,
    onContinuationAction,
    onBookmarkAction,
  };
};
