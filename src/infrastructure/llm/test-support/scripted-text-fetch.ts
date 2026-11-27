/**
 * A scripted `fetch` for the text-completion tests, mocking `expo/fetch`:
 *
 *   jest.mock('expo/fetch', () => ({
 *     fetch: (...args) => require('./test-support/scripted-text-fetch').scriptedFetch(...args),
 *   }));
 *
 * Unlike `fake-streaming-fetch`, each call is recorded (URL, headers, body)
 * and answered from a queue, so a test chooses the status, headers and the
 * exact bytes of each chunk, such as a character split across two of them.
 */
export type ScriptedReply = {
  readonly status?: number;
  readonly headers?: Record<string, string>;
  /** Body chunks in arrival order; strings are UTF-8 encoded. */
  readonly chunks?: readonly (string | Uint8Array)[];
  /** After the chunks, stay open until the request is aborted. */
  readonly hang?: boolean;
  /** After the chunks, end the body with an error, as a dropped connection. */
  readonly drop?: boolean;
};

export type RecordedCall = {
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body: Record<string, unknown>;
};

export const calls: RecordedCall[] = [];
const replies: ScriptedReply[] = [];

export const reset = (): void => {
  calls.length = 0;
  replies.length = 0;
};

/** Queues the answer to the next request. */
export const reply = (next: ScriptedReply): void => {
  replies.push(next);
};

const encoder = new TextEncoder();
const toBytes = (chunk: string | Uint8Array) =>
  typeof chunk === 'string' ? encoder.encode(chunk) : chunk;

const abortError = () => {
  const error = new Error('aborted');
  error.name = 'AbortError';
  return error;
};

export const scriptedFetch = async (
  url: string,
  init: {
    headers: Record<string, string>;
    body: string;
    signal: AbortSignal;
  }
) => {
  calls.push({
    url,
    headers: init.headers,
    body: JSON.parse(init.body) as Record<string, unknown>,
  });
  const scripted = replies.shift() ?? { status: 500, chunks: ['no reply'] };
  const queue = (scripted.chunks ?? []).map(toBytes);
  const status = scripted.status ?? 200;

  const read = async () => {
    if (init.signal.aborted) {
      throw abortError();
    }
    const next = queue.shift();
    if (next) {
      return { done: false as const, value: next };
    }
    if (scripted.drop) {
      throw new Error('connection reset');
    }
    if (scripted.hang) {
      await new Promise<void>((resolve) =>
        init.signal.addEventListener('abort', () => resolve(), { once: true })
      );
      throw abortError();
    }
    return { done: true as const, value: undefined };
  };

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({
      'x-request-id': `req_${calls.length}`,
      ...scripted.headers,
    }),
    text: async () => {
      const decoder = new TextDecoder();
      return (
        queue.map((bytes) => decoder.decode(bytes, { stream: true })).join('') +
        decoder.decode()
      );
    },
    body: { getReader: () => ({ read }) },
  };
};
