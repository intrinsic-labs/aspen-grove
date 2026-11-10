import type { ULID } from '@domain/value-objects';

/** The node being edited from the composer, if any. */
export type EditTarget = {
  readonly nodeId: ULID;
  readonly localId: string;
};

export type ComposerMode = {
  readonly isEditing: boolean;
  readonly editLabel: string | undefined;
  readonly composerPlaceholder: string;
  readonly sendLabel: string;
};

/** Composer copy for sending a new message versus saving an edit. */
export const toComposerMode = (editTarget: EditTarget | null): ComposerMode =>
  editTarget
    ? {
        isEditing: true,
        editLabel: `Editing ${editTarget.localId}`,
        composerPlaceholder: 'Update this message...',
        sendLabel: 'Save',
      }
    : {
        isEditing: false,
        editLabel: undefined,
        composerPlaceholder: 'Send a message...',
        sendLabel: 'Send',
      };
