import {
  commandAt,
  toContextMenuActions,
} from '@/interface/ui/components/native-menu-tree';
import { describe, expect, it } from '@jest/globals';
import { buildMessageMenu } from './message-menu';

const base = {
  bookmarked: false,
  pruned: false,
  continuationCount: 2,
  isCurrent: false,
};

const titles = (state: typeof base) =>
  buildMessageMenu(state).map((section) =>
    section.children?.map((item) => item.action.title)
  );

describe('message menu', () => {
  it("follows Latent Spaces' groups, with Edit and Prune after them", () => {
    expect(titles(base)).toEqual([
      ['Regenerate Response', 'Continuations'],
      ['Rewind To Node', 'Copy Text'],
      ['Node Info', 'Bookmark'],
      ['Edit', 'Prune'],
    ]);
  });

  it('offers Regenerate Response on every node, so a failed send can get its reply', () => {
    const [first] = buildMessageMenu({ ...base, isCurrent: true });
    expect(first.children?.[0]).toMatchObject({ command: 'regenerate' });
    expect(first.children?.[0].action.disabled).toBeUndefined();
  });

  it('disables Continuations without children and Rewind on the current node', () => {
    const sections = buildMessageMenu({
      ...base,
      continuationCount: 0,
      isCurrent: true,
    });
    expect(sections[0].children?.[1]).toMatchObject({
      command: 'continuations',
      action: { disabled: true },
    });
    expect(sections[1].children?.[0]).toMatchObject({
      command: 'rewind',
      action: { disabled: true },
    });
  });

  it('flips Bookmark and Prune once set', () => {
    expect(titles({ ...base, bookmarked: true, pruned: true })).toEqual([
      ['Regenerate Response', 'Continuations'],
      ['Rewind To Node', 'Copy Text'],
      ['Node Info', 'Remove Bookmark'],
      ['Edit', 'Restore'],
    ]);
  });
});

it('makes the first group a side-by-side ControlGroup', () => {
  expect(buildMessageMenu(base)[0].action).toEqual({
    title: '',
    inlineChildren: true,
    preferredElementSize: 'medium',
  });
});

it('dispatches the pressed item in every group without changing icons', () => {
  const menu = buildMessageMenu(base);
  expect(
    toContextMenuActions(menu).map((group) =>
      group.actions?.map((item) => item.systemIcon)
    )
  ).toEqual([
    ['repeat', 'text.append'],
    ['backward', 'doc.on.doc'],
    ['magnifyingglass', 'bookmark'],
    ['pencil', 'scissors'],
  ]);
  expect(
    menu.flatMap(
      (group, i) => group.children?.map((_, j) => commandAt(menu, [i, j])) ?? []
    )
  ).toEqual([
    'regenerate',
    'continuations',
    'rewind',
    'copy',
    'info',
    'bookmark',
    'edit',
    'prune',
  ]);
});
