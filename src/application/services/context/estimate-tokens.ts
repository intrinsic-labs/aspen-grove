import type { DialogueMessage } from './dialogue-message';

/**
 * Conservative token estimation heuristic: ~4 characters per token for
 * English text, per docs/architecture/specs/context-assembly.md.
 *
 * Actual token usage varies by model and is recorded in the RawApiResponse
 * after generation; this estimate is only used to decide when truncation
 * is required before sending a request.
 */
export const CHARS_PER_TOKEN = 4;

export const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
};

export const estimateMessageTokens = (
  messages: readonly DialogueMessage[]
): number => {
  return messages.reduce(
    (total, message) => total + estimateTokens(message.content),
    0
  );
};
