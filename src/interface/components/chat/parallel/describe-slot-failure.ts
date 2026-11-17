import type { ContinuationSlotEvent } from '@application/services/dialogue-continuation';
import {
  describeProviderError,
  lmStudioUnreachableCardMessage,
} from '@application/services/llm';
import type { SelectableProvider } from '@domain/entities';

export type CardFailureContext = {
  /** The provider the run streams from. */
  readonly provider: SelectableProvider;
  /** The LM Studio address saved in Connections, to name when it isn't answering. */
  readonly lmstudioEndpoint?: string;
};

/**
 * A failed card speaks as plainly as a failed send, through
 * `describeProviderError`: its own words for a missing or rejected key,
 * otherwise one plain line by error code. LM Studio not answering is worded
 * for the card's width, naming the address that was tried.
 */
export const cardFailureMessage = (
  caught: unknown,
  { provider, lmstudioEndpoint }: CardFailureContext
): string => {
  const described = describeProviderError(caught, { provider });
  return described.kind === 'lmstudio-unreachable'
    ? lmStudioUnreachableCardMessage(lmstudioEndpoint)
    : described.message;
};

/**
 * A failed slot's event, its message worded by `cardFailureMessage`. The raw
 * form stays on the event's `cause`, for the card's details tap. Every other
 * event passes through unchanged.
 */
export const describeSlotFailure = (
  event: ContinuationSlotEvent,
  context: CardFailureContext
): ContinuationSlotEvent =>
  event.type === 'error'
    ? {
        ...event,
        message: cardFailureMessage(event.cause ?? event.message, context),
      }
    : event;
