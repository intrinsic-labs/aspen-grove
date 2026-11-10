import type {
  CompletionResponse,
  LlmProviderErrorCode,
  StreamInterruptionReason,
} from '@application/services/llm';
import type { ULID } from '@domain/value-objects';

/** Index of one continuation among those started together (0-based). */
export type ContinuationSlot = number;

/** A saved model node and the evidence stored with it. */
export type PersistedContinuation = {
  readonly nodeId: ULID;
  readonly rawApiResponseId?: ULID;
  readonly finishReason: CompletionResponse['finishReason'];
  readonly usage?: CompletionResponse['usage'];
  readonly modelIdentifier: string;
  readonly latencyMs: number;
};

/** Streamed text. Never persisted: only the finished completion is saved. */
export type ContinuationSlotDelta = {
  readonly slot: ContinuationSlot;
  readonly type: 'delta';
  readonly delta: string;
  /** All text this slot has streamed so far. */
  readonly content: string;
};

/** The slot finished and its node is saved. */
export type ContinuationSlotDone = PersistedContinuation & {
  readonly slot: ContinuationSlot;
  readonly type: 'done';
};

/**
 * The stream failed after producing text. The partial text is saved, with an
 * interruption marker, as the single-continuation path does.
 */
export type ContinuationSlotInterrupted = PersistedContinuation & {
  readonly slot: ContinuationSlot;
  readonly type: 'interrupted';
  readonly reason: Exclude<StreamInterruptionReason, 'cancelled'>;
};

/** The slot failed and nothing was saved for it. */
export type ContinuationSlotError = {
  readonly slot: ContinuationSlot;
  readonly type: 'error';
  readonly message: string;
  readonly code?: LlmProviderErrorCode;
  /** What was thrown, so the UI can word it like any provider failure. */
  readonly cause?: unknown;
};

/**
 * The slot was stopped. When it had already streamed text, that partial
 * text is saved (`saved`); otherwise nothing is.
 */
export type ContinuationSlotCancelled = {
  readonly slot: ContinuationSlot;
  readonly type: 'cancelled';
  readonly saved?: PersistedContinuation;
};

export type ContinuationSlotOutcome =
  | ContinuationSlotDone
  | ContinuationSlotInterrupted
  | ContinuationSlotError
  | ContinuationSlotCancelled;

export type ContinuationSlotEvent =
  | ContinuationSlotDelta
  | ContinuationSlotOutcome;

export type ContinuationSlotListener = (event: ContinuationSlotEvent) => void;
