import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { createElement } from 'react';
import { Platform } from 'react-native';
import type { ContextMenuAction } from 'react-native-context-menu-view';
import type { ULID } from '@domain/value-objects';
import { act } from '@interface/test-support/render-hook';
import type { TreeMenuCommand } from './tree-menu';
import { TreeToolbarMenu } from './TreeToolbarMenu';

type CapturedMenu = {
  actions: ContextMenuAction[];
  onPress: (event: {
    nativeEvent: { index: number; indexPath?: number[]; name: string };
  }) => void;
};

let mockMenu: CapturedMenu | null = null;

jest.mock('react-native-context-menu-view', () => ({
  __esModule: true,
  default: (props: CapturedMenu & { children: unknown }) => {
    mockMenu = props;
    return props.children;
  },
}));
jest.mock('@/interface/ui/value-objects', () => ({
  HeaderIconButton: () => null,
}));

const TestRenderer: {
  create: (element: unknown) => { unmount: () => void };
} = require('react-test-renderer');

const bookmarks = [
  { nodeId: 'n1' as ULID, title: 'Tools v1', authorType: 'model' as const },
  { nodeId: 'n2' as ULID, title: 'A question', authorType: 'human' as const },
];

const renderMenu = async () => {
  const onCommand = jest.fn((_command: TreeMenuCommand) => {});
  await act(() => {
    TestRenderer.create(
      createElement(TreeToolbarMenu, {
        voiceModeEnabled: false,
        bookmarks,
        onCommand,
      })
    );
  });
  if (!mockMenu) {
    throw new Error('The native menu did not render.');
  }
  return { menu: mockMenu, onCommand };
};

/** How many submenu levels a set of actions has. */
const depth = (actions: readonly ContextMenuAction[] | undefined): number =>
  actions && actions.length > 0
    ? 1 + Math.max(...actions.map((action) => depth(action.actions)))
    : 0;

const press = (
  menu: CapturedMenu,
  nativeEvent: { index: number; indexPath?: number[] }
) => menu.onPress({ nativeEvent: { ...nativeEvent, name: '' } });

describe('TreeToolbarMenu on Android', () => {
  afterEach(() => {
    mockMenu = null;
    jest.restoreAllMocks();
  });

  const onAndroid = () => jest.replaceProperty(Platform, 'OS', 'android');

  it('runs a top-level item, which Android reports without an indexPath', async () => {
    onAndroid();
    const { menu, onCommand } = await renderMenu();

    expect(menu.actions[0]?.title).toBe('Model');
    press(menu, { index: 0 });

    expect(onCommand).toHaveBeenCalledWith({ type: 'model' });
  });

  it('draws Bookmarks as one submenu Android can show, with no empty sections', async () => {
    onAndroid();
    const { menu, onCommand } = await renderMenu();

    expect(depth(menu.actions)).toBeLessThanOrEqual(2);
    expect(menu.actions.map((action) => action.title)).toEqual([
      'Model',
      'Voice Mode',
      'Edit Title',
      'Edit Description',
      'Bookmarks',
      'Export to OpenLoom Format',
      'Show Onboarding',
      'Tags',
      'Export Path (Markdown)',
    ]);
    const bookmarksIndex = 4;
    expect(
      menu.actions[bookmarksIndex]?.actions?.map((action) => action.title)
    ).toEqual(['Tools v1', 'A question']);

    // Android reports a submenu item as [parent, item].
    press(menu, { index: 1, indexPath: [bookmarksIndex, 1] });
    expect(onCommand).toHaveBeenCalledWith({
      type: 'openBookmark',
      nodeId: 'n2',
    });
  });

  it('keeps the nested iOS menu and its index paths on iOS', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const { menu, onCommand } = await renderMenu();

    expect(menu.actions[0]?.preferredElementSize).toBe('medium');
    expect(menu.actions[2]?.actions?.[0]?.title).toBe('Bookmarks');
    press(menu, { index: 1, indexPath: [2, 0, 1] });
    expect(onCommand).toHaveBeenCalledWith({
      type: 'openBookmark',
      nodeId: 'n2',
    });
  });
});
