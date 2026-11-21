/**
 * How long a streaming request may wait, in two parts: for its first bytes
 * (connecting, queueing, loading the model, reading the prompt), then
 * between chunks once it is streaming. There is no cap on the whole stream:
 * a slow model writing a long reply keeps going as long as bytes keep coming.
 */
export type StreamTimeouts = {
  readonly firstByteMs: number;
  readonly idleMs: number;
};

/** The abort wiring's options for a stream with these timeouts. */
export const toStreamAbortTimeouts = (timeouts: StreamTimeouts) => ({
  timeoutMs: timeouts.firstByteMs,
  idleTimeoutMs: timeouts.idleMs,
});
