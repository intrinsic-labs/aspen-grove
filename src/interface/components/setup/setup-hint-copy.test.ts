import { describe, expect, it } from '@jest/globals';
import { setupHintCopy } from './setup-hint-copy';

describe('setupHintCopy', () => {
  it('sends a user with no agent to onboarding', () => {
    expect(setupHintCopy('no-agent')?.href).toBe('/onboarding');
    expect(setupHintCopy('first-run')?.href).toBe('/onboarding');
  });

  it('sends a user with no key to Connections', () => {
    expect(setupHintCopy('no-key')).toEqual({
      message: 'Add your OpenRouter key to start a tree.',
      actionLabel: 'Add key',
      href: '/connections',
    });
  });

  it('says nothing when ready', () => {
    expect(setupHintCopy('ready')).toBeNull();
  });
});
