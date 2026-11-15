import { normalizeOpenRouterModel } from './catalog-normalize';

describe('normalizeOpenRouterModel', () => {
  it('keeps what the detail page shows, prices per million tokens', () => {
    const model = normalizeOpenRouterModel({
      id: 'anthropic/claude-example-1',
      name: 'Anthropic: Claude Example 1',
      description: 'A model.',
      created: 1794253781,
      context_length: 200000,
      knowledge_cutoff: '2026-03-01',
      architecture: {
        input_modalities: ['text', 'image'],
        output_modalities: ['text'],
      },
      top_provider: { max_completion_tokens: 64000 },
      pricing: {
        prompt: '0.000003',
        completion: '0.000015',
        image: '0.0000015',
        request: '0',
      },
      supported_parameters: ['temperature', 'tools'],
    });

    expect(model).toEqual({
      id: 'anthropic/claude-example-1',
      displayName: 'Anthropic: Claude Example 1',
      description: 'A model.',
      created: 1794253781,
      contextLength: 200000,
      knowledgeCutoff: '2026-03-01',
      inputModalities: ['text', 'image'],
      outputModalities: ['text'],
      maxCompletionTokens: 64000,
      promptPricePerMTokens: 3,
      completionPricePerMTokens: 15,
      imagePricePerMTokens: 1.5,
      supportedParameters: ['temperature', 'tools'],
    });
  });

  it('marks a router priced at -1 as variable, with no per-token price', () => {
    const model = normalizeOpenRouterModel({
      id: 'openrouter/auto',
      name: 'Auto Router',
      pricing: { prompt: '-1', completion: '-1' },
    });
    expect(model.variablePricing).toBe(true);
    expect(model.promptPricePerMTokens).toBeUndefined();
    expect(model.completionPricePerMTokens).toBeUndefined();
  });

  it('reads an alias target and a per-request price, and drops nulls', () => {
    const model = normalizeOpenRouterModel({
      id: '~anthropic/claude-sonnet-latest',
      name: '',
      description: null,
      context_length: null,
      top_provider: null,
      architecture: null,
      alias_target: { slug: 'anthropic/claude-sonnet-5.5' },
      pricing: { prompt: '0', completion: '0', request: '0.005' },
      supported_parameters: [],
    });
    expect(model).toEqual({
      id: '~anthropic/claude-sonnet-latest',
      displayName: '~anthropic/claude-sonnet-latest',
      aliasOf: 'anthropic/claude-sonnet-5.5',
      promptPricePerMTokens: 0,
      completionPricePerMTokens: 0,
      requestPrice: 0.005,
    });
  });
});
