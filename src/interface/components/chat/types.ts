import type { DialogueTurnSession } from '@application/use-cases';
import type { NodeViewStyle } from '@domain/entities';
import type { ULID } from '@domain/value-objects';

export type ChatSession = DialogueTurnSession;

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
