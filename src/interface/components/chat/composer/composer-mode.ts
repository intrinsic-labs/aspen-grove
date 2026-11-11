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

/**
 * Composer copy for sending a new message versus saving an edit. A new
 * message addresses the tree's agent, as Latent Spaces addresses its model
 * (LoomTreeView.swift:88).
 */
export const toComposerMode = (
  editTarget: EditTarget | null,
  agentName?: string
): ComposerMode =>
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
        composerPlaceholder: agentName
          ? `Reply to ${agentName}`
          : 'Send a message...',
        sendLabel: 'Send',
      };
