import { describe, expect, it } from '@jest/globals';
import { buildContinuationMenuSections } from './continuation-menu';

describe('continuation menu', () => {
  it("matches Latent Spaces' card and Continuation Node menu", () => {
    expect(
      buildContinuationMenuSections(false).map((section) =>
        section.map((item) => item.title)
      )
    ).toEqual([
      ['Make Current Node', 'Retrace Branch'],
      ['Copy Text', 'Bookmark'],
    ]);
  });

  it('reads "Bookmarked" with a filled symbol once bookmarked', () => {
    expect(buildContinuationMenuSections(true)[1][1]).toMatchObject({
      action: 'bookmark',
      title: 'Bookmarked',
      systemIcon: 'bookmark.fill',
    });
  });
});
