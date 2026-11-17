import type { Provider } from '@domain/entities';
import { LlmProviderError } from './ILlmProvider';
import { lmStudioUnreachableMessage } from './lmstudio-unreachable-copy';
import { MissingProviderKeyError } from './missing-provider-key-error';
import {
  plainProviderErrorLine,
  providerErrorDetail,
  providerLabel,
} from './provider-error-copy';

export type ProviderErrorKind =
  | 'lmstudio-unreachable'
  | 'missing-key'
  | 'key-rejected'
  | 'other';

/** What the UI can offer next to the message. */
export type ProviderErrorAction = 'open-connections' | null;

export type ProviderErrorDescription = {
  readonly kind: ProviderErrorKind;
  /** One or two plain sentences, safe to show as-is. */
  readonly message: string;
  readonly action: ProviderErrorAction;
  /**
   * The technical form (`[provider:code] message`), for a "details" tap;
   * absent when it would only repeat `message`.
   */
  readonly detail?: string;
};

export type DescribeProviderErrorContext = {
  /** The provider the failed request was for, when the error doesn't say. */
  readonly provider?: Provider;
  /** The LM Studio address that was tried, to name it in the message. */
  readonly lmstudioEndpoint?: string;
};

const NETWORK_FAILURE_PATTERN =
  /network request failed|failed to fetch|could not connect|connection refused|econnrefused|network error|timed out|unable to resolve host|offline/i;

const isLmStudioUnreachable = (
  error: unknown,
  context: DescribeProviderErrorContext
): boolean => {
  if (error instanceof LlmProviderError) {
    return (
      error.provider === 'lmstudio' &&
      (error.code === 'networkError' || error.code === 'timeout')
    );
  }
  if (context.provider !== 'lmstudio') {
    return false;
  }
  // Raw fetch failures that escaped an adapter (e.g. "TypeError: Network
  // request failed").
  return (
    error instanceof TypeError ||
    (error instanceof Error && NETWORK_FAILURE_PATTERN.test(error.message))
  );
};

const withDetail = (
  error: unknown,
  description: Omit<ProviderErrorDescription, 'detail'>
): ProviderErrorDescription => {
  const detail = providerErrorDetail(error);
  return detail && detail !== description.message
    ? { ...description, detail }
    : description;
};

/** Every other failure: one plain line, the provider's own words kept as the detail. */
const describeOther = (error: unknown): ProviderErrorDescription =>
  withDetail(error, {
    kind: 'other',
    message:
      error instanceof LlmProviderError
        ? plainProviderErrorLine(error)
        : error instanceof Error
          ? error.message
          : String(error),
    action: null,
  });

/**
 * Turns a provider failure into a message a person can act on, plus the
 * action that fixes it. Unreachable LM Studio servers, missing keys and
 * rejected keys get their own words and a way to Connections; anything else
 * gets one plain line by its error code. The provider's raw words go in
 * `detail`, never in `message`.
 */
export const describeProviderError = (
  error: unknown,
  context: DescribeProviderErrorContext = {}
): ProviderErrorDescription => {
  if (isLmStudioUnreachable(error, context)) {
    return withDetail(error, {
      kind: 'lmstudio-unreachable',
      message: lmStudioUnreachableMessage(context.lmstudioEndpoint),
      action: 'open-connections',
    });
  }

  if (error instanceof MissingProviderKeyError) {
    return {
      kind: 'missing-key',
      message: `Add your ${providerLabel(error.provider)} key in Connections to generate.`,
      action: 'open-connections',
    };
  }

  if (
    error instanceof LlmProviderError &&
    error.code === 'authenticationFailed'
  ) {
    return withDetail(error, {
      kind: 'key-rejected',
      message:
        error.provider === 'lmstudio'
          ? 'LM Studio asked for an API token. Add it in Connections.'
          : `${providerLabel(error.provider)} didn't accept your key. Check it in Connections.`,
      action: 'open-connections',
    });
  }

  return describeOther(error);
};
