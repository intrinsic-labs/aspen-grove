import { describe, expect, it } from '@jest/globals';
import { AGENT_TEMPLATES } from '../settings/agents/agent-templates';
import { providerDefaultModel } from './provider-default-model';

const lmStudio = [
  { id: 'idle', label: 'Idle', loaded: false },
  { id: 'warm', label: 'Warm', loaded: true },
];

describe('providerDefaultModel', () => {
  it("takes the default agent's model on the same provider", () => {
    expect(
      providerDefaultModel('lmstudio', lmStudio, {
        provider: 'lmstudio',
        id: 'warm',
      })
    ).toBe('warm');
    expect(
      providerDefaultModel('openrouter', [], {
        provider: 'openrouter',
        id: 'x/y',
      })
    ).toBe('x/y');
  });

  it("takes onboarding's first template for OpenRouter", () => {
    expect(
      providerDefaultModel('openrouter', [], { provider: 'lmstudio', id: 'x' })
    ).toBe(AGENT_TEMPLATES[0]?.draft.modelIdentifier);
  });

  it('takes a loaded LM Studio model, else none', () => {
    expect(providerDefaultModel('lmstudio', lmStudio, null)).toBe('warm');
    expect(providerDefaultModel('lmstudio', [lmStudio[0]!], null)).toBeNull();
    expect(providerDefaultModel('lmstudio', [], null)).toBeNull();
  });

  it('skips a listed LM Studio model that is not loaded, wherever it sorts', () => {
    // The mock server's list, sorted by name: `mock-missing` isn't loaded.
    const mock = [
      { id: 'mock-missing', label: 'mock-missing', loaded: false },
      { id: 'mock-model', label: 'mock-model', loaded: true },
    ];
    expect(providerDefaultModel('lmstudio', mock, null)).toBe('mock-model');
  });

  it("passes over the default agent's LM Studio model when it isn't loaded", () => {
    expect(
      providerDefaultModel('lmstudio', lmStudio, {
        provider: 'lmstudio',
        id: 'gone',
      })
    ).toBe('warm');
  });

  describe.each(['anthropic', 'openai'] as const)('on %s', (provider) => {
    const models = [
      {
        id: 'old',
        label: 'Old',
        catalog: { id: 'old', displayName: 'Old', created: 100 },
      },
      {
        id: 'new',
        label: 'New',
        catalog: { id: 'new', displayName: 'New', created: 200 },
      },
      {
        id: 'mid',
        label: 'Mid',
        catalog: { id: 'mid', displayName: 'Mid', created: 150 },
      },
    ];

    it("takes the default agent's model when it is listed", () => {
      expect(
        providerDefaultModel(provider, models, { provider, id: 'old' })
      ).toBe('old');
    });

    it("takes the newest listed model when the default agent isn't on it", () => {
      expect(
        providerDefaultModel(provider, models, {
          provider: 'openrouter',
          id: 'x/y',
        })
      ).toBe('new');
    });

    it('takes none while nothing is listed', () => {
      expect(providerDefaultModel(provider, [], null)).toBeNull();
    });
  });
});
