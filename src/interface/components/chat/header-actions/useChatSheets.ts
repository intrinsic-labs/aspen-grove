import { useRef, useState } from 'react';
import type { ULID } from '@domain/value-objects';

type UseChatSheetsInput = {
  readonly treeId: ULID | null;
  readonly rewindToNode: (nodeId: ULID) => Promise<void>;
  /** Opens a node's "Node Info" sheet. */
  readonly openNodeInfo: (nodeId: ULID) => void;
  readonly onSessionInvalidated: () => Promise<void>;
};

/**
 * The header menu's sheets (bookmarks, dialogue settings, tags): whether
 * each is open, and what the bookmarks sheet does with a chosen node.
 */
export const useChatSheets = ({
  treeId,
  rewindToNode,
  openNodeInfo,
  onSessionInvalidated,
}: UseChatSheetsInput) => {
  const [bookmarksVisible, setBookmarksVisible] = useState(false);
  // The node whose sheet opens once the bookmarks sheet has gone.
  const detailAfterBookmarksRef = useRef<ULID | null>(null);
  const [dialogueSettingsVisible, setDialogueSettingsVisible] = useState(false);
  const [tagsVisible, setTagsVisible] = useState(false);

  return {
    bookmarks: {
      visible: bookmarksVisible,
      treeId,
      open: () => setBookmarksVisible(true),
      close: () => setBookmarksVisible(false),
      onSelectNode: async (nodeId: ULID) => {
        setBookmarksVisible(false);
        await rewindToNode(nodeId);
      },
      // iOS can't present two sibling RN Modals at once, so the bookmarks
      // sheet slides away before the node's sheet comes up.
      onShowDetail: (nodeId: ULID) => {
        detailAfterBookmarksRef.current = nodeId;
        setBookmarksVisible(false);
      },
      onDismissed: () => {
        const nodeId = detailAfterBookmarksRef.current;
        detailAfterBookmarksRef.current = null;
        if (nodeId) {
          openNodeInfo(nodeId);
        }
      },
    },
    dialogueSettings: {
      visible: dialogueSettingsVisible,
      treeId,
      open: () => setDialogueSettingsVisible(true),
      close: () => setDialogueSettingsVisible(false),
      onSessionInvalidated,
    },
    tags: {
      visible: tagsVisible,
      treeId,
      open: () => setTagsVisible(true),
      close: () => setTagsVisible(false),
    },
  };
};
