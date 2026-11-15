/**
 * A message role in an assembled dialogue context. `system` comes from a
 * system node on the path and is sent in place, with the provider's
 * `system` role (OpenAI-compatible chat completions).
 */
export type DialogueRole = 'user' | 'assistant' | 'system';

export type DialogueMessage = {
  readonly role: DialogueRole;
  readonly content: string;
};
