import {
  LlmProviderError,
  type StreamInterruptionReason,
} from '@application/services/llm';
import type { Provider } from '@domain/entities';
import { isAbortError, type RequestAbort } from './request-abort';

/**
 * Why a stream that had already produced text stopped early. A known abort
 * cause wins over the error's shape, since runtimes differ in what they throw
 * when a fetch is aborted.
 */
export const toInterruptedReason = (
  error: unknown,
  abortCause: ReturnType<RequestAbort['cause']>
): StreamInterruptionReason => {
  if (abortCause) {
    return abortCause;
  }
  if (isAbortError(error)) {
    return 'timeout';
  }
  if (error instanceof LlmProviderError) {
    if (error.code === 'cancelled') {
      return 'cancelled';
    }
    if (error.code === 'timeout') {
      return 'timeout';
    }
    if (error.code === 'networkError') {
      return 'network';
    }
    return 'provider_error';
  }
  return 'network';
};

/**
 * The error for a request that ended by abort before producing any text, or
 * null when the request was not aborted.
 */
export const toAbortedRequestError = (input: {
  readonly error: unknown;
  readonly abortCause: ReturnType<RequestAbort['cause']>;
  readonly provider: Provider;
  readonly label: string;
}): LlmProviderError | null => {
  const { error, abortCause, provider, label } = input;
  if (abortCause === 'cancelled') {
    return new LlmProviderError({
      code: 'cancelled',
      message: `${label} request was cancelled.`,
      provider,
      retryable: false,
    });
  }
  if (abortCause === 'timeout' || isAbortError(error)) {
    return new LlmProviderError({
      code: 'timeout',
      message: `${label} request timed out.`,
      provider,
      retryable: true,
    });
  }
  return null;
};
