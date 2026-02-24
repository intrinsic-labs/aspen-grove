import { LlmProviderError } from '@application/services/llm';
import { parseRetryAfterMs } from './helpers';
import type { OpenRouterErrorPayload } from './types';

export const toLlmProviderError = (input: {
  readonly status?: number;
  readonly responseHeaders?: Headers;
  readonly responseBody?: string;
  readonly fallbackMessage: string;
}): LlmProviderError => {
  const { status, responseHeaders, responseBody, fallbackMessage } = input;

  let parsedError: OpenRouterErrorPayload | null = null;
  if (responseBody) {
    try {
      parsedError = JSON.parse(responseBody) as OpenRouterErrorPayload;
    } catch {
      parsedError = null;
    }
  }

  const message =
    parsedError?.error?.message ??
    (responseBody && responseBody.trim().length > 0 ? responseBody : fallbackMessage);

  if (status === 401 || status === 403) {
    return new LlmProviderError({
      code: 'authenticationFailed',
      message,
      provider: 'openrouter',
      retryable: false,
    });
  }

  if (status === 404) {
    return new LlmProviderError({
      code: 'modelNotFound',
      message,
      provider: 'openrouter',
      retryable: false,
    });
  }

  if (status === 408) {
    return new LlmProviderError({
      code: 'timeout',
      message,
      provider: 'openrouter',
      retryable: true,
    });
  }

  if (status === 413) {
    return new LlmProviderError({
      code: 'contextTooLong',
      message,
      provider: 'openrouter',
      retryable: false,
    });
  }

  if (status === 422 || status === 400) {
    return new LlmProviderError({
      code: 'invalidRequest',
      message,
      provider: 'openrouter',
      retryable: false,
    });
  }

  if (status === 429) {
    return new LlmProviderError({
      code: 'rateLimited',
      message,
      provider: 'openrouter',
      retryable: true,
      retryAfterMs: responseHeaders ? parseRetryAfterMs(responseHeaders) : undefined,
    });
  }

  if (status === 451) {
    return new LlmProviderError({
      code: 'contentFiltered',
      message,
      provider: 'openrouter',
      retryable: false,
    });
  }

  if (status !== undefined && status >= 500) {
    return new LlmProviderError({
      code: 'serverError',
      message,
      provider: 'openrouter',
      retryable: true,
    });
  }

  return new LlmProviderError({
    code: 'unknown',
    message,
    provider: 'openrouter',
    retryable: false,
  });
};

