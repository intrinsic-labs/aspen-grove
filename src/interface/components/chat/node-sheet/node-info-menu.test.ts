import { describe, expect, it } from '@jest/globals';
import { buildNodeInfoMenuSections } from './node-info-menu';

const titles = (state: Parameters<typeof buildNodeInfoMenuSections>[0]) =>
  buildNodeInfoMenuSections(state).map((group) =>
    group.map((item) => item.title)
  );

describe('buildNodeInfoMenuSections', () => {
  it('follows Latent Spaces, then Aspen Grove’s Edit and Prune', () => {
    expect(
      titles({ isCurrent: false, bookmarked: false, pruned: false })
    ).toEqual([
      ['Copy All Text', 'Rewind To Node', 'Bookmark'],
      ['Edit', 'Prune'],
    ]);
  });

  it('turns Rewind off on the current node', () => {
    const [main] = buildNodeInfoMenuSections({
      isCurrent: true,
      bookmarked: false,
      pruned: false,
    });
    expect(main.find((item) => item.action === 'rewind')?.disabled).toBe(true);
  });

  it('says Bookmarked and Restore once set', () => {
    expect(
      titles({ isCurrent: false, bookmarked: true, pruned: true })
    ).toEqual([
      ['Copy All Text', 'Rewind To Node', 'Bookmarked'],
      ['Edit', 'Restore'],
    ]);
  });
});
