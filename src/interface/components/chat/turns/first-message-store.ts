/**
 * A new tree's first message, handed from Home's composer to the tree it
 * opens. Home creates the tree, leaves the message here and opens it; the
 * tree takes it once, when it is ready to send, and sends it through the
 * composer's own send path. In memory only: nothing is written until the
 * tree sends it.
 */
const pending = new Map<string, string>();

export const setFirstMessage = (treeId: string, text: string): void => {
  pending.set(treeId, text);
};

/** Returns the waiting message, if any, and forgets it. */
export const takeFirstMessage = (treeId: string): string | undefined => {
  const text = pending.get(treeId);
  pending.delete(treeId);
  return text;
};

export const hasFirstMessage = (treeId: string): boolean => pending.has(treeId);
