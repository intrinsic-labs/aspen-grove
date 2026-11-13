import { useState } from 'react';
import type { ULID } from '@domain/value-objects';

type UseChatSheetsInput = {
  readonly treeId: ULID | null;
};

/** The header menu's Tags sheet: whether it is open. */
export const useChatSheets = ({ treeId }: UseChatSheetsInput) => {
  const [tagsVisible, setTagsVisible] = useState(false);

  return {
    tags: {
      visible: tagsVisible,
      treeId,
      open: () => setTagsVisible(true),
      close: () => setTagsVisible(false),
    },
  };
};
