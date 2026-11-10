import { describe, expect, it } from '@jest/globals';
import { assessSetupStatus, type SetupFacts } from './setup-status';

const base: SetupFacts = {
  sharedModelAgentCount: 1,
  defaultAgentProvider: 'openrouter',
  hasOpenRouterKey: true,
};

describe('assessSetupStatus', () => {
  it('is first-run before onboarding, whatever else is true', () => {
    expect(
      assessSetupStatus({
        ...base,
        sharedModelAgentCount: 0,
        defaultAgentProvider: null,
        hasOpenRouterKey: true,
      })
    ).toBe('first-run');
  });

  it('is no-agent after a skip with no model agent', () => {
    expect(
      assessSetupStatus({
        ...base,
        onboardingCompletedAt: new Date(),
        sharedModelAgentCount: 0,
        defaultAgentProvider: null,
      })
    ).toBe('no-agent');
  });

  it('is no-key when the default agent is on OpenRouter and no key is stored', () => {
    expect(assessSetupStatus({ ...base, hasOpenRouterKey: false })).toBe(
      'no-key'
    );
  });

  it('does not ask for an OpenRouter key when the default agent is on LM Studio', () => {
    expect(
      assessSetupStatus({
        ...base,
        defaultAgentProvider: 'lmstudio',
        hasOpenRouterKey: false,
      })
    ).toBe('ready');
  });

  it('is ready with an OpenRouter agent and a key', () => {
    expect(assessSetupStatus(base)).toBe('ready');
  });
});
