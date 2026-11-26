/** How long typing may pause before the draft is stored. */
export const DRAFT_SAVE_DELAY_MS = 500;

export type DraftSaverOptions = {
  /** Stores the draft for whatever is on screen now. Never writes a version. */
  readonly save: () => Promise<void>;
  readonly delayMs?: number;
  readonly setTimer?: (callback: () => void, ms: number) => unknown;
  readonly clearTimer?: (handle: unknown) => void;
};

export type DraftSaver = {
  /** Typing happened: store the draft once it pauses (the last call wins). */
  readonly schedule: () => void;
  /** Store now (backgrounding), and wait for it. Resolves even if saving fails. */
  readonly flush: () => Promise<void>;
  /** Drop a pending save (a command is about to store its own). */
  readonly cancel: () => void;
};

/** Coalesces draft saves while typing. Plain timers, so it tests without React. */
export const createDraftSaver = ({
  save,
  delayMs = DRAFT_SAVE_DELAY_MS,
  setTimer = (callback, ms) => setTimeout(callback, ms),
  clearTimer = (handle) =>
    clearTimeout(handle as ReturnType<typeof setTimeout>),
}: DraftSaverOptions): DraftSaver => {
  let timer: unknown;
  let pending = false;

  const cancel = () => {
    if (timer !== undefined) clearTimer(timer);
    timer = undefined;
    pending = false;
  };
  const run = () => save().catch(() => undefined);
  return {
    schedule: () => {
      if (timer !== undefined) clearTimer(timer);
      pending = true;
      timer = setTimer(() => {
        timer = undefined;
        pending = false;
        void run();
      }, delayMs);
    },
    flush: async () => {
      if (!pending) return;
      cancel();
      await run();
    },
    cancel,
  };
};
