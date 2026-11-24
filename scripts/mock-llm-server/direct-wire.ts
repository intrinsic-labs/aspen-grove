import {
  completionPayload,
  errorPayload,
  sseChunk,
  SSE_DONE,
  type Usage,
} from './payloads.ts';

export type WireProtocol = 'chat' | 'anthropic' | 'openai';
type Meta = { id: string; model: string };
const event = (type: string, rest: object = {}) =>
  `event: ${type}\ndata: ${JSON.stringify({ type, ...rest })}\n\n`;
const directUsage = (usage: Usage) => ({
  input_tokens: usage.prompt_tokens,
  output_tokens: usage.completion_tokens,
});

export const normalizeBody = (
  body: Record<string, unknown>,
  protocol: WireProtocol
) => {
  const messages = protocol === 'openai' ? body.input : body.messages;
  const system = protocol === 'openai' ? body.instructions : body.system;
  return {
    ...body,
    messages: [
      ...(typeof system === 'string'
        ? [{ role: 'system', content: system }]
        : []),
      ...(Array.isArray(messages) ? messages : []),
    ],
    max_tokens:
      protocol === 'openai' ? body.max_output_tokens : body.max_tokens,
  };
};

export const directCompletion = (
  protocol: WireProtocol,
  input: Meta & { text: string; finishReason: 'stop' | 'length'; usage: Usage }
) => {
  if (protocol === 'chat') return completionPayload(input);
  if (protocol === 'anthropic')
    return {
      id: input.id,
      model: input.model,
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: input.text }],
      stop_reason: input.finishReason === 'length' ? 'max_tokens' : 'end_turn',
      usage: directUsage(input.usage),
    };
  return {
    id: input.id,
    model: input.model,
    object: 'response',
    status: input.finishReason === 'length' ? 'incomplete' : 'completed',
    incomplete_details:
      input.finishReason === 'length' ? { reason: 'max_output_tokens' } : null,
    output: [
      {
        id: `msg_${input.id}`,
        type: 'message',
        role: 'assistant',
        content: [{ type: 'output_text', text: input.text, annotations: [] }],
      },
    ],
    usage: {
      ...directUsage(input.usage),
      total_tokens: input.usage.total_tokens,
    },
  };
};

export const streamStart = (
  protocol: WireProtocol,
  meta: Meta,
  usage: Usage
): string => {
  if (protocol === 'chat') return '';
  if (protocol === 'anthropic')
    return (
      event('message_start', {
        message: {
          ...meta,
          type: 'message',
          role: 'assistant',
          content: [],
          usage: { input_tokens: usage.prompt_tokens, output_tokens: 0 },
        },
      }) +
      event('ping') +
      event('content_block_start', {
        index: 0,
        content_block: { type: 'text', text: '' },
      })
    );
  return event('response.created', {
    response: { ...meta, status: 'in_progress' },
  });
};
export const streamDelta = (
  protocol: WireProtocol,
  meta: Meta,
  content: string
): string => {
  if (protocol === 'chat') return sseChunk({ ...meta, content });
  if (protocol === 'anthropic')
    return event('content_block_delta', {
      index: 0,
      delta: { type: 'text_delta', text: content },
    });
  return event('response.output_text.delta', {
    item_id: `msg_${meta.id}`,
    output_index: 0,
    content_index: 0,
    delta: content,
  });
};
export const streamEnd = (
  protocol: WireProtocol,
  meta: Meta & { tokens: string[]; capped: boolean },
  usage: Usage
): string => {
  const finishReason = meta.capped ? 'length' : 'stop';
  if (protocol === 'chat')
    return sseChunk({ ...meta, finishReason, usage }) + SSE_DONE;
  if (protocol === 'anthropic')
    return (
      event('content_block_stop', { index: 0 }) +
      event('message_delta', {
        delta: {
          stop_reason: meta.capped ? 'max_tokens' : 'end_turn',
          stop_sequence: null,
        },
        usage: { output_tokens: usage.completion_tokens },
      }) +
      event('message_stop')
    );
  return (
    event('response.output_text.done', {
      text: meta.tokens.join(''),
      item_id: `msg_${meta.id}`,
      output_index: 0,
      content_index: 0,
    }) +
    event(meta.capped ? 'response.incomplete' : 'response.completed', {
      response: directCompletion(protocol, {
        ...meta,
        text: meta.tokens.join(''),
        finishReason,
        usage,
      }),
    })
  );
};

/** Provider-shaped error envelopes; the HTTP status still drives classification. */
export const directError = (
  protocol: WireProtocol,
  status: number,
  message: string
) => {
  if (protocol === 'chat') return errorPayload(message);
  const type =
    status === 401
      ? 'authentication_error'
      : status === 404
        ? 'not_found_error'
        : status === 429
          ? 'rate_limit_error'
          : status >= 500
            ? 'api_error'
            : 'invalid_request_error';
  return protocol === 'anthropic'
    ? { type: 'error', error: { type, message } }
    : {
        error: {
          message,
          type,
          code: status === 404 ? 'model_not_found' : undefined,
        },
      };
};
