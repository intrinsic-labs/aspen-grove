import type { DialogueTurnSession } from '@application/use-cases';
import type { NodeViewStyle, SelectableProvider } from '@domain/entities';
import type { ULID } from '@domain/value-objects';

/**
 * The model agent a session generates with. `provider` picks the API key
 * from the credential store; the use cases resolve the provider from the
 * agent's `modelRef` themselves.
 */
export type ChatSessionModel = {
  readonly modelAgentId: ULID;
  readonly modelIdentifier: string;
  readonly provider: SelectableProvider;
};

/**
 * Chat session state carried by the controller: the path being read, and
 * the model it generates with. `model` is null when the tree has no usable
 * agent (see `resolveTreeModelAgent`): the dialogue still reads, rewinds and
 * edits, but anything that generates needs one picked first.
 */
export type ChatSession = Omit<
  DialogueTurnSession,
  'modelAgentId' | 'modelIdentifier'
> & {
  readonly model: ChatSessionModel | null;
};

export type ChatRow = {
  readonly id: ULID;
  readonly localId: string;
  readonly editedFrom?: ULID;
  readonly authorType: 'human' | 'model';
  readonly text: string;
  readonly bookmarked: boolean;
  readonly pruned: boolean;
  /** Number of outgoing continuation edges (children in the loom). */
  readonly continuationCount: number;
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
