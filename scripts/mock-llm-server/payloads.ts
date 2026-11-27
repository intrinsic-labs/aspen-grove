/**
 * Response bodies in the shapes the app's LM Studio adapter parses
 * (src/infrastructure/llm/lmstudio/types.ts).
 */

export type Usage = {
  readonly prompt_tokens: number;
  readonly completion_tokens: number;
  readonly total_tokens: number;
};

/** How LM Studio's list shows the base-model fixture. */
export const BASE_MODEL_NAME = 'Writing fixture (base)';

/** A model's key, and the name LM Studio lists it under (the key when absent). */
export type MockModel =
  string | { readonly key: string; readonly name: string };

const modelEntry = (model: MockModel, loaded: boolean) => {
  const key = typeof model === 'string' ? model : model.key;
  return {
    type: 'llm',
    publisher: 'mock',
    key,
    display_name: typeof model === 'string' ? key : model.name,
    architecture: 'mock',
    quantization: null,
    size_bytes: 0,
    params_string: null,
    loaded_instances: loaded ? [{ id: key }] : [],
    max_context_length: 8192,
    format: null,
  };
};

/**
 * `GET /api/v1/models`: LM Studio's native model list. The loaded models
 * answer; the others are downloaded but not loaded, which a server with
 * JIT loading off answers with a 404.
 */
export const modelsPayload = (
  loadedIds: readonly MockModel[],
  notLoadedIds: readonly MockModel[] = []
) => ({
  models: [
    ...loadedIds.map((key) => modelEntry(key, true)),
    ...notLoadedIds.map((key) => modelEntry(key, false)),
  ],
});

export const errorPayload = (message: string) => ({
  error: { message, type: 'mock_error' },
});

export const usageFor = (
  promptText: string,
  completionTokens: number
): Usage => {
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
