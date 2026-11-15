import {
  customModelIdentifier,
  filterModelOptions,
} from './model-option-filter';

const OPTIONS = [
  { id: 'anthropic/claude-sonnet', label: 'Claude Sonnet' },
  { id: 'openai/gpt-5', label: 'GPT-5' },
  { id: 'meta/llama', label: 'Llama' },
];

describe('filterModelOptions', () => {
  it('returns everything for an empty search', () => {
    expect(filterModelOptions(OPTIONS, '  ')).toHaveLength(3);
  });

  it('matches id or label, ignoring case', () => {
    expect(filterModelOptions(OPTIONS, 'SONNET').map((o) => o.id)).toEqual([
      'anthropic/claude-sonnet',
    ]);
    expect(filterModelOptions(OPTIONS, 'openai/').map((o) => o.id)).toEqual([
      'openai/gpt-5',
    ]);
  });

  it('caps the result', () => {
    expect(filterModelOptions(OPTIONS, '', 2)).toHaveLength(2);
  });
});

describe('customModelIdentifier', () => {
  it('offers an unlisted OpenRouter id', () => {
    expect(customModelIdentifier('openrouter', ' x/y ', OPTIONS)).toBe('x/y');
  });

  it('offers nothing for a listed id, an empty search or LM Studio', () => {
    expect(
      customModelIdentifier('openrouter', 'meta/llama', OPTIONS)
    ).toBeNull();
    expect(customModelIdentifier('openrouter', ' ', OPTIONS)).toBeNull();
    expect(customModelIdentifier('lmstudio', 'x/y', OPTIONS)).toBeNull();
  });
});
