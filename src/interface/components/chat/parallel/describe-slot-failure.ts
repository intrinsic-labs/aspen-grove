import type { ContinuationSlotEvent } from '@application/services/dialogue-continuation';
import { describeProviderError } from '@application/services/llm';
import type { SelectableProvider } from '@domain/entities';

/**
 * A failed card speaks as plainly as a failed send: its error goes through
 * `describeProviderError` (missing or rejected key, LM Studio not answering).
 * Every other event passes through unchanged.
 */
export const describeSlotFailure = (
  event: ContinuationSlotEvent,
  provider: SelectableProvider
): ContinuationSlotEvent =>
  event.type === 'error'
    ? {
        ...event,
        message: describeProviderError(event.cause ?? event.message, {
          provider,
        }).message,
      }
    : event;
