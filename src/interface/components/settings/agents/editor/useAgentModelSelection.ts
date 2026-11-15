import { catalogModelForId } from '../../../models/catalog-model-for-id';
import { useModelPickerData } from '../../../models/useModelPickerData';
import type { AgentDraft } from '../agent-editor-types';

/**
 * The draft's provider's model list and, once it has loaded, the draft's
 * model in it: `selected` when the provider lists the id itself (undefined
 * for a custom id), and `limitModel`, the listed model whose limits apply,
 * which a custom id gets too when it names a listed model (another case, or
 * an OpenRouter routing variant such as `:nitro`).
 */
export const useAgentModelSelection = (draft: AgentDraft) => {
  const picker = useModelPickerData(draft.provider);
  const listReady = picker.settledFor === draft.provider && !picker.error;
  const modelId = draft.modelIdentifier || null;
  const selected = listReady
    ? picker.options.find((option) => option.id === modelId)
    : undefined;
  const limitModel = listReady
    ? catalogModelForId(modelId, picker.options)
    : undefined;
  return { picker, listReady, modelId, selected, limitModel };
};

export type AgentModelSelection = ReturnType<typeof useAgentModelSelection>;
