import {
  menuControlGroup,
  menuSection,
  type MenuTreeNode,
} from '@/interface/ui/components/native-menu-tree';

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
export const buildMessageMenu = (
  state: MessageMenuState
): readonly MenuTreeNode<ChatMessageMenuAction>[] => {
  const item = (
    command: ChatMessageMenuAction,
    title: string,
    systemIcon: string,
    options: { disabled?: boolean; destructive?: boolean } = {}
  ): MenuTreeNode<ChatMessageMenuAction> => ({
    command,
    action: { title, systemIcon, ...options },
  });
  return [
    menuControlGroup([
      item('regenerate', 'Regenerate Response', 'repeat'),
      item('continuations', 'Continuations', 'text.append', {
        disabled: state.continuationCount === 0,
      }),
    ]),
    menuSection([
      item('rewind', 'Rewind To Node', 'backward', {
        disabled: state.isCurrent,
      }),
      item('copy', 'Copy Text', 'doc.on.doc'),
    ]),
    menuSection([
      item('info', 'Node Info', 'magnifyingglass'),
      item(
        'bookmark',
        state.bookmarked ? 'Remove Bookmark' : 'Bookmark',
        state.bookmarked ? 'bookmark.fill' : 'bookmark'
      ),
    ]),
    menuSection([
      item('edit', 'Edit', 'pencil'),
      item(
        'prune',
        state.pruned ? 'Restore' : 'Prune',
        state.pruned ? 'arrow.uturn.backward.circle' : 'scissors',
        {
          destructive: !state.pruned,
        }
      ),
    ]),
  ];
};
