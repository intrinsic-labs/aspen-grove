import { ContextAssemblyError } from './context-assembly-error';
import type { DialogueMessage } from './dialogue-message';
import { estimateMessageTokens, estimateTokens } from './estimate-tokens';

/**
 * User-configurable truncation strategies per
 * docs/architecture/specs/context-assembly.md.
 *
 * Only `truncateMiddle` (the default) is implemented so far;
 * `rollingWindow` and `stopAtLimit` are reserved for later milestones.
 */
export type TruncationStrategy =
  | 'truncateMiddle'
  | 'rollingWindow'
  | 'stopAtLimit';

export type TruncationOptions = {
  readonly strategy?: TruncationStrategy;
  /**
   * Model context window in tokens. Falls back to
   * DEFAULT_MAX_CONTEXT_TOKENS when the active model's limit is unknown.
   */
  readonly maxContextTokens?: number;
  /** Tokens reserved for the model's response (spec default: 1024). */
  readonly responseTokenBuffer?: number;
  /** Most recent messages that are always kept (spec default: 4). */
  readonly minimumRecentNodes?: number;
};

export type TruncationResult = {
  readonly messages: readonly DialogueMessage[];
  readonly truncated: boolean;
  readonly droppedMessageCount: number;
};

/**
 * Fallback context window when the active model's limit is unknown.
 * 128k tokens is the common floor for current frontier models; models with
 * smaller windows should surface their limit via
 * `TruncationOptions.maxContextTokens`.
 */
export const DEFAULT_MAX_CONTEXT_TOKENS = 128_000;
export const DEFAULT_RESPONSE_TOKEN_BUFFER = 1024;
export const DEFAULT_MINIMUM_RECENT_NODES = 4;

/** Marker prefixed to the first message after removed content. */
export const TRUNCATION_MARKER = '[... earlier messages truncated ...]';

/**
 * Applies the configured truncation strategy to assembled dialogue messages.
 *
 * Guarantees (all strategies):
 * - System context is never truncated (throws if it alone exceeds the limit).
 * - At least one message is always included.
 * - Truncation is transparent via `truncated` / `droppedMessageCount`.
 */
export const truncateDialogueMessages = (input: {
  readonly messages: readonly DialogueMessage[];
  readonly systemContext?: string;
  readonly options?: TruncationOptions;
}): TruncationResult => {
  const strategy = input.options?.strategy ?? 'truncateMiddle';
  const maxContextTokens =
    input.options?.maxContextTokens ?? DEFAULT_MAX_CONTEXT_TOKENS;
  const responseTokenBuffer =
    input.options?.responseTokenBuffer ?? DEFAULT_RESPONSE_TOKEN_BUFFER;
  const minimumRecentNodes = Math.max(
    1,
    input.options?.minimumRecentNodes ?? DEFAULT_MINIMUM_RECENT_NODES
  );

  const systemTokens = input.systemContext
    ? estimateTokens(input.systemContext)
    : 0;
  const availableTokens = maxContextTokens - responseTokenBuffer - systemTokens;

  if (availableTokens <= 0) {
    throw new ContextAssemblyError({
      code: 'systemContextTooLong',
      message:
        'System context (plus the response token buffer) exceeds the model ' +
        'context limit; system context is never truncated.',
    });
  }

  if (estimateMessageTokens(input.messages) <= availableTokens) {
    return {
      messages: input.messages,
      truncated: false,
      droppedMessageCount: 0,
    };
  }

  switch (strategy) {
    case 'truncateMiddle':
      return truncateMiddle(
        input.messages,
        availableTokens,
        minimumRecentNodes
      );
    case 'rollingWindow':
    case 'stopAtLimit':
      throw new ContextAssemblyError({
        code: 'strategyNotImplemented',
        message: `Truncation strategy not implemented yet: ${strategy}`,
      });
  }
};

/**
 * `truncateMiddle`: preserves the beginning and end of the conversation,
 * removing from the middle. The most recent `minimumRecentNodes` messages
 * are always kept (even when they alone exceed the budget, which also
 * satisfies the at-least-one-message guarantee). A truncation marker is
 * prefixed to the first message after the removed span.
 */
const truncateMiddle = (
  messages: readonly DialogueMessage[],
  availableTokens: number,
  minimumRecentNodes: number
): TruncationResult => {
  if (messages.length <= minimumRecentNodes) {
    // Everything counts as "recent"; recent messages are always kept even
    // when the estimate exceeds the limit.
    return { messages, truncated: false, droppedMessageCount: 0 };
  }

  const boundary = messages.length - minimumRecentNodes;
  const head = messages.slice(0, boundary);
  const tail = messages.slice(boundary);

  let budget =
    availableTokens -
    estimateMessageTokens(tail) -
    estimateTokens(TRUNCATION_MARKER);

  const keptHead: DialogueMessage[] = [];
  for (const message of head) {
    const cost = estimateTokens(message.content);
    if (cost > budget) {
      break;
    }
    keptHead.push(message);
    budget -= cost;
  }

  const droppedMessageCount = head.length - keptHead.length;
  if (droppedMessageCount === 0) {
    return { messages, truncated: false, droppedMessageCount: 0 };
  }

  const [firstAfterGap, ...remainingTail] = tail;
  if (!firstAfterGap) {
    throw new ContextAssemblyError({
      code: 'contextExceedsLimit',
      message: 'Truncation produced an empty context.',
    });
  }

  return {
    messages: [
      ...keptHead,
      {
        role: firstAfterGap.role,
        content: `${TRUNCATION_MARKER}\n\n${firstAfterGap.content}`,
      },
      ...remainingTail,
    ],
    truncated: true,
    droppedMessageCount,
  };
};
