import type { NativeMenuSections } from '@/interface/ui/components/native-menu';

export type ContinuationMenuAction =
  | 'makeCurrent'
  | 'retrace'
  | 'copy'
  | 'bookmark';

/**
 * A continuation's menu, on the card's long press and in its "Continuation
 * Node" sheet (ChildNodeView.swift:120-145): Make Current Node and Retrace
 * Branch, a divider, then Copy Text and Bookmark ("Bookmarked" once set).
 */
export const buildContinuationMenuSections = (
  bookmarked: boolean
): NativeMenuSections<ContinuationMenuAction> => [
  [
    {
      action: 'makeCurrent',
      title: 'Make Current Node',
      systemIcon: 'text.line.last.and.arrowtriangle.forward',
    },
    {
      action: 'retrace',
      title: 'Retrace Branch',
      systemIcon:
        'point.bottomleft.forward.to.point.topright.filled.scurvepath',
    },
  ],
  [
    {
      action: 'copy',
      title: 'Copy Text',
      systemIcon: 'doc.on.doc',
    },
    {
      action: 'bookmark',
      title: bookmarked ? 'Bookmarked' : 'Bookmark',
      systemIcon: bookmarked ? 'bookmark.fill' : 'bookmark',
    },
  ],
];
