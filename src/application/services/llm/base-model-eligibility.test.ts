import {
  isEligibleBaseModel,
  selectEligibleBaseModels,
  type BaseModelCatalogEntry,
  type VerifiedBaseModelCheckpoint,
} from './base-model-eligibility';

const verifiedOpenRouter = (
  catalogId: string,
  weightIdentity: string
): readonly VerifiedBaseModelCheckpoint[] => [
  {
    provider: 'openrouter',
    catalogId,
    weightIdentity,
    sourceUrl: `https://huggingface.co/${weightIdentity}`,
  },
];

describe('base model eligibility', () => {
  it('GPT-4o with null instruct_type and completions route is excluded', () => {
    expect(
      isEligibleBaseModel('openrouter', {
        id: 'openai/gpt-4o',
        weightIdentity: 'openai/gpt-4o',
        outputModalities: ['text'],
        endpoints: ['/api/v1/completions'],
      })
    ).toBe(false);
  });

  it('Mistral Nemo instruct alias is excluded', () => {
    expect(
      isEligibleBaseModel(
        'openrouter',
        {
          id: 'mistralai/mistral-nemo',
          weightIdentity: 'mistralai/Mistral-Nemo-Instruct-2407',
          outputModalities: ['text'],
          endpoints: ['/api/v1/completions'],
        },
        verifiedOpenRouter(
          'mistralai/mistral-nemo',
          'mistralai/Mistral-Nemo-Base-2407'
        )
      )
    ).toBe(false);
  });

  it('verified checkpoint disappeared', () => {
    const catalog: readonly BaseModelCatalogEntry[] = [
      {
        id: 'somebody/other-model',
        weightIdentity: 'somebody/other-model',
        outputModalities: ['text'],
        endpoints: ['/api/v1/completions'],
      },
    ];
    expect(
      selectEligibleBaseModels(
        'openrouter',
        catalog,
        verifiedOpenRouter('author/base', 'author/base')
      )
    ).toEqual([]);
  });

  it('old cache lacks route evidence', () => {
    expect(
      isEligibleBaseModel(
        'openrouter',
        {
          id: 'author/base',
          weightIdentity: 'author/base',
          outputModalities: ['text'],
        },
        verifiedOpenRouter('author/base', 'author/base')
      )
    ).toBe(false);
  });

  it('production rejects mock identity', () => {
    expect(
      isEligibleBaseModel('lmstudio', {
        id: 'mock-base',
        publisher: 'mock',
        connectionEndpoint: 'https://models.example/v1',
      })
    ).toBe(false);
  });

  it('accepts the mock fixture only with both identities on a loopback connection', () => {
    expect(
      isEligibleBaseModel('lmstudio', {
        id: 'mock-base',
        publisher: 'mock',
        connectionEndpoint: 'http://localhost:1235',
      })
    ).toBe(true);
    expect(
      isEligibleBaseModel('lmstudio', {
        id: 'mock-base',
        publisher: 'someone-else',
        connectionEndpoint: 'http://localhost:1235',
      })
    ).toBe(false);
  });

  it("the Qwen base artifact is eligible, and its -Instruct sibling isn't", () => {
    expect(
      isEligibleBaseModel('lmstudio', {
        id: 'qwen2.5-7b',
        publisher: 'Qwen',
        connectionEndpoint: 'http://localhost:1234',
      })
    ).toBe(true);
    expect(
      isEligibleBaseModel('lmstudio', {
        id: 'qwen2.5-7b-instruct',
        publisher: 'Qwen',
        connectionEndpoint: 'http://localhost:1234',
      })
    ).toBe(false);
  });

  it('an empty OpenRouter registry yields an empty list', () => {
    expect(
      selectEligibleBaseModels('openrouter', [
        {
          id: 'author/base',
          weightIdentity: 'author/base',
          outputModalities: ['text'],
          endpoints: ['/api/v1/completions'],
        },
      ])
    ).toEqual([]);
  });

  it('accepts a verified OpenRouter checkpoint only with all catalog evidence', () => {
    const entry = {
      id: 'author/base',
      weightIdentity: 'author/base',
      outputModalities: ['text'],
      endpoints: ['https://openrouter.ai/api/v1/completions'],
    } as const;
    expect(
      isEligibleBaseModel(
        'openrouter',
        entry,
        verifiedOpenRouter(entry.id, entry.weightIdentity)
      )
    ).toBe(true);
  });
});
