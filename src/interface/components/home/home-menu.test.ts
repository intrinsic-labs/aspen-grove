import type { ULID } from '@domain/value-objects';
import { buildHomeMenu, commandAt, toContextMenuActions } from './home-menu';

const id = (value: string) => value as ULID;

describe('home menu', () => {
  it('keeps Latent Spaces’ items first, in order', () => {
    const titles = toContextMenuActions(buildHomeMenu([], null)).map(
      (action) => action.actions?.map((child) => child.title) ?? action.title
    );
    expect(titles).toEqual([
      ['Import OpenLoom Tree'],
      'OpenLoom Docs',
      'Info & Tutorials',
      'Show Onboarding',
      ['Search'],
    ]);
  });

  it('resolves a pressed item by its index path', () => {
    const menu = buildHomeMenu(
      [
        { id: id('t1'), name: 'poems' },
        { id: id('t2'), name: 'code' },
      ],
      id('t2')
    );
    expect(commandAt(menu, [0, 0])).toEqual({ type: 'import' });
    expect(commandAt(menu, [3])).toEqual({ type: 'onboarding' });
    expect(commandAt(menu, [4, 0])).toEqual({ type: 'search' });
    expect(commandAt(menu, [4, 1, 0])).toEqual({
      type: 'filterTag',
      tagId: null,
    });
    expect(commandAt(menu, [4, 1, 2])).toEqual({
      type: 'filterTag',
      tagId: 't2',
    });
    expect(commandAt(menu, [9])).toBeUndefined();
  });

  it('checks the active tag', () => {
    const actions = toContextMenuActions(
      buildHomeMenu([{ id: id('t1'), name: 'poems' }], id('t1'))
    );
    const filter = actions[4]?.actions?.[1];
    expect(filter?.actions?.map((a) => [a.title, a.selected ?? false])).toEqual(
      [
        ['All Trees', false],
        ['poems', true],
      ]
    );
  });
});
