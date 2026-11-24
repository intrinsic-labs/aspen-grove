import type { OpenRouterCatalogModel } from '@application/services/llm';

/** /models supplies no endpoint or modality metadata. Keep Responses text families,
 * excluding specialized endpoints and Chat Completions-only aliases. Manual IDs
 * still work for new families until this conservative filter is updated. */
export const isOpenAITextModel = (id: string): boolean => {
  const base = id.startsWith('ft:') ? (id.split(':')[1] ?? '') : id;
  return (
    /^(?:gpt-(?:4o|4\.1|4\.5|[5-9](?:\.\d+)?)|o[134])(?:-|$)/.test(base) &&
    !/(?:audio|realtime|transcribe|tts|image|search|deep-research|chat-latest|instruct|o1-mini|o1-preview|o1-pro|o3-pro)/.test(
      base
    )
  );
};

export const normalizeOpenAIModel = (
  value: unknown
): OpenRouterCatalogModel | null => {
  const model = value as { id?: string; created?: number } | null;
  if (!model || typeof model.id !== 'string' || !isOpenAITextModel(model.id))
    return null;
  return {
    id: model.id,
    displayName: model.id,
    created:
      typeof model.created === 'number' && Number.isFinite(model.created)
        ? model.created
        : undefined,
    inputModalities: ['text'],
    outputModalities: ['text'],
    supportedParameters: /^gpt-4/.test(model.id)
      ? ['max_tokens', 'temperature']
      : ['max_tokens'],
  };
};
