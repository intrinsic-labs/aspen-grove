import type { Provider } from '@domain/entities';
import { LlmProviderError, type LlmProviderErrorCode } from './ILlmProvider';

const PROVIDER_LABELS: Partial<Record<Provider, string>> = {
  openrouter: 'OpenRouter',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  lmstudio: 'LM Studio',
};

/** A provider's name as people know it ("LM Studio", not "lmstudio"). */
export const providerLabel = (provider: Provider): string =>
  PROVIDER_LABELS[provider] ?? provider;

const LINES: Record<LlmProviderErrorCode, (label: string) => string> = {
  authenticationFailed: (label) =>
    `${label} didn't accept the request's credentials.`,
  rateLimited: (label) =>
    `${label} is limiting requests right now. Wait a moment, then try again.`,
  contextTooLong: () =>
    "The conversation is longer than this model's context window.",
  modelNotFound: (label) => `${label} couldn't find that model.`,
  invalidRequest: (label) => `${label} couldn't accept the request.`,
  serverError: (label) => `${label} had a server error. Try again.`,
  networkError: (label) =>
    `Couldn't reach ${label}. Check your connection, then try again.`,
  timeout: (label) => `${label} took too long to answer.`,
  contentFiltered: (label) => `${label} withheld the response.`,
  cancelled: () => 'Stopped.',
  unknown: (label) => `${label} returned an error.`,
};

/**
 * One plain sentence for a provider failure, by its code. The provider's own
 * words (status, body) stay out of it: they are the technical detail, shown
 * only on request (`providerErrorDetail`).
 */
export const plainProviderErrorLine = (error: LlmProviderError): string =>
  LINES[error.code](providerLabel(error.provider));

/**
 * The technical form of a failure, for whoever wants to dig in: a provider
 * error as `[provider:code] message`, anything else as its message.
 */
export const providerErrorDetail = (error: unknown): string | undefined => {
  if (error === undefined || error === null) {
    return undefined;
  }
  if (error instanceof LlmProviderError) {
    return `[${error.provider}:${error.code}] ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message || error.name;
  }
  return String(error);
};
