/**
 * Whether leaving the screen deletes the tree: only a quick-created tree
 * (`ephemeral=1`) that is still empty. Emptiness comes from the rows on
 * screen as well as the sent flag, so a flag lost on a session reload (a
 * Fast Refresh re-runs the load and resets it) can't delete a tree that
 * has messages.
 */
export const shouldDeleteTreeOnLeave = (input: {
  readonly quickCreated: boolean;
  readonly hasUserSentMessage: boolean;
  readonly hasMessages: boolean;
  readonly hasTree: boolean;
}): boolean =>
  input.quickCreated &&
  input.hasTree &&
  !input.hasUserSentMessage &&
  !input.hasMessages;
