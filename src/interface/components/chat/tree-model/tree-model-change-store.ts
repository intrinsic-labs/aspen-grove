/**
 * Trees whose model settings or system message changed while their dialogue
 * sat under a pushed Model Settings screen. The dialogue re-reads its
 * session when it comes back into focus, once per change. In memory only.
 */
const changed = new Set<string>();

export const markTreeModelChanged = (treeId: string): void => {
  changed.add(treeId);
};

/** True once per change: the caller re-reads, and the mark is cleared. */
export const takeTreeModelChange = (treeId: string): boolean =>
  changed.delete(treeId);
