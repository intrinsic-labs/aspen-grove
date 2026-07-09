import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { resolveDefaultModelAgent } from '@application/services/resolve-default-model-agent';
import { useAppBootstrapState, useAppServices } from '@interface/composition';

/**
 * Creates a new dialogue loom tree with the pinned/default model agent and
 * navigates into it. Shared by the loom tree list header menu and the
 * welcome screen.
 */
export const useCreateLoomTree = (onError?: (message: string) => void) => {
  const router = useRouter();
  const { repositories, useCases } = useAppServices();
  const bootstrapState = useAppBootstrapState();
  const bootstrap =
    bootstrapState.status === 'ready' ? bootstrapState.result : null;

  const [creating, setCreating] = useState(false);

  const createTree = useCallback(async () => {
    if (!bootstrap || creating) {
      return;
    }

    try {
      setCreating(true);

      // Pinned default first; fall back to the first available shared agent.
      // Stale pins are cleared inside the helper. The pin is managed in
      // Settings → Agents ("Make default"); per-tree switching happens in
      // the chat ⚙️ sheet after creation.
      const defaultAgent = await resolveDefaultModelAgent({
        agentRepository: repositories.agentRepo,
        userPreferencesRepository: repositories.userPreferencesRepo,
      });
      if (!defaultAgent) {
        throw new Error(
          'No agents yet. Create one in Settings → Agents, then come back to start a tree.'
        );
      }

      const created = await useCases.createDialogueLoomTreeUseCase.execute({
        groveId: bootstrap.groveId,
        ownerAgentId: bootstrap.ownerAgentId,
        defaultModelAgentId: defaultAgent.id,
        initialContent: {
          type: 'text',
          text: '',
        },
        pathName: 'Main',
      });

      router.push({
        pathname: '/tree/[treeId]',
        params: {
          treeId: created.tree.id,
          autofocus: '1',
          ephemeral: '1',
        },
      });
    } catch (caught) {
      onError?.(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setCreating(false);
    }
  }, [
    bootstrap,
    creating,
    onError,
    repositories.agentRepo,
    repositories.userPreferencesRepo,
    router,
    useCases.createDialogueLoomTreeUseCase,
  ]);

  return { creating, createTree, ready: bootstrap !== null };
};
