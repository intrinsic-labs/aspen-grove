import { useCallback } from 'react';
import type { ULID } from '@domain/value-objects';
import type { ModelOption } from '../../models/model-options';
import { modelChoiceChanges } from './model-choice';
import { useTreeModelAgent } from './useTreeModelAgent';

/**
 * The tree's OpenRouter model, for the model browser's pages: the chosen
 * id and a way to choose another (with "Always use maximum allowed" on, at
 * its own output limit). Resolves false when the save failed.
 */
export const useTreeOpenRouterChoice = (treeId: ULID | undefined) => {
  const treeModel = useTreeModelAgent(treeId);
  const { apply } = treeModel;
  const useMaxTokens = treeModel.agent?.configuration.useMaxTokens ?? false;

  const choose = useCallback(
    (id: string, option: ModelOption | undefined) =>
      apply(modelChoiceChanges('openrouter', id, option, useMaxTokens)),
    [apply, useMaxTokens]
  );

  return {
    currentId:
      treeModel.model?.provider === 'openrouter' ? treeModel.model.id : null,
    error: treeModel.error,
    choose,
  };
};
