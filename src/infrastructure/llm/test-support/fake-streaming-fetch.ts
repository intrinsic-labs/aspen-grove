/**
 * A streaming `fetch` a test drives by hand, for mocking `expo/fetch`:
 *
 *   jest.mock('expo/fetch', () => ({
 *     fetch: require('./test-support/fake-streaming-fetch').fakeStreamingFetch,
 *   }));
 *
 * Each call opens a stream the test pushes SSE events into (`openStreams`),
 * and aborting the request's signal rejects the pending read with an
 * AbortError, as a real fetch does.
 */
export type FakeStream = {
  /** A text delta, as one SSE event. */
  readonly push: (text: string) => void;
  /** An SSE comment, as a provider sends to keep a quiet stream alive. */
  readonly keepAlive: () => void;
  /** Ends the body after `[DONE]`, as a provider does. */
  readonly end: () => void;
  /** Ends the body with no terminal event, as a dropped connection can. */
  readonly drop: () => void;
  readonly signal: AbortSignal;
};

export const openStreams: FakeStream[] = [];

const sseLine = (text: string) =>
  `data: ${JSON.stringify({ model: 'test/model', choices: [{ delta: { content: text } }] })}\n\n`;

export const fakeStreamingFetch = async (
  _url: string,
  init: { signal: AbortSignal }
) => {
  const queue: (Uint8Array | null)[] = [];
  let wake: (() => void) | null = null;
  const encoder = new TextEncoder();
  const notify = () => {
    wake?.();
    wake = null;
  };
  const enqueue = (...items: (Uint8Array | null)[]) => {
    queue.push(...items);
    notify();
  };
  openStreams.push({
    push: (text) => enqueue(encoder.encode(sseLine(text))),
    keepAlive: () => enqueue(encoder.encode(': PROCESSING\n\n')),
    end: () => enqueue(encoder.encode('data: [DONE]\n\n'), null),
    drop: () => enqueue(null),
    signal: init.signal,
  });
  init.signal.addEventListener('abort', notify);
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'x-request-id': `req_${openStreams.length}` }),
    body: {
      getReader: () => ({
        read: async () => {
          while (queue.length === 0 && !init.signal.aborted) {
            await new Promise<void>((resolve) => {
              wake = resolve;
            });
          }
          if (init.signal.aborted) {
            const error = new Error('aborted');
            error.name = 'AbortError';
            throw error;
          }
          const value = queue.shift();
          return value
            ? { done: false, value }
            : { done: true, value: undefined };
        },
      }),
    },
  };
};
