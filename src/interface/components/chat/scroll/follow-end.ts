/** What the list showed last time the auto-scroll effect looked. */
export type ListTail = {
  /** The last row's node id, or null for an empty list. */
  readonly lastRowId: string | null;
  readonly loading: boolean;
  readonly sending: boolean;
};

/**
 * Whether a change to the rows should take the list to its end: new content
 * at the end (a different last row), a load finishing, or a single send
 * starting or ending (its indicator, or an error notice, at the end).
 * Rows rebuilt with the same path (a parallel run settling, a bookmark or a
 * continuation count changing) leave the reader where they are.
 */
export const shouldFollowEnd = (
  previous: ListTail | null,
  next: ListTail
): boolean => {
  if (next.loading) {
    return false;
  }
  if (previous === null || previous.loading) {
    return true;
  }
  if (next.sending !== previous.sending) {
    return true;
  }
  return next.lastRowId !== previous.lastRowId;
};
