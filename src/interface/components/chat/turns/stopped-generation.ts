import {
  LlmProviderError,
  type StreamInterruptionReason,
} from '@application/services/llm';

/**
 * Whether a send or regenerate ended because the user pressed stop before
 * any text arrived. That isn't a failure: there is nothing to report.
 */
export const isStoppedBeforeText = (
  signal: AbortSignal | undefined,
  caught: unknown
): boolean =>
  Boolean(signal?.aborted) &&
  ((caught instanceof LlmProviderError && caught.code === 'cancelled') ||
    (caught instanceof Error && caught.name === 'AbortError'));

/**
 * What to say after a reply ended early and its partial text was saved. A
 * user's stop says nothing: they asked for it, and the saved node keeps
 * just the partial text, as a stopped parallel card does.
 */
export const interruptionNotice = (
  reason: StreamInterruptionReason | undefined
): string | null =>
  !reason || reason === 'cancelled'
    ? null
    : `Stream interrupted (${reason}). Saved partial response.`;
