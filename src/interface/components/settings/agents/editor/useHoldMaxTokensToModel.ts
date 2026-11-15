import { useEffect, useRef } from 'react';
import type { ModelOption } from '../../../models/model-options';
import { maxTokensForChosenModel } from '../agent-draft-max-tokens';
import type { AgentDraft } from '../agent-editor-types';

/**
 * Once per model, when its limit is known, fits Max Tokens to it
 * (`maxTokensForChosenModel`). Covers every way a model is chosen: the
 * browser, a model's page, LM Studio's menu, a provider's default model, and
 * the agent the editor opened on.
 */
export const useHoldMaxTokensToModel = (
  draft: AgentDraft,
  selected: ModelOption | undefined,
  patchDraft: (changes: Partial<AgentDraft>) => void
) => {
  const heldFor = useRef<string | null>(null);

  useEffect(() => {
    if (!selected) {
      return;
    }
    const key = `${draft.provider}:${selected.id}`;
    if (heldFor.current === key) {
      return;
    }
    heldFor.current = key;
    const changes = maxTokensForChosenModel(draft, selected);
    if (changes) {
      patchDraft(changes);
    }
  }, [draft, selected, patchDraft]);
};
