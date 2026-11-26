/**
 * Holds host actions that replace the document (a sibling switch, a fixture
 * load, later a generation insert) while the user is mid-composition. An IME
 * candidate that is still being chosen lives in the editor; reloading under
 * it drops the candidate or splits it. Platform-neutral: the Android page
 * reports `composing` and the iOS input can feed the same `observe`.
 *
 * An action waits until the editor says composition ended. After `timeoutMs`
 * the barrier asks the editor to end it (`requestEnd`); the editor answers
 * with its composing state. Only if that answer never comes (a dead page)
 * does the action run after another `timeoutMs`, so it is never lost.
 * Latest wins: a newer action replaces one still held.
 */
export type CompositionBarrierOptions = {
  readonly timeoutMs?: number;
  /** Asks the editor to commit and end its composition, and then report. */
  readonly requestEnd: () => void;
  /** Injectable timers for tests. */
  readonly setTimer?: (callback: () => void, ms: number) => unknown;
  readonly clearTimer?: (handle: unknown) => void;
};

export type CompositionBarrier = {
  /** The editor's latest composing state. */
  readonly observe: (composing: boolean) => void;
  /** Runs `action` now, or once composition has ended. */
  readonly run: (action: () => void) => void;
  /** A new document is loaded: nothing is composing, nothing is held. */
  readonly reset: () => void;
  readonly isComposing: () => boolean;
};

export const COMPOSITION_TIMEOUT_MS = 1500;

export const createCompositionBarrier = ({
  timeoutMs = COMPOSITION_TIMEOUT_MS,
  requestEnd,
  setTimer = (callback, ms) => setTimeout(callback, ms),
  clearTimer = (handle) =>
    clearTimeout(handle as ReturnType<typeof setTimeout>),
}: CompositionBarrierOptions): CompositionBarrier => {
  let composing = false;
  let held: (() => void) | undefined;
  let timer: unknown;

  const stopTimer = () => {
    if (timer !== undefined) {
      clearTimer(timer);
      timer = undefined;
    }
  };

  const release = () => {
    stopTimer();
    const action = held;
    held = undefined;
    action?.();
  };

  return {
    observe: (next) => {
      composing = next;
      if (!next && held) {
        release();
      }
    },
    run: (action) => {
      if (!composing) {
        held = undefined;
        stopTimer();
        action();
        return;
      }
      held = action;
      if (timer === undefined) {
        timer = setTimer(() => {
          requestEnd();
          timer = setTimer(release, timeoutMs);
        }, timeoutMs);
      }
    },
    reset: () => {
      composing = false;
      held = undefined;
      stopTimer();
    },
    isComposing: () => composing,
  };
};
