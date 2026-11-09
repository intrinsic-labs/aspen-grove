export type StreamDiagnosticsSummary = {
  readonly deltaCount: number;
  readonly msToFirstDelta: number | null;
  readonly msTotal: number;
};

export type StreamDiagnostics = {
  /** Call once per streamed delta. */
  readonly recordDelta: () => void;
  /** Counts so far; `msTotal` is measured at the moment of the call. */
  readonly summary: () => StreamDiagnosticsSummary;
};

/**
 * Streaming health check: many deltas spread over time = healthy;
 * one or two deltas arriving at the end = transport is buffering.
 * The clock starts when this is created.
 */
export const createStreamDiagnostics = (
  now: () => number = Date.now
): StreamDiagnostics => {
  const startedAtMs = now();
  let firstDeltaAtMs: number | null = null;
  let deltaCount = 0;

  return {
    recordDelta: () => {
      if (firstDeltaAtMs === null) {
        firstDeltaAtMs = now();
      }
      deltaCount += 1;
    },
    summary: () => ({
      deltaCount,
      msToFirstDelta:
        firstDeltaAtMs === null ? null : firstDeltaAtMs - startedAtMs,
      msTotal: now() - startedAtMs,
    }),
  };
};

/** Dev-only log line for one finished stream. */
export const logStreamDiagnostics = (
  label: 'send' | 'regenerate',
  diagnostics: StreamDiagnostics
): void => {
  if (__DEV__) {
    console.log(`[stream-diagnostic] ${label}`, diagnostics.summary());
  }
};
