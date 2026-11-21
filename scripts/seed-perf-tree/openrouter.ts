import { readCompletion, type Completion } from './completion-response.ts';
import { DEFAULT_REASONING_BUDGET } from './reasoning.ts';
import type { ChatMessage, Completer } from './types.ts';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
/** Tries per call on 429, 5xx and network errors. */
const MAX_HTTP_ATTEMPTS = 5;
/** Tries per reply that comes back empty or cut short at `max_tokens`. */
export const MAX_REPLY_ATTEMPTS = 3;

export type OpenRouterOptions = {
  /** Added to each call's `max_tokens` for hidden reasoning (reasoning.ts). */
  readonly reasoningHeadroomTokens?: number;
  /** Each completion's token use, as OpenRouter reports it. */
  readonly onUsage?: (completion: Completion) => void;
  /** A reply kept although it was cut short (the last try's). */
  readonly onWarning?: (message: string) => void;
  readonly fetch?: typeof fetch;
  readonly sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * OpenRouter chat-completions client. Retries 429 / 5xx / network errors
 * with exponential backoff, and asks again, a few times, when a reply comes
 * back empty or cut short (a reasoning model can spend the budget thinking).
 * The key is read from the argument only; it is never logged or written
 * anywhere.
 */
export const createOpenRouterCompleter = (
  apiKey: string,
  model: string,
  options: OpenRouterOptions = {}
): Completer => {
  const doFetch = options.fetch ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  const headroom =
    options.reasoningHeadroomTokens ?? DEFAULT_REASONING_BUDGET.headroomTokens;

  const call = async (
    messages: ChatMessage[],
    maxTokens: number
  ): Promise<Completion> => {
    const response = await doFetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'Aspen Grove perf seed',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens + headroom,
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      const error = new Error(`OpenRouter HTTP ${response.status}`);
      (error as Error & { retryable?: boolean }).retryable = retryable;
      throw error;
    }
    const completion = readCompletion(await response.json());
    options.onUsage?.(completion);
    return completion;
  };

  const callWithRetry = async (
    messages: ChatMessage[],
    maxTokens: number
  ): Promise<Completion> => {
    for (let attempt = 1; ; attempt++) {
      try {
        return await call(messages, maxTokens);
      } catch (error) {
        const flagged = (error as { retryable?: boolean }).retryable;
        const retryable =
          flagged ??
          (error instanceof TypeError ||
            (error as Error).name === 'TimeoutError');
        if (!retryable || attempt >= MAX_HTTP_ATTEMPTS) {
          throw error;
        }
        await sleep(1000 * 2 ** (attempt - 1) + Math.random() * 500);
      }
    }
  };

  return async ({ messages, maxTokens, key }) => {
    for (let attempt = 1; ; attempt++) {
      const completion = await callWithRetry(messages, maxTokens);
      if (completion.text && !completion.truncated) {
        return completion.text;
      }
      if (attempt >= MAX_REPLY_ATTEMPTS) {
        if (completion.text) {
          options.onWarning?.(
            `Reply ${key} was cut short at max_tokens after ${attempt} tries; keeping it.`
          );
          return completion.text;
        }
        throw new Error(
          `OpenRouter returned an empty completion ${attempt} times for ${key}` +
            ` (reasoning used ${completion.reasoningTokens} tokens).`
        );
      }
      await sleep(500 * attempt);
    }
  };
};
