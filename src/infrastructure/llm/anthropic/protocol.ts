import type { CompletionResponse, TokenUsage } from '@application/services/llm';
import { directProviderError } from '../direct/errors';
import type { DirectProtocol } from '../direct/types';
import { anthropicBody, anthropicHeaders } from './request';

type Usage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
};
type Message = {
  model?: string;
  content?: { type: string; text?: string }[];
  stop_reason?: string;
  usage?: Usage;
};
type Event = {
  type?: string;
  message?: Message;
  content_block?: { type: string; text?: string };
  delta?: { type?: string; text?: string; stop_reason?: string };
  usage?: Usage;
};
const usageOf = (usage: Usage, previous?: TokenUsage): TokenUsage => {
  const promptTokens =
    usage.input_tokens === undefined
      ? (previous?.promptTokens ?? 0)
      : usage.input_tokens +
        (usage.cache_read_input_tokens ?? 0) +
        (usage.cache_creation_input_tokens ?? 0);
  const completionTokens =
    usage.output_tokens ?? previous?.completionTokens ?? 0;
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
};
const finishOf = (reason?: string): CompletionResponse['finishReason'] => {
  if (reason === 'end_turn' || reason === 'stop_sequence') return 'stop';
  if (reason === 'max_tokens' || reason === 'model_context_window_exceeded')
    return 'length';
  if (reason === 'tool_use') return 'toolUse';
  return 'error';
};

export const anthropicProtocol: DirectProtocol = {
  provider: 'anthropic',
  endpoint: 'https://api.anthropic.com/v1/messages',
  headers: anthropicHeaders,
  body: anthropicBody,
  completion(payload) {
    const message = payload as Message;
    if ((payload as Event).type === 'error')
      throw directProviderError('anthropic', undefined, payload);
    return {
      content: (message.content ?? [])
        .filter((block) => block.type === 'text')
        .map((block) => block.text ?? '')
        .join(''),
      model: message.model,
      finishReason: finishOf(message.stop_reason),
      usage: message.usage ? usageOf(message.usage) : undefined,
    };
  },
  event(payload, state) {
    const event = payload as Event;
    if (event.type === 'error')
      throw directProviderError('anthropic', undefined, payload);
    if (event.type === 'message_start') {
      state.model = event.message?.model;
      if (event.message?.usage) state.usage = usageOf(event.message.usage);
    }
    if (event.type === 'message_delta') {
      if (event.usage) state.usage = usageOf(event.usage, state.usage);
      if (event.delta?.stop_reason)
        state.finishReason = finishOf(event.delta.stop_reason);
    }
    if (event.type === 'message_stop') state.terminal = true;
    const text =
      event.type === 'content_block_delta' && event.delta?.type === 'text_delta'
        ? event.delta.text
        : event.type === 'content_block_start' &&
            event.content_block?.type === 'text'
          ? event.content_block.text
          : undefined;
    if (!text) return null; // ping, thinking, usage, and future events are not visible text.
    state.content += text;
    return { type: 'text', content: text };
  },
};
