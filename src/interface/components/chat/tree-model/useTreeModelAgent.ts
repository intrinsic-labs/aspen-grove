import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { resolveDefaultModelAgent } from '@application/services/resolve-default-model-agent';
import { isUsableTreeModelAgent } from '@application/services/resolve-tree-model-agent';
import type { TreeModelSettingsChanges } from '@application/use-cases';
import type { Agent } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { useAppServices } from '@interface/composition';
import { toErrorMessage } from '../error-message';
import { markTreeModelChanged } from './tree-model-change-store';

/** `openrouter:openai/gpt-4o` → its provider and bare id. */
export const splitModelRef = (
  modelRef: string | undefined
): { readonly provider: string; readonly id: string } | null => {
  const colon = modelRef?.indexOf(':') ?? -1;
  return modelRef && colon > 0
    ? { provider: modelRef.slice(0, colon), id: modelRef.slice(colon + 1) }
    : null;
};

/**
 * The tree's model agent for its Model Settings pages: read on every focus
 * (a pushed page may have changed it), and changed only through
 * `UpdateTreeModelSettingsUseCase`, which forks a shared agent first. Each
 * change marks the tree so its dialogue re-reads its session.
 */
export const useTreeModelAgent = (treeId: ULID | undefined) => {
  const { repositories, useCases } = useAppServices();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [defaultAgentModel, setDefaultAgentModel] =
    useState<ReturnType<typeof splitModelRef>>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!treeId) {
      return;
    }
    try {
      const tree = await repositories.treeRepo.findById(treeId);
      const current = tree?.defaultModelAgentId
        ? await repositories.agentRepo.findById(tree.defaultModelAgentId)
        : null;
      const fallback = await resolveDefaultModelAgent({
        agentRepository: repositories.agentRepo,
        userPreferencesRepository: repositories.userPreferencesRepo,
      });
      setAgent(isUsableTreeModelAgent(current, treeId) ? current : null);
      setDefaultAgentModel(splitModelRef(fallback?.modelRef));
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setLoaded(true);
    }
  }, [repositories, treeId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const apply = useCallback(
    async (changes: TreeModelSettingsChanges): Promise<boolean> => {
      if (!treeId) {
        return false;
      }
      setError(null);
      try {
        const result = await useCases.updateTreeModelSettingsUseCase.execute({
          treeId,
          changes,
        });
        setAgent(result.agent);
        markTreeModelChanged(treeId);
        return true;
      } catch (caught) {
        setError(toErrorMessage(caught));
        return false;
      }
    },
    [treeId, useCases.updateTreeModelSettingsUseCase]
  );

  return {
    agent,
    model: splitModelRef(agent?.modelRef),
    defaultAgentModel,
    loaded,
    error,
    apply,
  };
};
