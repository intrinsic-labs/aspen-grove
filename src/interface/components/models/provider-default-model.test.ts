import { describe, expect, it } from '@jest/globals';
import { AGENT_TEMPLATES } from '../../settings/agents/agent-templates';
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
        id: 'idle',
      })
    ).toBe('idle');
  });

  it("takes onboarding's first template for OpenRouter", () => {
    expect(
      providerDefaultModel('openrouter', [], { provider: 'lmstudio', id: 'x' })
    ).toBe(AGENT_TEMPLATES[0]?.draft.modelIdentifier);
  });

  it('takes a loaded LM Studio model, else the first, else none', () => {
    expect(providerDefaultModel('lmstudio', lmStudio, null)).toBe('warm');
    expect(providerDefaultModel('lmstudio', [lmStudio[0]!], null)).toBe('idle');
    expect(providerDefaultModel('lmstudio', [], null)).toBeNull();
  });
});
