import { describe, expect, it } from '@jest/globals';
import { modelFooterContent } from './model-footer-content';

const settled = { settledFor: 'openrouter', error: null };

describe('modelFooterContent', () => {
  it("shows an OpenRouter model's description and context length", () => {
    expect(
      modelFooterContent({
        provider: 'openrouter',
        modelId: 'openai/gpt-4o',
        hasAgent: true,
        picker: settled,
        selected: {
          id: 'openai/gpt-4o',
          label: 'GPT-4o',
          description: 'A model.',
          catalog: {
            id: 'openai/gpt-4o',
            displayName: 'GPT-4o',
            contextLength: 128000,
          },
        },
      })
    ).toEqual({
      description: 'A model.',
      context: 'Context: 128,000 tokens',
    });
  });

  it('leaves the context out when OpenRouter lists none', () => {
    expect(
      modelFooterContent({
        provider: 'openrouter',
        modelId: 'x/y',
        hasAgent: true,
        picker: settled,
        selected: { id: 'x/y', label: 'Y', description: 'Why.' },
      })
    ).toEqual({ description: 'Why.', context: undefined });
  });

  it("shows LM Studio's detail line and the list's error", () => {
    expect(
      modelFooterContent({
        provider: 'lmstudio',
        modelId: 'mock-model',
        hasAgent: true,
        picker: { settledFor: 'lmstudio', error: null },
        selected: {
          id: 'mock-model',
          label: 'Mock',
          detail: '33K ctx · 7B',
          maxOutputTokens: 32768,
        },
      })
    ).toEqual({ description: '33K ctx · 7B' });
    expect(
      modelFooterContent({
        provider: 'openrouter',
        modelId: 'x/y',
        hasAgent: true,
        picker: { settledFor: 'openrouter', error: 'Offline.' },
        selected: undefined,
      })
    ).toEqual({ description: 'Offline.' });
  });

  it('asks for a model when the tree has none', () => {
    expect(
      modelFooterContent({
        provider: 'openrouter',
        modelId: null,
        hasAgent: false,
        picker: settled,
        selected: undefined,
      })
    ).toEqual({ description: 'Choose a model for this tree.' });
  });
});
