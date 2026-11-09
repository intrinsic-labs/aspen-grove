export type ContinuationMenuAction = 'makeCurrent' | 'copy' | 'bookmark';

export type ContinuationMenuItem = {
  readonly action: ContinuationMenuAction;
  readonly title: string;
  readonly systemIcon?: string;
};

/** A continuation card's long-press menu. */
export const buildContinuationMenuItems = (
  bookmarked: boolean
): readonly ContinuationMenuItem[] =>
  [
    {
      action: 'makeCurrent',
      title: 'Make Current Node',
      systemIcon: 'checkmark.circle',
    },
    {
      action: 'copy',
      title: 'Copy Text',
      systemIcon: 'doc.on.doc',
    },
    {
      action: 'bookmark',
      title: bookmarked ? 'Remove Bookmark' : 'Bookmark',
      systemIcon: bookmarked ? 'bookmark.slash' : 'bookmark',
    },
  ] as const;
