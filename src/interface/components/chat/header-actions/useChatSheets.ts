import { useState } from 'react';
import type { ULID } from '@domain/value-objects';

type UseChatSheetsInput = {
  readonly treeId: ULID | null;
  readonly onSessionInvalidated: () => Promise<void>;
};

/** The header menu's Dialogue Settings and Tags sheets: whether each is open. */
export const useChatSheets = ({
  treeId,
  onSessionInvalidated,
}: UseChatSheetsInput) => {
  const [dialogueSettingsVisible, setDialogueSettingsVisible] = useState(false);
  const [tagsVisible, setTagsVisible] = useState(false);

  return {
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
