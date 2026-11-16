import type { ContinuationSlotEvent } from '@application/services/dialogue-continuation';
import { describeProviderError } from '@application/services/llm';
import type { SelectableProvider } from '@domain/entities';

/**
 * A failed card speaks as plainly as a failed send: its error goes through
 * `describeProviderError`: its own words for a missing or rejected key or LM
 * Studio not answering, otherwise one plain line by error code. The raw form
 * stays on the event's `cause`, for the card's details tap. Every other event
 * passes through unchanged.
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
