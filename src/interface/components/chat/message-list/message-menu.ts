import type { ChatRow } from '../types';

export type ChatMessageMenuAction =
  | 'regenerate'
  | 'continuations'
  | 'edit'
  | 'rewind'
  | 'copy'
  | 'info'
  | 'bookmark'
  | 'prune';

export type ChatMessageMenuItem = {
  readonly action: ChatMessageMenuAction;
  readonly title: string;
  readonly systemIcon?: string;
  readonly destructive?: boolean;
};

/** A message row's long-press menu. */
export const buildMessageMenuItems = (
  bookmarked: boolean,
  pruned: boolean,
  authorType: ChatRow['authorType']
): readonly ChatMessageMenuItem[] =>
  [
    // Regenerate only makes sense on model rows ("replace this response
    // with a new sibling"). On user rows it read as "regenerate the reply
    // to this", which both confused the target and triggered an iOS
    // context-menu dismissal artifact when the rows below the still-mounted
    // pressed row reflowed mid-animation.
    ...(authorType === 'model'
      ? [
          {
            action: 'regenerate',
            title: 'Regenerate',
            systemIcon: 'arrow.clockwise',
          } as const,
        ]
      : []),
    {
      action: 'continuations',
      title: 'Continuations',
      systemIcon: 'point.topleft.down.curvedto.point.bottomright.up',
    },
    {
      action: 'edit',
      title: 'Edit',
      systemIcon: 'pencil',
    },
    {
      action: 'rewind',
      title: 'Rewind To Node',
      systemIcon: 'backward.end.alt',
    },
    {
      action: 'copy',
      title: 'Copy Text',
      systemIcon: 'doc.on.doc',
    },
    {
      action: 'info',
      title: 'Node Info',
      systemIcon: 'info.circle',
    },
    {
      action: 'bookmark',
      title: bookmarked ? 'Remove Bookmark' : 'Bookmark',
      systemIcon: bookmarked ? 'bookmark.slash' : 'bookmark',
    },
    {
      action: 'prune',
      title: pruned ? 'Restore' : 'Prune',
      systemIcon: pruned ? 'arrow.uturn.backward.circle' : 'scissors',
      destructive: !pruned,
    },
  ] as const;
