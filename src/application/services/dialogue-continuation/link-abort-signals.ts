export type LinkedAbortSignal = {
  readonly signal: AbortSignal;
  readonly dispose: () => void;
};

/**
 * One signal that aborts when any of `signals` does. A local stand-in for
 * `AbortSignal.any`, which React Native's runtime doesn't reliably provide.
 * `dispose()` detaches the listeners once the work is over.
 */
export const linkAbortSignals = (
  signals: readonly (AbortSignal | undefined)[]
): LinkedAbortSignal => {
  const controller = new AbortController();
  const present = signals.filter((signal): signal is AbortSignal =>
    Boolean(signal)
  );
  const onAbort = () => controller.abort();

  if (present.some((signal) => signal.aborted)) {
    controller.abort();
  } else {
    present.forEach((signal) => signal.addEventListener('abort', onAbort));
  }

  return {
    signal: controller.signal,
    dispose: () =>
      present.forEach((signal) =>
        signal.removeEventListener('abort', onAbort)
      ),
  };
};
