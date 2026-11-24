import {
  LlmProviderError,
  type LlmProviderErrorCode,
} from '@application/services/llm';
import { parseRetryAfterMs } from '../openrouter/helpers';
import type { DirectProvider } from './types';

const labels = { anthropic: 'Anthropic', openai: 'OpenAI' };

/** HTTP errors and error events share the providers' nested `error` shape. */
export const directProviderError = (
  provider: DirectProvider,
  status?: number,
  payload?: unknown,
  headers?: Headers
): LlmProviderError => {
  const error = (
    payload as { error?: { code?: string; type?: string; message?: string } }
  )?.error;
  const kind = error?.code ?? error?.type;
  let code: LlmProviderErrorCode = 'unknown';
  if (
    status === 401 ||
    status === 403 ||
    kind === 'authentication_error' ||
    kind === 'invalid_api_key' ||
    kind === 'permission_error'
  )
    code = 'authenticationFailed';
  else if (
    status === 404 ||
    kind === 'model_not_found' ||
    kind === 'not_found_error'
  )
    code = 'modelNotFound';
  else if (
    status === 429 ||
    kind === 'rate_limit_error' ||
    kind === 'rate_limit_exceeded' ||
    kind === 'insufficient_quota'
  )
    code = 'rateLimited';
  else if (
    status === 408 ||
    status === 504 ||
    kind === 'timeout' ||
    kind === 'timeout_error'
  )
    code = 'timeout';
  else if (
    status === 413 ||
    kind === 'context_length_exceeded' ||
    /prompt is too long|context window/i.test(error?.message ?? '')
  )
    code = 'contextTooLong';
  else if (kind === 'content_filter' || kind === 'refusal')
    code = 'contentFiltered';
  else if (
    (status !== undefined && status >= 500) ||
    kind === 'overloaded_error' ||
    kind === 'api_error' ||
    kind === 'server_error'
  )
    code = 'serverError';
  else if (status === 400 || status === 422 || kind === 'invalid_request_error')
    code = 'invalidRequest';
  const label = labels[provider];
  const messages: Record<LlmProviderErrorCode, string> = {
    authenticationFailed: `${label} didn't accept this API key. Check it in Connections.`,
    modelNotFound: `${label} couldn't find that model or give this key access to it.`,
    rateLimited: `${label} is limiting requests. Wait a moment, then try again.`,
    timeout: `${label} took too long to answer.`,
    contextTooLong:
      "The conversation is longer than this model's context window.",
    contentFiltered: `${label} withheld the response.`,
    serverError: `${label} had a server error. Try again.`,
    invalidRequest: `${label} couldn't accept the request.`,
    networkError: `Couldn't reach ${label}. Check your connection, then try again.`,
    cancelled: 'Stopped.',
    unknown: `${label} returned an error.`,
  };
  return new LlmProviderError({
    provider,
    code,
    message: messages[code],
    retryable: [
      'rateLimited',
      'timeout',
      'serverError',
      'networkError',
    ].includes(code),
    retryAfterMs:
      code === 'rateLimited' && headers
        ? parseRetryAfterMs(headers)
        : undefined,
  });
};

export const invalidDirectRequest = (
  provider: DirectProvider,
  message: string
) =>
  new LlmProviderError({
    provider,
    code: 'invalidRequest',
    message,
    retryable: false,
  });

export const parseErrorBody = (body: string): unknown => {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
};
