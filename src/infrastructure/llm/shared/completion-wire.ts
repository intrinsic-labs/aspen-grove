import {
  LlmProviderError,
  type CompletionResponse,
  type TextCompletionRequest,
  type TokenUsage,
} from '@application/services/llm';
import type { Provider } from '@domain/entities';

/**
 * The OpenAI-compatible `/v1/completions` wire: the URL, the request body and
 * the decoded `choices[].text`. Provider-neutral, so any server that speaks
 * this legacy route can reuse it. No I/O here.
 */

const CHAT_SUFFIX = '/chat/completions';

const invalidEndpoint = (provider: Provider, endpoint: string) =>
  new LlmProviderError({
    code: 'invalidRequest',
    message: `Can't derive a text-completions URL from "${endpoint}".`,
    provider,
    retryable: false,
  });

/**
 * A chat URL's sibling text route: `.../v1/chat/completions` becomes
 * `.../v1/completions`, keeping the origin, any base path and the query.
 */
export const chatUrlToCompletionsUrl = (
  chatUrl: string,
  provider: Provider
): string => {
  let url: URL;
  try {
    url = new URL(chatUrl);
  } catch {
    throw invalidEndpoint(provider, chatUrl);
  }
  const path = url.pathname.replace(/\/+$/, '');
  if (!path.endsWith(CHAT_SUFFIX)) {
    throw invalidEndpoint(provider, chatUrl);
  }
  url.pathname = `${path.slice(0, -CHAT_SUFFIX.length)}/completions`;
  return url.toString();
};

/** A server stored as an origin (`http://host:1234`): its `/v1/completions`. */
export const originToCompletionsUrl = (origin: string): string =>
  `${origin.replace(/\/+$/, '')}/v1/completions`;

/**
 * The body for one text request: the prompt verbatim and the sampling fields
 * the chat path also sends. Never `messages`, `system` or `n`: a parallel
 * draw is one request per slot.
 */
export const buildTextCompletionBody = (
  request: TextCompletionRequest,
  options: { readonly stream: boolean; readonly includeUsage?: boolean }
): Record<string, unknown> => ({
  model: request.model,
  prompt: request.prompt,
  temperature: request.temperature,
  max_tokens: request.maxTokens,
  stop: request.stopSequences,
  stream: options.stream,
  ...(options.stream && options.includeUsage
    ? { stream_options: { include_usage: true } }
    : {}),
});

type WireUsage = {
  readonly prompt_tokens?: number;
  readonly completion_tokens?: number;
  readonly total_tokens?: number;
};

/** A JSON body or one SSE event of `/v1/completions`. */
type CompletionPayload = {
  readonly model?: string;
  readonly choices?: ReadonlyArray<{
    readonly text?: string | null;
    readonly finish_reason?: string | null;
  }>;
  readonly usage?: WireUsage | null;
  readonly error?: {
    readonly message?: string;
    readonly code?: string | number;
  };
};

export type DecodedCompletion = {
  /** Verbatim: never trimmed, so whitespace-only text survives. */
  readonly text: string;
  /** Set when the payload carries a finish reason (a terminal event). */
  readonly finishReason?: CompletionResponse['finishReason'];
  readonly model?: string;
  readonly usage?: TokenUsage;
  /** A provider error delivered in-band (an SSE `error` event). */
  readonly error?: NonNullable<CompletionPayload['error']>;
};

const toFinishReason = (
  reason: string | null | undefined
): CompletionResponse['finishReason'] | undefined => {
  switch (reason) {
    case undefined:
    case null:
      return undefined;
    case 'stop':
      return 'stop';
    case 'length':
      return 'length';
    default:
      return 'error';
  }
};

const toUsage = (
  usage: WireUsage | null | undefined
): TokenUsage | undefined =>
  usage
    ? {
        promptTokens: usage.prompt_tokens ?? 0,
        completionTokens: usage.completion_tokens ?? 0,
        totalTokens:
          usage.total_tokens ??
          (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0),
      }
    : undefined;

/** Decodes one parsed payload; a usage-only event has no choices and no text. */
export const decodeCompletionPayload = (value: unknown): DecodedCompletion => {
  const payload = (
    value && typeof value === 'object' ? value : {}
  ) as CompletionPayload;
  const choice = payload.choices?.[0];
  return {
    text: typeof choice?.text === 'string' ? choice.text : '',
    finishReason: toFinishReason(choice?.finish_reason),
    model: payload.model,
    usage: toUsage(payload.usage),
    error: payload.error,
  };
};

/** Decodes the text of one complete response body, as received. */
export const decodeCompletionBody = (body: string): DecodedCompletion =>
  decodeCompletionPayload(JSON.parse(body));
