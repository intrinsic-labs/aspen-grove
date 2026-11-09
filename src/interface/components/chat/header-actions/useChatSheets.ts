import { useState } from 'react';
import type { ULID } from '@domain/value-objects';

type UseChatSheetsInput = {
  readonly treeId: ULID | null;
  readonly rewindToNode: (nodeId: ULID) => Promise<void>;
  readonly openNodeDetail: (nodeId: ULID) => void;
  readonly onSessionInvalidated: () => Promise<void>;
};

/**
 * The header menu's sheets (bookmarks, dialogue settings, tags): whether
 * each is open, and what the bookmarks sheet does with a chosen node.
 */
export const useChatSheets = ({
  treeId,
  rewindToNode,
  openNodeDetail,
  onSessionInvalidated,
}: UseChatSheetsInput) => {
  const [bookmarksVisible, setBookmarksVisible] = useState(false);
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
      // iOS can't reliably present two sibling RN Modals at once, so the
      // bookmarks sheet closes before the detail route opens.
      onShowDetail: (nodeId: ULID) => {
        setBookmarksVisible(false);
        openNodeDetail(nodeId);
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
