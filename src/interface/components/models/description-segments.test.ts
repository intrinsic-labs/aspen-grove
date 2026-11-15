import { describe, expect, it } from '@jest/globals';
import { toDescriptionSegments } from './description-segments';

describe('toDescriptionSegments', () => {
  it('keeps link text and bold, drops the Markdown around them', () => {
    expect(
      toDescriptionSegments(
        'Differs from [GPT-4o](/models/openai/gpt-4o), **not** for production.'
      )
    ).toEqual([
      { text: 'Differs from ' },
      { text: 'GPT-4o', link: true },
      { text: ', ' },
      { text: 'not', bold: true },
      { text: ' for production.' },
    ]);
  });

  it('passes plain text through', () => {
    expect(toDescriptionSegments('Plain.')).toEqual([{ text: 'Plain.' }]);
    expect(toDescriptionSegments('')).toEqual([]);
  });
});
