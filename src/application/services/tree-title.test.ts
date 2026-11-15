import { describe, expect, it } from '@jest/globals';
import {
  isDefaultTreeTitle,
  isProvisionalTreeTitle,
  titleFromFirstMessage,
} from './tree-title';

describe('isDefaultTreeTitle', () => {
  it('recognizes the timestamp placeholder', () => {
    expect(isDefaultTreeTitle('Loom Tree 2026-11-10T09:12:00.000Z')).toBe(true);
    expect(isDefaultTreeTitle('Loom Tree notes')).toBe(false);
  });
});

describe('titleFromFirstMessage', () => {
  it('takes the first four words and marks the rest with "..."', () => {
    expect(
      titleFromFirstMessage('Tools for LLMs: how good are you at writing them?')
    ).toBe('Tools for LLMs: how...');
  });

  it('keeps a short message whole', () => {
    expect(titleFromFirstMessage('Hello there')).toBe('Hello there');
    expect(titleFromFirstMessage('one two three four')).toBe(
      'one two three four'
    );
  });

  it('keeps the title on one line', () => {
    expect(titleFromFirstMessage('  first\nsecond   third\tfourth fifth')).toBe(
      'first second third fourth...'
    );
  });
});

describe('isProvisionalTreeTitle', () => {
  const message = 'What are aspens and why do they clone?';

  it('treats the placeholder and the first-message title as provisional', () => {
    expect(
      isProvisionalTreeTitle('Loom Tree 2026-11-10T09:12:00.000Z', message)
    ).toBe(true);
    expect(isProvisionalTreeTitle('What are aspens and...', message)).toBe(
      true
    );
  });

  it('never treats a typed title as provisional', () => {
    expect(isProvisionalTreeTitle('Aspen notes', message)).toBe(false);
  });
});
