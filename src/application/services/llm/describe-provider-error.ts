import type { Provider } from '@domain/entities';
import { LlmProviderError } from './ILlmProvider';
import { MissingProviderKeyError } from './missing-provider-key-error';

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
};

export type DescribeProviderErrorContext = {
  /** The provider the failed request was for, when the error doesn't say. */
  readonly provider?: Provider;
  /** The LM Studio address that was tried, to name it in the message. */
  readonly lmstudioEndpoint?: string;
};

const NETWORK_FAILURE_PATTERN =
  /network request failed|failed to fetch|could not connect|connection refused|econnrefused|network error|timed out|unable to resolve host|offline/i;

const PROVIDER_LABELS: Partial<Record<Provider, string>> = {
  openrouter: 'OpenRouter',
  lmstudio: 'LM Studio',
};

const labelFor = (provider: Provider): string =>
  PROVIDER_LABELS[provider] ?? provider;

const isLoopbackEndpoint = (endpoint: string): boolean =>
  /^(https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(
    endpoint.trim()
  );

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

const lmStudioUnreachableMessage = (endpoint?: string): string => {
  const trimmed = endpoint?.trim();
  const where = trimmed ? ` at ${trimmed}` : '';
  const loopbackHint =
    trimmed && isLoopbackEndpoint(trimmed)
      ? " On a phone, use your computer's network address instead of localhost."
      : '';
  return `LM Studio isn't answering${where}. Start its local server, then try again.${loopbackHint}`;
};

/**
 * Turns a provider failure into a message a person can act on, plus the
 * action that fixes it. Unreachable LM Studio servers, missing keys and
 * rejected keys get plain words and a way to Connections; anything else
 * keeps its provider detail.
 */
export const describeProviderError = (
  error: unknown,
  context: DescribeProviderErrorContext = {}
): ProviderErrorDescription => {
  if (isLmStudioUnreachable(error, context)) {
    return {
      kind: 'lmstudio-unreachable',
      message: lmStudioUnreachableMessage(context.lmstudioEndpoint),
      action: 'open-connections',
    };
  }

  if (error instanceof MissingProviderKeyError) {
    return {
      kind: 'missing-key',
      message: `Add your ${labelFor(error.provider)} key in Connections to generate.`,
      action: 'open-connections',
    };
  }

  if (
    error instanceof LlmProviderError &&
    error.code === 'authenticationFailed'
  ) {
    return {
      kind: 'key-rejected',
      message:
        error.provider === 'lmstudio'
          ? 'LM Studio asked for an API token. Add it in Connections.'
          : `${labelFor(error.provider)} didn't accept your key. Check it in Connections.`,
      action: 'open-connections',
    };
  }

  if (error instanceof LlmProviderError) {
    return {
      kind: 'other',
      message: `[${error.provider}:${error.code}] ${error.message}`,
      action: null,
    };
  }

  return {
    kind: 'other',
    message: error instanceof Error ? error.message : String(error),
    action: null,
  };
};
