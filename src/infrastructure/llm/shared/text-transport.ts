import type { LlmProviderError } from '@application/services/llm';
import type { Provider } from '@domain/entities';

/**
 * What a provider adapter lends the shared text-completion transport: where
 * to POST, with which headers, and how to turn a failure into its own
 * `LlmProviderError`, so auth and error copy stay per provider.
 */
export type TextTransport = {
  readonly provider: Provider;
  /** "OpenRouter", for messages. */
  readonly label: string;
  readonly url: string;
  /** Auth and attribution; `Content-Type` and `Accept` are added here. */
  readonly headers: Readonly<Record<string, string>>;
  /** Ask for a final usage event on streams (`stream_options`). */
  readonly includeUsage: boolean;
  readonly toError: (input: {
    readonly status?: number;
    readonly responseHeaders?: Headers;
    readonly responseBody?: string;
    readonly fallbackMessage: string;
  }) => LlmProviderError;
};
