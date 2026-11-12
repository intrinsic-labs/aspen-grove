import type { ContextMenuAction } from 'react-native-context-menu-view';
import type { ULID } from '@domain/value-objects';

export type HomeMenuCommand =
  | { readonly type: 'import' }
  | { readonly type: 'docs' }
  | { readonly type: 'info' }
  | { readonly type: 'onboarding' }
  | { readonly type: 'search' }
  | { readonly type: 'filterTag'; readonly tagId: ULID | null };

type HomeMenuNode = {
  readonly action: ContextMenuAction;
  readonly command?: HomeMenuCommand;
  readonly children?: readonly HomeMenuNode[];
};

type MenuTag = { readonly id: ULID; readonly name: string };

const leaf = (
  title: string,
  systemIcon: string,
  command: HomeMenuCommand,
  selected?: boolean
): HomeMenuNode => ({
  action: { title, systemIcon, ...(selected ? { selected } : {}) },
  command,
});

const inlineSection = (children: readonly HomeMenuNode[]): HomeMenuNode => ({
  action: { title: '', inlineChildren: true },
  children,
});

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
          {
            action: { title: 'Filter by Tag', systemIcon: 'tag' },
            children: [
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
          },
        ]
      : []),
  ]),
];

/** The native menu's actions for `react-native-context-menu-view`. */
export const toContextMenuActions = (
  nodes: readonly HomeMenuNode[]
): ContextMenuAction[] =>
  nodes.map((node) =>
    node.children
      ? { ...node.action, actions: toContextMenuActions(node.children) }
      : node.action
  );

/** The command at a pressed item's index path, if any. */
export const commandAt = (
  nodes: readonly HomeMenuNode[],
  indexPath: readonly number[]
): HomeMenuCommand | undefined => {
  const [head, ...rest] = indexPath;
  const node = head === undefined ? undefined : nodes[head];
  if (!node) {
    return undefined;
  }
  if (rest.length === 0) {
    return node.command;
  }
  return node.children ? commandAt(node.children, rest) : undefined;
};
