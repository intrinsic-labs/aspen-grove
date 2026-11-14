import { useCallback } from 'react';
import type { ULID } from '@domain/value-objects';
import type { ModelOption } from '../../models/model-options';
import { modelChoiceChanges } from './model-choice';
import { useTreeModelAgent } from './useTreeModelAgent';

/**
 * The tree's OpenRouter model, for the model browser's pages: the chosen
 * id and a way to choose another, saving the Maximum Output Tokens the form
 * will show for it (held to its output limit). Resolves false when the save
 * failed.
 */
export const useTreeOpenRouterChoice = (treeId: ULID | undefined) => {
  const treeModel = useTreeModelAgent(treeId);
  const { apply } = treeModel;
  const configuration = treeModel.agent?.configuration;

  const choose = useCallback(
    (id: string, option: ModelOption | undefined) =>
      apply(
        modelChoiceChanges('openrouter', id, option, configuration ?? {})
      ),
    [apply, configuration]
  );

  return {
    currentId:
      treeModel.model?.provider === 'openrouter' ? treeModel.model.id : null,
    error: treeModel.error,
    choose,
  };
};
