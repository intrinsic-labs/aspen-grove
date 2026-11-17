/**
 * A new tree's first message, handed from Home's composer to the tree it
 * opens. Home creates the tree, leaves the message here and opens it; the
 * tree takes it once, when it is ready, and either sends it through the
 * composer's own send path or, for a message carried over from before setup,
 * leaves it in the composer as a draft. In memory only: nothing is written
 * until the tree sends it.
 */
export type FirstMessage = {
  readonly text: string;
  /** Send it as the tree opens, or leave it in the composer. */
  readonly mode: 'send' | 'draft';
};

const pending = new Map<string, FirstMessage>();

export const setFirstMessage = (
  treeId: string,
  text: string,
  mode: FirstMessage['mode'] = 'send'
): void => {
  pending.set(treeId, { text, mode });
};

/** Returns the waiting message, if any, and forgets it. */
export const takeFirstMessage = (treeId: string): FirstMessage | undefined => {
  const message = pending.get(treeId);
  pending.delete(treeId);
  return message;
};

export const hasFirstMessage = (treeId: string): boolean => pending.has(treeId);
