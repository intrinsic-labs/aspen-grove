import type { CompletionResponse, TokenUsage } from '@application/services/llm';
import { directProviderError } from '../direct/errors';
import type { DirectProtocol } from '../direct/types';
import { openAIBody, openAIHeaders } from './request';

type ResponsePayload = {
  model?: string;
  status?: string;
  error?: { code?: string; message?: string };
  incomplete_details?: { reason?: string };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  output?: {
    type: string;
    content?: { type: string; text?: string; refusal?: string }[];
  }[];
};
const usageOf = (usage: NonNullable<ResponsePayload['usage']>): TokenUsage => ({
  promptTokens: usage.input_tokens ?? 0,
  completionTokens: usage.output_tokens ?? 0,
  totalTokens:
    usage.total_tokens ??
    (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
});
const finishOf = (
  response: ResponsePayload
): CompletionResponse['finishReason'] => {
  if (response.status === 'completed') return 'stop';
  if (response.incomplete_details?.reason === 'max_output_tokens')
    return 'length';
  throw directProviderError('openai', undefined, {
    error: response.error ?? {
      code: response.incomplete_details?.reason ?? 'server_error',
    },
  });
};

export const openAIProtocol: DirectProtocol = {
  provider: 'openai',
  endpoint: 'https://api.openai.com/v1/responses',
  headers: openAIHeaders,
  body: openAIBody,
  completion(payload) {
    const response = payload as ResponsePayload;
    return {
      content: (response.output ?? [])
        .filter((item) => item.type === 'message')
        .flatMap((item) => item.content ?? [])
        .map((part) =>
          part.type === 'output_text'
            ? (part.text ?? '')
            : part.type === 'refusal'
              ? (part.refusal ?? '')
              : ''
        )
        .join(''),
      model: response.model,
      finishReason: finishOf(response),
      usage: response.usage ? usageOf(response.usage) : undefined,
    };
  },
  event(payload, state) {
    const event = payload as {
      type?: string;
      delta?: string;
      response?: ResponsePayload;
      code?: string;
      message?: string;
    };
    if (event.type === 'error')
      throw directProviderError('openai', undefined, { error: event });
    const response = event.response;
    if (response) {
      state.model = response.model ?? state.model;
      if (response.usage) state.usage = usageOf(response.usage);
    }
    if (
      ['response.completed', 'response.incomplete', 'response.failed'].includes(
        event.type ?? ''
      ) &&
      response
    ) {
      state.finishReason = finishOf(response);
      state.terminal = true;
    }
    if (
      event.type !== 'response.output_text.delta' &&
      event.type !== 'response.refusal.delta'
    )
      return null;
    if (!event.delta) return null;
    state.content += event.delta;
    return { type: 'text', content: event.delta };
  },
};
