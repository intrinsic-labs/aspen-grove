import type { ULID } from '@domain/value-objects';
import { getHomeDraft, setHomeDraft } from '../../home/home-draft-store';
import { getDialogueDraft } from '../dialogue-draft-store';

/**
 * Puts an unsent draft back in Home's composer, so nothing typed is lost
 * when its tree goes away (a message carried into the first tree, then left
 * without sending). Text already on Home wins. Returns whether it moved.
 */
export const returnDraftToHome = (draft: string): boolean => {
  if (!draft.trim() || getHomeDraft().trim()) {
    return false;
  }
  setHomeDraft(draft);
  return true;
};

/** As `returnDraftToHome`, for the composer draft of the tree being discarded. */
export const returnTreeDraftToHome = (treeId: ULID): void => {
  returnDraftToHome(getDialogueDraft(treeId));
};
