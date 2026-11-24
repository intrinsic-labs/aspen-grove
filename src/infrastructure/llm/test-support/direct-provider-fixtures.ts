/** Wire fixtures, independent of the protocol implementations under test. */
export const frame = (type: string, payload: object = {}) =>
  `event: ${type}\r\ndata: ${JSON.stringify({ type, ...payload })}\r\n\r\n`;
export const streamFixture = (
  provider: 'anthropic' | 'openai',
  text = 'Hi 🌲',
  length = false
) =>
  provider === 'anthropic'
    ? frame('message_start', {
        message: {
          model: 'actual-model',
          usage: { input_tokens: 3, output_tokens: 0 },
        },
      }) +
      frame('ping') +
      frame('content_block_start', {
        index: 0,
        content_block: { type: 'text', text: '' },
      }) +
      frame('content_block_delta', {
        delta: { type: 'thinking_delta', thinking: 'private' },
      }) +
      frame('content_block_delta', { delta: { type: 'text_delta', text } }) +
      frame('content_block_stop') +
      frame('message_delta', {
        delta: { stop_reason: length ? 'max_tokens' : 'end_turn' },
        usage: { output_tokens: 2 },
      }) +
      frame('message_stop')
    : frame('response.created', {
        response: { model: 'actual-model', status: 'in_progress' },
      }) +
      frame('response.in_progress', { response: { model: 'actual-model' } }) +
      frame('response.output_text.delta', { delta: text }) +
      frame('response.output_text.done', { text }) +
      frame(length ? 'response.incomplete' : 'response.completed', {
        response: {
          model: 'actual-model',
          status: length ? 'incomplete' : 'completed',
          incomplete_details: length ? { reason: 'max_output_tokens' } : null,
          usage: { input_tokens: 3, output_tokens: 2, total_tokens: 5 },
        },
      });

export const completionFixture = (provider: 'anthropic' | 'openai') =>
  provider === 'anthropic'
    ? {
        model: 'actual-model',
        content: [
          { type: 'thinking', thinking: 'private' },
          { type: 'text', text: 'Hi 🌲' },
        ],
        stop_reason: 'end_turn',
        usage: { input_tokens: 3, output_tokens: 2 },
      }
    : {
        model: 'actual-model',
        status: 'completed',
        output: [
          { type: 'reasoning' },
          {
            type: 'message',
            content: [{ type: 'output_text', text: 'Hi 🌲' }],
          },
        ],
        usage: { input_tokens: 3, output_tokens: 2, total_tokens: 5 },
      };

/** Every byte separately exercises UTF-8 and SSE boundaries, including CRLF. */
export const mockResponse = (
  body: string,
  options: {
    status?: number;
    signal?: AbortSignal;
    hang?: boolean;
    bytewise?: boolean;
  } = {}
) => {
  const encoded = new TextEncoder().encode(body);
  const bytes = options.bytewise
    ? [...encoded].map((byte) => new Uint8Array([byte]))
    : [encoded];
  let index = 0;
  const aborted = () => {
    const error = new Error('aborted');
    error.name = 'AbortError';
    return error;
  };
  return {
    ok: (options.status ?? 200) < 400,
    status: options.status ?? 200,
    headers: new Headers({
      'content-type': 'text/event-stream',
      'x-request-id': 'req-1',
      'retry-after': '2',
    }),
    text: async () => body,
    body: {
      getReader: () => ({
        releaseLock() {},
        async read() {
          if (options.signal?.aborted) throw aborted();
          if (index < bytes.length)
            return { done: false, value: bytes[index++] };
          if (options.hang)
            return new Promise<never>((_resolve, reject) => {
              options.signal?.addEventListener(
                'abort',
                () => reject(aborted()),
                { once: true }
              );
            });
          return { done: true, value: undefined };
        },
      }),
    },
  };
};
