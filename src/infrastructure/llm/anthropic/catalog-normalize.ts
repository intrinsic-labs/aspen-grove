import type { OpenRouterCatalogModel } from '@application/services/llm';

export const normalizeAnthropicModel = (
  value: unknown
): OpenRouterCatalogModel | null => {
  const model = value as {
    id?: string;
    display_name?: string;
    created_at?: string;
    max_input_tokens?: number;
    max_tokens?: number;
    lifecycle?: string;
  } | null;
  if (
    !model ||
    typeof model.id !== 'string' ||
    !model.id ||
    model.lifecycle === 'retired'
  )
    return null;
  const created = model.created_at
    ? Date.parse(model.created_at) / 1000
    : undefined;
  return {
    id: model.id,
    displayName:
      typeof model.display_name === 'string' && model.display_name
        ? model.display_name
        : model.id,
    created:
      created !== undefined && Number.isFinite(created) ? created : undefined,
    contextLength:
      typeof model.max_input_tokens === 'number' && model.max_input_tokens > 0
        ? model.max_input_tokens
        : undefined,
    maxCompletionTokens:
      typeof model.max_tokens === 'number' && model.max_tokens > 0
        ? model.max_tokens
        : undefined,
    inputModalities: ['text'],
    outputModalities: ['text'],
    supportedParameters: ['max_tokens', 'stop'],
  };
};
