import { describe, expect, it } from '@jest/globals';
import type { Content } from '@domain/entities';
import { contentToDisplayText, contentToPlainText } from './node-text';

const image: Content = {
  type: 'image',
  ref: 'blob:1',
  mimeType: 'image/png',
  width: 1,
  height: 1,
};

describe('contentToPlainText', () => {
  it('returns text content as is', () => {
    expect(contentToPlainText({ type: 'text', text: 'hello' })).toBe('hello');
  });

  it('joins mixed blocks with newlines and drops non-text blocks to empty', () => {
    const mixed: Content = {
      type: 'mixed',
      blocks: [
        { type: 'text', text: 'one' },
        {
          type: 'image',
          ref: 'blob:1',
          mimeType: 'image/png',
          width: 1,
          height: 1,
        },
        { type: 'text', text: 'two' },
      ],
    };
    expect(contentToPlainText(mixed)).toBe('one\n\ntwo');
  });

  it('returns an empty string for non-text content', () => {
    expect(contentToPlainText(image)).toBe('');
  });
});

describe('contentToDisplayText', () => {
  it('returns text content as is', () => {
    expect(contentToDisplayText({ type: 'text', text: 'hi' })).toBe('hi');
  });

  it('labels non-text content with its type', () => {
    expect(contentToDisplayText(image)).toBe('[image]');
    expect(contentToDisplayText({ type: 'mixed', blocks: [] })).toBe('[mixed]');
  });
});
