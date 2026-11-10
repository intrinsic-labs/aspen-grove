/**
 * Response bodies in the shapes the app's LM Studio adapter parses
 * (src/infrastructure/llm/lmstudio/types.ts).
 */

export type Usage = {
  readonly prompt_tokens: number;
  readonly completion_tokens: number;
  readonly total_tokens: number;
};

/** `GET /api/v1/models`: LM Studio's native model list, all loaded. */
export const modelsPayload = (modelIds: readonly string[]) => ({
  models: modelIds.map((key) => ({
    type: 'llm',
    publisher: 'mock',
    key,
    display_name: key,
    architecture: 'mock',
    quantization: null,
    size_bytes: 0,
    params_string: null,
    loaded_instances: [{ id: key }],
    max_context_length: 8192,
    format: null,
  })),
});

export const errorPayload = (message: string) => ({
  error: { message, type: 'mock_error' },
});

export const usageFor = (promptText: string, completionTokens: number): Usage => {
  const promptTokens = promptText.split(/\s+/).filter(Boolean).length;
  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
  };
};

/** Non-streaming `POST /v1/chat/completions`. */
export const completionPayload = (input: {
  readonly id: string;
  readonly model: string;
  readonly text: string;
  readonly finishReason: 'stop' | 'length';
  readonly usage: Usage;
}) => ({
  id: input.id,
  object: 'chat.completion',
  created: Math.floor(Date.now() / 1000),
  model: input.model,
  choices: [
    {
      index: 0,
      message: { role: 'assistant', content: input.text },
      finish_reason: input.finishReason,
    },
  ],
  usage: input.usage,
});

/** One SSE event of a streaming completion, with its blank-line terminator. */
export const sseChunk = (input: {
  readonly id: string;
  readonly model: string;
  readonly content?: string;
  readonly finishReason?: 'stop' | 'length';
  readonly usage?: Usage;
}): string =>
  `data: ${JSON.stringify({
    id: input.id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: input.model,
    choices: [
      {
        index: 0,
        delta: input.content === undefined ? {} : { content: input.content },
        finish_reason: input.finishReason ?? null,
      },
    ],
    ...(input.usage ? { usage: input.usage } : {}),
  })}\n\n`;

export const SSE_DONE = 'data: [DONE]\n\n';
