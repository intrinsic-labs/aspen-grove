import { describe, expect, it } from '@jest/globals';
import { ContextAssemblyError } from '../context';
import {
  BUFFER_PREFIX_SEPARATOR,
  BUFFER_TRUNCATION_MARKER,
  assembleBufferContext,
} from './assemble-buffer-context';
import { textNode } from './buffer-graph-fixtures';

const base = { maxContextTokens: 100_000, maxTokens: 50 };
const nodes = (...texts: string[]) =>
  texts.map((text, i) => textNode(`n${i}`, text));

describe('literal text', () => {
  it('raw whitespace and blank lines survive', () => {
    const resolvedNodes = nodes('  Once upon\n\n', '\ta time,\r\n', ' ');
    const { prompt, droppedNodeCount } = assembleBufferContext({
      ...base,
      resolvedNodes,
      tail: '  the end \n',
    });
    expect(prompt).toBe('  Once upon\n\n\ta time,\r\n   the end \n');
    expect(droppedNodeCount).toBe(0);
  });

  it('adds nothing around an empty document', () => {
    expect(
      assembleBufferContext({ ...base, resolvedNodes: [], tail: '' }).prompt
    ).toBe('');
  });

  it('takes the text blocks of mixed content and skips other media', () => {
    const mixed = textNode('m', '', {
      content: {
        type: 'mixed',
        blocks: [
          { type: 'text', text: 'a ' },
          {
            type: 'image',
            ref: 'r',
            mimeType: 'image/png',
            width: 1,
            height: 1,
          },
          { type: 'text', text: 'b' },
        ],
      },
    });
    const audio = textNode('au', '', {
      content: {
        type: 'audio',
        ref: 'r',
        mimeType: 'audio/mp3',
        durationMs: 1,
      },
    });
    expect(
      assembleBufferContext({
        ...base,
        resolvedNodes: [mixed, audio],
        tail: '!',
      }).prompt
    ).toBe('a b!');
  });
});

describe('exclusion', () => {
  it('leaves out excluded and pruned nodes and keeps the rest verbatim', () => {
    const resolvedNodes = [
      textNode('a', 'keep '),
      textNode('b', 'hidden ', { excluded: true }),
      textNode('c', 'gone ', { pruned: true }),
      textNode('d', 'this'),
    ];
    expect(
      assembleBufferContext({ ...base, resolvedNodes, tail: '' }).prompt
    ).toBe('keep this');
  });
});

describe('system prefix', () => {
  const resolvedNodes = nodes('doc');

  it('is left out unless explicitly opted in', () => {
    const input = { ...base, resolvedNodes, tail: '', systemPrefix: 'RULES' };
    expect(assembleBufferContext(input).prompt).toBe('doc');
    expect(
      assembleBufferContext({ ...input, includeSystemPrefix: false }).prompt
    ).toBe('doc');
  });

  it('goes first with one blank line when opted in', () => {
    const { prompt } = assembleBufferContext({
      ...base,
      resolvedNodes,
      tail: '',
      systemPrefix: 'RULES',
      includeSystemPrefix: true,
    });
    expect(prompt).toBe(`RULES${BUFFER_PREFIX_SEPARATOR}doc`);
    expect(prompt).toBe('RULES\n\ndoc');
  });

  it('treats an empty prefix as none', () => {
    expect(
      assembleBufferContext({
        ...base,
        resolvedNodes,
        tail: '',
        systemPrefix: '',
        includeSystemPrefix: true,
      }).prompt
    ).toBe('doc');
  });

  it('refuses a prefix that alone exceeds the budget', () => {
    expect(() =>
      assembleBufferContext({
        resolvedNodes,
        tail: '',
        systemPrefix: 'x'.repeat(4000),
        includeSystemPrefix: true,
        maxContextTokens: 1500,
        maxTokens: 50,
      })
    ).toThrow(expect.objectContaining({ code: 'systemContextTooLong' }));
  });
});

describe('output reserve and overflow', () => {
  it('reserves at least 1024 tokens, or the requested length when larger', () => {
    const resolvedNodes = nodes('x'.repeat(400)); // 100 tokens
    const small = assembleBufferContext({
      resolvedNodes,
      tail: '',
      maxContextTokens: 1124,
      maxTokens: 50,
    });
    expect(small.promptBudgetTokens).toBe(100);
    expect(small.prompt).toHaveLength(400);
    expect(() =>
      assembleBufferContext({
        resolvedNodes,
        tail: '',
        maxContextTokens: 1124,
        maxTokens: 2000,
      })
    ).toThrow(ContextAssemblyError);
  });

  it('refuses an over-limit tail rather than splitting it', () => {
    expect(() =>
      assembleBufferContext({
        resolvedNodes: nodes('a', 'b'),
        tail: 'y'.repeat(4000),
        maxContextTokens: 1500,
        maxTokens: 50,
      })
    ).toThrow(expect.objectContaining({ code: 'contextExceedsLimit' }));
  });

  it('refuses when the protected first and last nodes do not fit', () => {
    const resolvedNodes = nodes(
      ...Array.from({ length: 12 }, () => 'z'.repeat(400))
    );
    expect(() =>
      assembleBufferContext({
        resolvedNodes,
        tail: '',
        maxContextTokens: 1024 + 700, // 8 protected nodes need 800
        maxTokens: 50,
      })
    ).toThrow(expect.objectContaining({ code: 'contextExceedsLimit' }));
  });

  it('refuses when every node is protected and still too long', () => {
    expect(() =>
      assembleBufferContext({
        resolvedNodes: nodes(
          ...Array.from({ length: 8 }, () => 'z'.repeat(400))
        ),
        tail: '',
        maxContextTokens: 1024 + 500,
        maxTokens: 50,
      })
    ).toThrow(expect.objectContaining({ code: 'contextExceedsLimit' }));
  });
});

describe('truncation', () => {
  // 20 nodes of 100 chars (25 tokens each); budget 1024 + 400 - 1024 = 400.
  const texts = Array.from({ length: 20 }, (_, i) =>
    String(i % 10).repeat(100)
  );
  const run = (maxContextTokens: number) =>
    assembleBufferContext({
      maxContextTokens,
      maxTokens: 50,
      resolvedNodes: nodes(...texts),
      tail: 'TAIL',
    });

  it('keeps everything when it fits', () => {
    const result = run(1024 + 600);
    expect(result.droppedNodeCount).toBe(0);
    expect(result.prompt).toBe(texts.join('') + 'TAIL');
  });

  it('drops one whole contiguous gap behind a single marker and counts it', () => {
    const result = run(1024 + 400);
    const parts = result.prompt.split(BUFFER_TRUNCATION_MARKER);
    expect(parts).toHaveLength(2);
    expect(result.prompt.startsWith(texts.slice(0, 4).join(''))).toBe(true);
    expect(result.prompt.endsWith(texts.slice(-4).join('') + 'TAIL')).toBe(
      true
    );
    const keptHead = parts[0].length / 100;
    expect(Number.isInteger(keptHead)).toBe(true);
    expect(result.droppedNodeCount).toBe(20 - keptHead - 4);
    expect(result.droppedNodeCount).toBeGreaterThan(0);
    expect(result.estimatedPromptTokens).toBeLessThanOrEqual(400);
  });

  it('drops the whole middle when only the protected nodes fit', () => {
    // 8 nodes (200 tokens) + tail + marker.
    const result = run(1024 + 215);
    expect(result.droppedNodeCount).toBe(12);
    expect(result.prompt).toBe(
      texts.slice(0, 4).join('') +
        BUFFER_TRUNCATION_MARKER +
        texts.slice(-4).join('') +
        'TAIL'
    );
  });
});
