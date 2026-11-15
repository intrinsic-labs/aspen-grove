import { describe, expect, it } from '@jest/globals';
import type { ULID } from '@domain/value-objects';
import {
  commandAt,
  toContextMenuActions,
} from '@/interface/ui/components/native-menu-tree';
import { buildTreeMenu } from './tree-menu';

const nodeId = (value: string) => value as ULID;

const sectionTitles = (menu: ReturnType<typeof buildTreeMenu>) =>
  toContextMenuActions(menu).map(
    (section) => section.actions?.map((item) => item.title) ?? []
  );

describe('tree menu', () => {
  it('keeps Latent Spaces’ order with no bookmarks, Aspen Grove’s items last', () => {
    expect(
      sectionTitles(buildTreeMenu({ voiceModeEnabled: false, bookmarks: [] }))
    ).toEqual([
      ['Model', 'Voice Mode'],
      ['Edit Title', 'Edit Description', 'Export to OpenLoom Format'],
      ['Show Onboarding'],
      ['Tags', 'Export Path (Markdown)'],
    ]);
  });

  it('draws Model and Voice Mode side by side, Voice Mode checked when on', () => {
    const [group] = toContextMenuActions(
      buildTreeMenu({ voiceModeEnabled: true, bookmarks: [] })
    );
    expect(group.preferredElementSize).toBe('medium');
    expect(group.actions?.[1]?.selected).toBe(true);
  });

  it('puts the Bookmarks submenu between dividers once there is one', () => {
    const menu = buildTreeMenu({
      voiceModeEnabled: false,
      bookmarks: [
        { nodeId: nodeId('n1'), title: 'Tools v1', authorType: 'model' },
        { nodeId: nodeId('n2'), title: 'A question', authorType: 'human' },
      ],
    });
    expect(sectionTitles(menu)).toEqual([
      ['Model', 'Voice Mode'],
      ['Edit Title', 'Edit Description'],
      ['Bookmarks'],
      ['Export to OpenLoom Format'],
      ['Show Onboarding'],
      ['Tags', 'Export Path (Markdown)'],
    ]);
    const bookmarks = toContextMenuActions(menu)[2]?.actions?.[0];
    expect(
      bookmarks?.actions?.map((item) => [item.title, item.systemIcon])
    ).toEqual([
      ['Tools v1', 'sparkles'],
      ['A question', 'person.fill'],
    ]);
    expect(commandAt(menu, [2, 0, 1])).toEqual({
      type: 'openBookmark',
      nodeId: 'n2',
    });
    expect(commandAt(menu, [0, 0])).toEqual({ type: 'model' });
    expect(commandAt(menu, [5, 1])).toEqual({ type: 'exportPath' });
  });
});
