import type { NativeMenuSections } from '@/interface/ui/components/native-menu';
import {
  buildContinuationMenuSections,
  type ContinuationMenuAction,
} from '../continuation-menu';

export type BookmarkMenuAction = 'rename' | ContinuationMenuAction;

/**
 * A bookmark sheet's menu (BookmarkSheet.swift:76-128): Rename Bookmark, a
 * divider, then a continuation's items (Make Current Node, Retrace Branch,
 * a divider, Copy Text, Bookmarked).
 */
export const buildBookmarkMenuSections = (
  bookmarked: boolean
): NativeMenuSections<BookmarkMenuAction> => [
  [{ action: 'rename', title: 'Rename Bookmark', systemIcon: 'pencil' }],
  ...buildContinuationMenuSections(bookmarked),
];

/** The Rename Bookmark alert (BookmarkSheet.swift:63-71). */
export const renameBookmarkPrompt = (label: string | undefined) => ({
  title: 'Rename Bookmark',
  message: 'Enter a new title for this bookmark',
  initialValue: label ?? '',
  placeholder: 'Title',
});
