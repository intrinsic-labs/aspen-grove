import type { ParallelSlotView } from './parallel-slots-state';

/**
 * What a streaming card shows, by state. `pending` is a slot that has sent
 * its request but has no text yet, which is how a provider that queues
 * requests (LM Studio with one prediction at a time) looks: cards wait, then
 * stream in turn.
 */
export type SlotCardStateKey =
  | 'pending'
  | 'streaming'
  | 'stopping'
  | 'done'
  | 'stopped'
  | 'interrupted'
  | 'failed';

export type SlotCardState = {
  readonly key: SlotCardStateKey;
  /** Short lowercase word for the card's meta line. */
  readonly label: string;
  /** The stop button shows while the slot can still be stopped. */
  readonly canStop: boolean;
  /** The card's body: streamed text, or the error for a failed slot. */
  readonly body: string;
};

const toKey = (view: ParallelSlotView): SlotCardStateKey => {
  switch (view.status) {
    case 'streaming':
      return view.text.length === 0 ? 'pending' : 'streaming';
    case 'stopping':
      return 'stopping';
    case 'done':
      return 'done';
    case 'interrupted':
      return 'interrupted';
    case 'cancelled':
      return 'stopped';
    case 'error':
      return 'failed';
  }
};

const LABELS: Record<SlotCardStateKey, string> = {
  pending: 'waiting',
  streaming: 'streaming',
  stopping: 'stopping',
  done: 'done',
  stopped: 'stopped',
  interrupted: 'interrupted',
  failed: 'failed',
};

const toBody = (view: ParallelSlotView, key: SlotCardStateKey): string => {
  if (key === 'failed') {
    return view.error ?? 'This continuation failed.';
  }
  if (key === 'stopped' && view.text.length === 0) {
    return 'Stopped before any text arrived. Nothing was saved.';
  }
  return view.text;
};

export const toSlotCardState = (view: ParallelSlotView): SlotCardState => {
  const key = toKey(view);
  const reason =
    key === 'interrupted' && view.interruptionReason
      ? ` (${view.interruptionReason})`
      : '';
  return {
    key,
    label: `${LABELS[key]}${reason}`,
    canStop: key === 'pending' || key === 'streaming',
    body: toBody(view, key),
  };
};
