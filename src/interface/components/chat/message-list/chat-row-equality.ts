import type { ChatRow } from '../types';

/**
 * Whether two rows render the same. Reloading a path builds new row objects
 * for every node; comparing their fields lets the unchanged rows (the shared
 * prefix of a branch switch, a bookmark elsewhere) skip re-rendering.
 */
export const sameChatRow = (left: ChatRow, right: ChatRow): boolean =>
  left === right ||
  (left.id === right.id &&
    left.localId === right.localId &&
    left.editedFrom === right.editedFrom &&
    left.authorType === right.authorType &&
    left.text === right.text &&
    left.bookmarked === right.bookmarked &&
    left.pruned === right.pruned &&
    left.continuationCount === right.continuationCount);
