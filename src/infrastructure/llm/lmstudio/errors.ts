import { LlmProviderError } from '@application/services/llm';
import { parseRetryAfterMs } from './helpers';
import type { LMStudioErrorPayload } from './types';

export const toLlmProviderError = (input: {
  readonly status?: number;
  readonly responseHeaders?: Headers;
  readonly responseBody?: string;
  readonly fallbackMessage: string;
}): LlmProviderError => {
  const { status, responseHeaders, responseBody, fallbackMessage } = input;

  let parsed: LMStudioErrorPayload | undefined;
  if (responseBody) {
    try {
      parsed = JSON.parse(responseBody) as LMStudioErrorPayload;
    } catch {
      // Ignore parse errors
    }
  }

  const errorMessage =
    parsed?.error?.message ?? responseBody?.slice(0, 200) ?? fallbackMessage;
  const retryAfterMs = responseHeaders
    ? parseRetryAfterMs(responseHeaders)
    : undefined;

  switch (status) {
    case 401:
    case 403:
      return new LlmProviderError({
        code: 'authenticationFailed',
        message: `LM Studio authentication failed: ${errorMessage}`,
        provider: 'lmstudio',
        retryable: false,
      });

    case 429:
      return new LlmProviderError({
        code: 'rateLimited',
        message: `LM Studio rate limited: ${errorMessage}`,
        provider: 'lmstudio',
        retryable: true,
        retryAfterMs,
      });

    case 400:
      if (errorMessage.toLowerCase().includes('context')) {
        return new LlmProviderError({
          code: 'contextTooLong',
          message: `LM Studio context too long: ${errorMessage}`,
          provider: 'lmstudio',
          retryable: false,
        });
      }
      return new LlmProviderError({
        code: 'invalidRequest',
        message: `LM Studio bad request: ${errorMessage}`,
        provider: 'lmstudio',
        retryable: false,
      });

    case 404:
      return new LlmProviderError({
        code: 'modelNotFound',
        message: `LM Studio model not found: ${errorMessage}`,
        provider: 'lmstudio',
        retryable: false,
      });

    case 408:
      return new LlmProviderError({
        code: 'timeout',
        message: `LM Studio request timed out: ${errorMessage}`,
        provider: 'lmstudio',
        retryable: true,
      });

    case 500:
    case 502:
    case 503:
    case 504:
      return new LlmProviderError({
        code: 'serverError',
        message: `LM Studio server error (${status}): ${errorMessage}`,
        provider: 'lmstudio',
        retryable: true,
        retryAfterMs,
      });

    default:
      return new LlmProviderError({
        code: 'unknown',
        message: errorMessage,
        provider: 'lmstudio',
        retryable: status ? status >= 500 : true,
      });
  }
};
