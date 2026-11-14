import type { NodeAuthorType } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import {
  menuControlGroup,
  menuItem,
  menuSection,
  submenu,
  type MenuTreeNode,
} from '@/interface/ui/components/native-menu-tree';

export type TreeMenuCommand =
  | { readonly type: 'model' }
  | { readonly type: 'voiceMode' }
  | { readonly type: 'editTitle' }
  | { readonly type: 'editDescription' }
  | { readonly type: 'openBookmark'; readonly nodeId: ULID }
  | { readonly type: 'export' }
  | { readonly type: 'onboarding' }
  | { readonly type: 'tags' }
  | { readonly type: 'exportPath' };

/** A bookmark as the menu lists it. */
export type TreeMenuBookmark = {
  readonly nodeId: ULID;
  /** Its label, else its text (`bookmarkTitle ?? text`). */
  readonly title: string;
  readonly authorType: NodeAuthorType;
};

type TreeMenuNode = MenuTreeNode<TreeMenuCommand>;

const item = menuItem<TreeMenuCommand>;
const section = menuSection<TreeMenuCommand>;

const bookmarkItem = (bookmark: TreeMenuBookmark): TreeMenuNode =>
  item(
    bookmark.title,
    bookmark.authorType === 'human' ? 'person.fill' : 'sparkles',
    { type: 'openBookmark', nodeId: bookmark.nodeId }
  );

/**
 * The tree's toolbar menu, in Latent Spaces' order (ToolbarMenu.swift:
 * 31-102): Model and Voice Mode side by side, Edit Title and Edit
 * Description, the Bookmarks submenu between dividers once there is a
 * bookmark, Export to OpenLoom Format, then Show Onboarding. Aspen Grove's
 * own Tags and Markdown export follow after a last divider.
 */
export const buildTreeMenu = (input: {
  readonly voiceModeEnabled: boolean;
  readonly bookmarks: readonly TreeMenuBookmark[];
}): readonly TreeMenuNode[] => {
  const editItems = [
    item('Edit Title', 'text.book.closed', { type: 'editTitle' }),
    item('Edit Description', 'book.pages', {
      type: 'editDescription',
    }),
  ];
  const exportItem = item('Export to OpenLoom Format', 'tree', {
    type: 'export',
  });

  return [
    menuControlGroup<TreeMenuCommand>([
      item('Model', 'cpu', { type: 'model' }),
      item(
        'Voice Mode',
        'waveform',
        { type: 'voiceMode' },
        input.voiceModeEnabled
      ),
    ]),
    ...(input.bookmarks.length > 0
      ? [
          section(editItems),
          section([submenu('Bookmarks', input.bookmarks.map(bookmarkItem))]),
          section([exportItem]),
        ]
      : [section([...editItems, exportItem])]),
    section([
      item('Show Onboarding', 'questionmark.circle', {
        type: 'onboarding',
      }),
    ]),
    section([
      item('Tags', 'tag', { type: 'tags' }),
      item('Export Path (Markdown)', 'doc.plaintext', {
        type: 'exportPath',
      }),
    ]),
  ];
};
