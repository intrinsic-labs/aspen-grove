import { lastMessageText } from './reply-text.ts';

/**
 * Auto-Title's request (src/application/use-cases/GenerateTreeTitleUseCase.ts):
 * one non-streaming completion after a tree's first reply, with the system
 * prompt "You title conversations. ..." and a user message opening "Title
 * this conversation." Either marker identifies it, so a reworded system
 * prompt or a provider that folds the system prompt into the messages still
 * matches; a streamed request never does.
 */
const SYSTEM_MARKER = /^you title conversations\b/i;
const USER_MARKER = /^title this conversation\b/i;

const textOf = (message: unknown): string => lastMessageText([message]).trim();

export const isTitleRequest = (body: {
  readonly messages?: unknown;
  readonly stream?: unknown;
}): boolean => {
  if (body.stream === true || !Array.isArray(body.messages)) {
    return false;
  }
  return body.messages.some((message) => {
    const role = (message as { role?: unknown })?.role;
    const text = textOf(message);
    return (
      (role === 'system' && SYSTEM_MARKER.test(text)) ||
      (role === 'user' && USER_MARKER.test(text))
    );
  });
};

/** A short, plausible title in the shape a model gives: no quotes, no full stop. */
export const titleText = (requestNumber: number): string =>
  `Mock title #${requestNumber}`;
