import { LlmProviderError } from '@application/services/llm';

/** The message shown in the chat error banner for any caught value. */
export const toErrorMessage = (caught: unknown): string =>
  caught instanceof Error ? caught.message : String(caught);

/**
 * Like `toErrorMessage`, but prefixes provider failures with
 * `[provider:code]` so a failed generation says where it failed.
 */
export const toGenerationErrorMessage = (caught: unknown): string =>
  caught instanceof LlmProviderError
    ? `[${caught.provider}:${caught.code}] ${caught.message}`
    : toErrorMessage(caught);
