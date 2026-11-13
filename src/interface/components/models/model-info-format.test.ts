import {
  formatIsoDay,
  formatModalities,
  formatRowMeta,
  formatTokensCompact,
  formatTokensFull,
  formatUnixDate,
  openRouterModelUrl,
  splitModelName,
} from './model-info-format';

describe('formatTokensCompact', () => {
  it.each([
    [1_000_000, '1M'],
    [1_048_576, '1.05M'],
    [200_000, '200K'],
    [131_072, '131K'],
    [8192, '8K'],
    [512, '512'],
  ])('%p → %p', (tokens, text) => {
    expect(formatTokensCompact(tokens)).toBe(text);
  });
});

describe('formatTokensFull', () => {
  it('groups thousands', () => {
    expect(formatTokensFull(1_048_576)).toBe('1,048,576');
    expect(formatTokensFull(8192)).toBe('8,192');
    expect(formatTokensFull(512)).toBe('512');
  });
});

describe('dates', () => {
  it('formats Unix seconds as a UTC day', () => {
    expect(formatUnixDate(1794253781)).toBe('Nov 9, 2026');
  });

  it('formats a YYYY-MM-DD day, and leaves anything else', () => {
    expect(formatIsoDay('2026-03-01')).toBe('Mar 1, 2026');
    expect(formatIsoDay('early 2026')).toBe('early 2026');
  });
});

describe('formatModalities', () => {
  it('capitalizes and joins', () => {
    expect(formatModalities(['text', 'image', 'file'])).toBe(
      'Text, Image, File'
    );
  });
});

describe('splitModelName', () => {
  it('splits "Author: Model"', () => {
    expect(
      splitModelName({
        id: 'anthropic/claude-sonnet-5.5',
        displayName: 'Anthropic: Claude Sonnet 5.5',
      })
    ).toEqual({ author: 'Anthropic', title: 'Claude Sonnet 5.5' });
  });

  it("takes the author from the id when the name doesn't say", () => {
    expect(
      splitModelName({ id: '~unbiased/pareto-latest', displayName: 'Pareto' })
    ).toEqual({ author: 'unbiased', title: 'Pareto' });
  });
});

describe('formatRowMeta', () => {
  it('joins context and price', () => {
    expect(
      formatRowMeta({
        id: 'a/b',
        displayName: 'A: B',
        contextLength: 1_000_000,
        promptPricePerMTokens: 3,
        completionPricePerMTokens: 15,
      })
    ).toBe('1M context · $3/M in · $15/M out');
  });

  it('leaves out what it lacks', () => {
    expect(formatRowMeta({ id: 'a/b', displayName: 'A: B' })).toBe('');
  });
});

describe('openRouterModelUrl', () => {
  it('links the model, or the model an alias names', () => {
    expect(openRouterModelUrl({ id: 'openai/gpt-6' })).toBe(
      'https://openrouter.ai/openai/gpt-6'
    );
    expect(
      openRouterModelUrl({
        id: '~anthropic/claude-sonnet-latest',
        aliasOf: 'anthropic/claude-sonnet-5.5',
      })
    ).toBe('https://openrouter.ai/anthropic/claude-sonnet-5.5');
  });
});
