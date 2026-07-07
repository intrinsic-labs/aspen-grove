export type DialogueRole = 'user' | 'assistant';

export type DialogueMessage = {
  readonly role: DialogueRole;
  readonly content: string;
};
