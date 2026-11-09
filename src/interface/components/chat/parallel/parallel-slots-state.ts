import type { ContinuationSlotOutcome } from '@application/services/dialogue-continuation';
import type { StreamInterruptionReason } from '@application/services/llm';
import type { ULID } from '@domain/value-objects';

export type ParallelSlotStatus =
  | 'streaming'
  /** Stop was asked for; the slot settles shortly. */
  | 'stopping'
  | 'done'
  /** Failed after streaming text; the partial text was saved. */
  | 'interrupted'
  /** Failed with nothing saved. */
  | 'error'
  /** Stopped; partial text saved when `nodeId` is set. */
  | 'cancelled';

/** What one card shows. */
export type ParallelSlotView = {
  readonly slot: number;
  readonly status: ParallelSlotStatus;
  /** Text so far while streaming; the streamed text once settled. */
  readonly text: string;
  readonly error?: string;
  readonly interruptionReason?: StreamInterruptionReason;
  /** The saved node, when there is one to choose. */
  readonly nodeId?: ULID;
};

export type ParallelRunPhase = 'idle' | 'running' | 'settled';

export type ParallelSlotsState = {
  readonly phase: ParallelRunPhase;
  readonly sourceNodeId?: ULID;
  readonly slots: readonly ParallelSlotView[];
  /** A failure before any slot started (bad session, missing API key). */
  readonly error?: string;
};

export type ParallelSlotsAction =
  | { readonly type: 'start'; readonly sourceNodeId: ULID; readonly count: number }
  | { readonly type: 'text'; readonly texts: ReadonlyMap<number, string> }
  | { readonly type: 'stopRequested'; readonly slot: number }
  | { readonly type: 'outcome'; readonly outcome: ContinuationSlotOutcome }
  | { readonly type: 'finished' }
  | { readonly type: 'failed'; readonly message: string }
  | { readonly type: 'reset' };

export const initialParallelSlotsState: ParallelSlotsState = {
  phase: 'idle',
  slots: [],
};

const isSettled = (status: ParallelSlotStatus) =>
  status !== 'streaming' && status !== 'stopping';

const settle = (
  view: ParallelSlotView,
  outcome: ContinuationSlotOutcome
): ParallelSlotView => {
  switch (outcome.type) {
    case 'done':
      return { ...view, status: 'done', nodeId: outcome.nodeId };
    case 'interrupted':
      return {
        ...view,
        status: 'interrupted',
        nodeId: outcome.nodeId,
        interruptionReason: outcome.reason,
      };
    case 'cancelled':
      return {
        ...view,
        status: 'cancelled',
        nodeId: outcome.saved?.nodeId,
        interruptionReason: 'cancelled',
      };
    case 'error':
      return { ...view, status: 'error', error: outcome.message };
  }
};

const updateSlot = (
  state: ParallelSlotsState,
  slot: number,
  update: (view: ParallelSlotView) => ParallelSlotView
): ParallelSlotsState => ({
  ...state,
  slots: state.slots.map((view) => (view.slot === slot ? update(view) : view)),
});

export const parallelSlotsReducer = (
  state: ParallelSlotsState,
  action: ParallelSlotsAction
): ParallelSlotsState => {
  switch (action.type) {
    case 'start':
      return {
        phase: 'running',
        sourceNodeId: action.sourceNodeId,
        slots: Array.from({ length: action.count }, (_, slot) => ({
          slot,
          status: 'streaming',
          text: '',
        })),
      };
    case 'text':
      return {
        ...state,
        slots: state.slots.map((view) => {
          const text = action.texts.get(view.slot);
          return text === undefined || isSettled(view.status)
            ? view
            : { ...view, text };
        }),
      };
    case 'stopRequested':
      return updateSlot(state, action.slot, (view) =>
        view.status === 'streaming' ? { ...view, status: 'stopping' } : view
      );
    case 'outcome':
      return updateSlot(state, action.outcome.slot, (view) =>
        settle(view, action.outcome)
      );
    case 'finished':
      return { ...state, phase: 'settled' };
    case 'failed':
      return {
        ...state,
        phase: 'settled',
        error: action.message,
        slots: state.slots.map((view) =>
          isSettled(view.status)
            ? view
            : { ...view, status: 'error', error: action.message }
        ),
      };
    case 'reset':
      return initialParallelSlotsState;
  }
};
