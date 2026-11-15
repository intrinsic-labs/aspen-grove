import { browserRows, toBrowserRow } from './browser-rows';
import type { ModelOption } from './model-options';

const option = (id: string, displayName: string): ModelOption => ({
  id,
  label: displayName,
  openRouter: {
    id,
    displayName,
    contextLength: 200_000,
    promptPricePerMTokens: 3,
    completionPricePerMTokens: 15,
  },
});

describe('toBrowserRow', () => {
  it('splits the author out and adds the figures', () => {
    expect(
      toBrowserRow(option('anthropic/claude-x', 'Anthropic: Claude X'))
    ).toEqual({
      id: 'anthropic/claude-x',
      title: 'Claude X',
      author: 'Anthropic',
      meta: '200K context · $3/M in · $15/M out',
    });
  });

  it('shows a model without catalog data by its label and detail', () => {
    expect(
      toBrowserRow({ id: 'mock-model', label: 'Mock', detail: '8K ctx' })
    ).toEqual({ id: 'mock-model', title: 'Mock', meta: '8K ctx' });
  });
});

describe('browserRows', () => {
  const options = [
    option('openai/gpt-6', 'OpenAI: GPT-6'),
    option('anthropic/claude-x', 'Anthropic: Claude X'),
    option('anthropic/claude-y', 'Anthropic: Claude Y'),
  ];

  it('sorts by name, so a maker’s models sit together', () => {
    expect(browserRows(options, '').map((row) => row.id)).toEqual([
      'anthropic/claude-x',
      'anthropic/claude-y',
      'openai/gpt-6',
    ]);
  });

  it('filters by author, name or id, with no cap', () => {
    expect(browserRows(options, 'anthropic')).toHaveLength(2);
    expect(browserRows(options, 'gpt-6').map((row) => row.id)).toEqual([
      'openai/gpt-6',
    ]);
  });
});
