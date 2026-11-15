import type { NativeMenuSections } from '@/interface/ui/components/native-menu';

export type ChatMessageMenuAction =
  | 'regenerate'
  | 'continuations'
  | 'edit'
  | 'rewind'
  | 'copy'
  | 'info'
  | 'bookmark'
  | 'prune';

export type MessageMenuState = {
  readonly bookmarked: boolean;
  readonly pruned: boolean;
  /** Children in the loom; Continuations is disabled without any. */
  readonly continuationCount: number;
  /** The path's current (last) node; Rewind To Node is disabled on it. */
  readonly isCurrent: boolean;
};

/**
 * A message row's long-press menu, in Latent Spaces' order and groups
 * (NodeView.swift:209-251): [Regenerate Response · Continuations], then
 * Rewind To Node and Copy Text, a divider, Node Info and Bookmark. Aspen
 * Grove's own Edit and Prune come last, after one more divider.
 *
 * Regenerate is on every node, as in Latent Spaces: on a model node it
 * draws a sibling response, on a human or system node a new reply under it
 * (which is how a send that failed gets its reply).
 */
export const buildMessageMenuSections = (
  state: MessageMenuState
): NativeMenuSections<ChatMessageMenuAction> => [
  [
    {
      action: 'regenerate',
      title: 'Regenerate Response',
      systemIcon: 'repeat',
    },
    {
      action: 'continuations',
      title: 'Continuations',
      systemIcon: 'text.append',
      disabled: state.continuationCount === 0,
    },
  ],
  [
    {
      action: 'rewind',
      title: 'Rewind To Node',
      systemIcon: 'backward',
      disabled: state.isCurrent,
    },
    {
      action: 'copy',
      title: 'Copy Text',
      systemIcon: 'doc.on.doc',
    },
  ],
  [
    {
      action: 'info',
      title: 'Node Info',
      systemIcon: 'magnifyingglass',
    },
    {
      action: 'bookmark',
      title: state.bookmarked ? 'Remove Bookmark' : 'Bookmark',
      systemIcon: state.bookmarked ? 'bookmark.fill' : 'bookmark',
    },
  ],
  [
    {
      action: 'edit',
      title: 'Edit',
      systemIcon: 'pencil',
    },
    {
      action: 'prune',
      title: state.pruned ? 'Restore' : 'Prune',
      systemIcon: state.pruned ? 'arrow.uturn.backward.circle' : 'scissors',
      destructive: !state.pruned,
    },
  ],
];
