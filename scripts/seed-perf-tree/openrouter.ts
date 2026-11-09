import type { ChatMessage, Completer } from './types.ts';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_ATTEMPTS = 5;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type ChatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

/**
 * OpenRouter chat-completions client with retry on 429 / 5xx / network
 * errors (exponential backoff). The key is read from the argument only; it is
 * never logged or written anywhere.
 */
export const createOpenRouterCompleter = (
  apiKey: string,
  model: string
): Completer => {
  const call = async (messages: ChatMessage[], maxTokens: number) => {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'Aspen Grove perf seed',
      },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      const error = new Error(`OpenRouter HTTP ${response.status}`);
      (error as Error & { retryable?: boolean }).retryable = retryable;
      throw error;
    }
    const body = (await response.json()) as ChatResponse;
    const text = body.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('OpenRouter returned an empty completion');
    }
    return text;
  };

  return async ({ messages, maxTokens }) => {
    for (let attempt = 1; ; attempt++) {
      try {
        return await call(messages, maxTokens);
      } catch (error) {
        const flagged = (error as { retryable?: boolean }).retryable;
        const retryable =
          flagged ??
          (error instanceof TypeError ||
            (error as Error).name === 'TimeoutError');
        if (!retryable || attempt >= MAX_ATTEMPTS) {
          throw error;
        }
        await sleep(1000 * 2 ** (attempt - 1) + Math.random() * 500);
      }
    }
  };
};
