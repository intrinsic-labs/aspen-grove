import { describe, expect, it } from '@jest/globals';
import { isOnboarded, shouldShowOnboarding } from './first-run';

describe('first-run detection', () => {
  it('shows onboarding on a fresh install: never completed, no agents', () => {
    const facts = { sharedModelAgentCount: 0 };
    expect(isOnboarded(facts)).toBe(false);
    expect(shouldShowOnboarding(facts)).toBe(true);
  });

  it('counts a finished or skipped setup as onboarded, even with no agent', () => {
    const facts = {
      onboardingCompletedAt: new Date('2026-11-09T10:00:00Z'),
      sharedModelAgentCount: 0,
    };
    expect(isOnboarded(facts)).toBe(true);
    expect(shouldShowOnboarding(facts)).toBe(false);
  });

  it('counts an existing model agent as onboarded (installs that predate onboarding)', () => {
    const facts = { sharedModelAgentCount: 2 };
    expect(isOnboarded(facts)).toBe(true);
    expect(shouldShowOnboarding(facts)).toBe(false);
  });
});
