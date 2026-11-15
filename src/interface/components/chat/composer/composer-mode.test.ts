import { describe, expect, it } from '@jest/globals';
import type { ULID } from '@domain/value-objects';
import { toComposerMode } from './composer-mode';

describe('toComposerMode', () => {
  it('describes sending a new message', () => {
    expect(toComposerMode(null)).toEqual({
      isEditing: false,
      editLabel: undefined,
      composerPlaceholder: 'Send a message...',
      sendLabel: 'Send',
    });
  });

  it("addresses the tree's agent by name", () => {
    expect(toComposerMode(null, 'Claude').composerPlaceholder).toBe(
      'Reply to Claude'
    );
  });

  it('describes saving an edit, naming the node', () => {
    expect(
      toComposerMode({ nodeId: '01NODE' as ULID, localId: 'a3f' })
    ).toEqual({
      isEditing: true,
      editLabel: 'Editing a3f',
      composerPlaceholder: 'Update this message...',
      sendLabel: 'Save',
    });
  });
});
