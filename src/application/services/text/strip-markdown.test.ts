import { describe, expect, it } from '@jest/globals';
import { stripMarkdown } from './strip-markdown';

describe('stripMarkdown', () => {
  it('drops heading marks and keeps the heading words', () => {
    expect(stripMarkdown('## Aspen at a glance ##\n\nText')).toBe(
      'Aspen at a glance\n\nText'
    );
    expect(stripMarkdown('#hashtag stays')).toBe('#hashtag stays');
  });

  it('drops bold, italic and strikethrough marks', () => {
    expect(
      stripMarkdown('The **root system** is *one* plant, ~~not~~ __many__.')
    ).toBe('The root system is one plant, not many.');
    expect(stripMarkdown('***both***')).toBe('both');
    expect(stripMarkdown('an _aside_ here')).toBe('an aside here');
  });

  it('leaves asterisks and underscores that are not emphasis', () => {
    expect(stripMarkdown('2 * 3 * 4 = 24')).toBe('2 * 3 * 4 = 24');
    expect(stripMarkdown('call snake_case_name now')).toBe(
      'call snake_case_name now'
    );
    expect(stripMarkdown('a lone * star')).toBe('a lone * star');
  });

  it('keeps code spans as typed, marks inside included', () => {
    expect(stripMarkdown('Run `a **b** _c_` now')).toBe('Run a **b** _c_ now');
    expect(stripMarkdown('``a `tick` here``')).toBe('a `tick` here');
  });

  it('drops a fence but keeps its code untouched', () => {
    expect(
      stripMarkdown(
        'Before\n\n```js\nconst x = a * b * c;\n# not a heading\n```\n\nAfter'
      )
    ).toBe('Before\n\nconst x = a * b * c;\n# not a heading\n\nAfter');
    expect(stripMarkdown('~~~\ncode\n~~~')).toBe('code');
  });

  it('keeps an unclosed fence’s code, as it streams in', () => {
    expect(stripMarkdown('Look:\n```py\nprint(**kw)')).toBe(
      'Look:\nprint(**kw)'
    );
  });

  it('turns a table into rows of cells without pipes or a divider row', () => {
    expect(
      stripMarkdown(
        '| Trait | Value |\n| --- | :---: |\n| Root system | `shared` |\n| Age | *old* |\n\nAfter'
      )
    ).toBe('Trait · Value\nRoot system · shared\nAge · old\n\nAfter');
  });

  it('leaves a pipe in prose alone', () => {
    expect(stripMarkdown('a | b')).toBe('a | b');
  });

  it('marks bullets with a dot and keeps numbers and indentation', () => {
    expect(stripMarkdown('- one\n  * two\n+ three\n1. first')).toBe(
      '• one\n  • two\n• three\n1. first'
    );
  });

  it('drops quote marks and horizontal rules', () => {
    expect(stripMarkdown('> quoted **line**\n\n---\n\nnext')).toBe(
      'quoted line\n\nnext'
    );
  });

  it('reads links and images as their words', () => {
    expect(
      stripMarkdown(
        'See [the docs](https://example.com) and ![a grove](g.png) at <https://x.dev>.'
      )
    ).toBe('See the docs and a grove at https://x.dev.');
  });

  it('turns escapes into the character alone, never a mark', () => {
    expect(stripMarkdown('\\*not italic\\* and 5\\_000')).toBe(
      '*not italic* and 5_000'
    );
  });

  it('collapses blank runs and trims', () => {
    expect(stripMarkdown('\n\na\n\n\n\nb\n\n')).toBe('a\n\nb');
    expect(stripMarkdown('')).toBe('');
  });
});
