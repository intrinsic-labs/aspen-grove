import type { DialogueTurnSession } from '@application/use-cases';
import type { ULID } from '@domain/value-objects';

export type ChatSession = DialogueTurnSession;

export type ChatRow = {
  readonly id: ULID;
  readonly authorType: 'human' | 'model';
  readonly text: string;
};

