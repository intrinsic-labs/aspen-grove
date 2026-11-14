import { useModelPickerData } from '../../../models/useModelPickerData';
import type { AgentDraft } from '../agent-editor-types';

/**
 * The draft's provider's model list and, once it has loaded, the draft's
 * model in it (undefined for an id the provider doesn't list).
 */
export const useAgentModelSelection = (draft: AgentDraft) => {
  const picker = useModelPickerData(draft.provider);
  const listReady = picker.settledFor === draft.provider && !picker.error;
  const modelId = draft.modelIdentifier || null;
  const selected = listReady
    ? picker.options.find((option) => option.id === modelId)
    : undefined;
  return { picker, listReady, modelId, selected };
};

export type AgentModelSelection = ReturnType<typeof useAgentModelSelection>;
