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

const press = (
  menu: CapturedMenu,
  nativeEvent: { index: number; indexPath?: number[] }
) => menu.onPress({ nativeEvent: { ...nativeEvent, name: '' } });

const sectionTitles = (actions: readonly ContextMenuAction[]) =>
  actions.map((action) =>
    action.inlineChildren
      ? (action.actions ?? []).map((child) => child.title)
      : action.title
  );

describe('TreeToolbarMenu', () => {
  afterEach(() => {
    mockMenu = null;
    jest.restoreAllMocks();
  });

  it.each(['ios', 'android'])(
    'draws the same sections and Bookmarks submenu on %s',
    async (os) => {
      jest.replaceProperty(Platform, 'OS', os as typeof Platform.OS);
      const { menu, onCommand } = await renderMenu();

      expect(menu.actions[0]?.preferredElementSize).toBe('medium');
      expect(sectionTitles(menu.actions)).toEqual([
        ['Model', 'Voice Mode'],
        ['Edit Title', 'Edit Description'],
        ['Bookmarks'],
        ['Export to OpenLoom Format'],
        ['Show Onboarding'],
        ['Tags', 'Export Path (Markdown)'],
      ]);
      expect(
        menu.actions[2]?.actions?.[0]?.actions?.map((action) => action.title)
      ).toEqual(['Tools v1', 'A question']);

      // Both platforms report the full index path.
      press(menu, { index: 1, indexPath: [2, 0, 1] });
      expect(onCommand).toHaveBeenCalledWith({
        type: 'openBookmark',
        nodeId: 'n2',
      });
      press(menu, { index: 0, indexPath: [0, 0] });
      expect(onCommand).toHaveBeenLastCalledWith({ type: 'model' });
    }
  );
});
