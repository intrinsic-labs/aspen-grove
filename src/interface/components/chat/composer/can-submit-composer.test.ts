import { describe, expect, it } from '@jest/globals';
import { canSubmitComposer } from './can-submit-composer';

const ready = {
  generating: false,
  loading: false,
  needsAgent: false,
  isEditing: false,
  input: 'hello',
};

describe('canSubmitComposer', () => {
  it('blocks a new turn while the tree has no model agent', () => {
    expect(canSubmitComposer({ ...ready, needsAgent: true })).toBe(false);
  });

  it('still saves an edit when the tree has no model agent', () => {
    expect(
      canSubmitComposer({ ...ready, needsAgent: true, isEditing: true })
    ).toBe(true);
  });

  it('allows a new turn once an agent is set', () => {
    expect(canSubmitComposer(ready)).toBe(true);
  });

  it('blocks while generating or loading, or with only whitespace', () => {
    expect(canSubmitComposer({ ...ready, generating: true })).toBe(false);
    expect(
      canSubmitComposer({ ...ready, isEditing: true, loading: true })
    ).toBe(false);
    expect(canSubmitComposer({ ...ready, input: '   ' })).toBe(false);
  });
});
