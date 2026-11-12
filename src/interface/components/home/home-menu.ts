import {
  menuItem,
  menuSection,
  submenu as menuSubmenu,
  type MenuTreeNode,
} from '@/interface/ui/components/native-menu-tree';
import type { ULID } from '@domain/value-objects';

export type HomeMenuCommand =
  | { readonly type: 'import' }
  | { readonly type: 'docs' }
  | { readonly type: 'info' }
  | { readonly type: 'onboarding' }
  | { readonly type: 'search' }
  | { readonly type: 'filterTag'; readonly tagId: ULID | null };

type HomeMenuNode = MenuTreeNode<HomeMenuCommand>;

const leaf = menuItem<HomeMenuCommand>;
const inlineSection = menuSection<HomeMenuCommand>;
const submenu = menuSubmenu<HomeMenuCommand>;

type MenuTag = { readonly id: ULID; readonly name: string };

/**
 * Home's `···` menu: Latent Spaces' items first, in its order
 * (HomeScreenView.swift:124-155): Import OpenLoom Tree in its own group,
 * then OpenLoom Docs, Info & Tutorials and Show Onboarding. Aspen Grove's
 * own Search and tag filter, which have no place in Latent Spaces, follow
 * in a last group. The tag filter is a submenu, shown once a tag exists.
 */
export const buildHomeMenu = (
  tags: readonly MenuTag[],
  activeTagId: ULID | null
): readonly HomeMenuNode[] => [
  inlineSection([leaf('Import OpenLoom Tree', 'tree', { type: 'import' })]),
  leaf('OpenLoom Docs', 'book', { type: 'docs' }),
  leaf('Info & Tutorials', 'info.circle', { type: 'info' }),
  leaf('Show Onboarding', 'questionmark.circle', { type: 'onboarding' }),
  inlineSection([
    leaf('Search', 'magnifyingglass', { type: 'search' }),
    ...(tags.length > 0
      ? [
          submenu(
            'Filter by Tag',
            [
              leaf(
                'All Trees',
                'tray.full',
                { type: 'filterTag', tagId: null },
                activeTagId === null
              ),
              ...tags.map((tag) =>
                leaf(
                  tag.name,
                  'tag',
                  { type: 'filterTag', tagId: tag.id },
                  tag.id === activeTagId
                )
              ),
            ],
            'tag'
          ),
        ]
      : []),
  ]),
];
