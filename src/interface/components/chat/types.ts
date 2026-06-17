import type { DialogueTurnSession } from '@application/use-cases';
import type { NodeViewStyle, SelectableProvider } from '@domain/entities';
import type { ULID } from '@domain/value-objects';

/**
 * Chat session state carried by the controller.
 *
 * Extends `DialogueTurnSession` (the use-case input) with `provider`, which
 * the controller uses to fetch the right per-provider API key from the
 * credential store. The use cases themselves resolve the provider from the
 * agent's `modelRef` and do not need this field on their input.
 */
export type ChatSession = DialogueTurnSession & {
  readonly provider: SelectableProvider;
};

export type ChatRow = {
  readonly id: ULID;
  readonly localId: string;
  readonly editedFrom?: ULID;
  readonly authorType: 'human' | 'model';
  readonly text: string;
  readonly bookmarked: boolean;
};

export type ContinuationPreview = {
  readonly nodeId: ULID;
  readonly localId: string;
  readonly previewText: string;
  readonly isOnActivePath: boolean;
  readonly onBranchCount: number;
  readonly isBookmarked: boolean;
};

export type ChatDisplayPreferences = {
  readonly userNodeViewStyle: NodeViewStyle;
  readonly userNodeCornerRadius: number;
  readonly messageFontSize: number;
  readonly messageLineHeight: number;
  readonly messageFontFamily?: string;
};
