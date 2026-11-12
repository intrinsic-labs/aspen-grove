import { describe, expect, it } from '@jest/globals';
import { buildMessageMenuSections } from './message-menu';

const base = {
  bookmarked: false,
  pruned: false,
  continuationCount: 2,
  isCurrent: false,
};

const titles = (state: typeof base) =>
  buildMessageMenuSections(state).map((section) =>
    section.map((item) => item.title)
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
    const [first] = buildMessageMenuSections({ ...base, isCurrent: true });
    expect(first[0]).toMatchObject({ action: 'regenerate' });
    expect(first[0].disabled).toBeUndefined();
  });

  it('disables Continuations without children and Rewind on the current node', () => {
    const sections = buildMessageMenuSections({
      ...base,
      continuationCount: 0,
      isCurrent: true,
    });
    expect(sections[0][1]).toMatchObject({
      action: 'continuations',
      disabled: true,
    });
    expect(sections[1][0]).toMatchObject({ action: 'rewind', disabled: true });
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
