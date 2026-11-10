import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { resolveDefaultModelAgent } from '@application/services/resolve-default-model-agent';
import type { ULID } from '@domain/value-objects';
import { useAppBootstrapState, useAppServices } from '@interface/composition';

export type CreateLoomTreeOptions = {
  /** Use this agent instead of the pinned/default one. */
  readonly agentId?: ULID;
  /** Replace the current screen instead of pushing (onboarding's last step). */
  readonly replace?: boolean;
};

/**
 * Creates a new dialogue loom tree with the pinned/default model agent and
 * navigates into it. Shared by Home, the Loom Trees list (menu and empty
 * state) and onboarding. With no model agent yet, it opens first-run setup
 * instead of failing.
 */
export const useCreateLoomTree = (onError?: (message: string) => void) => {
  const router = useRouter();
  const { repositories, useCases } = useAppServices();
  const bootstrapState = useAppBootstrapState();
  const bootstrap =
    bootstrapState.status === 'ready' ? bootstrapState.result : null;

  const [creating, setCreating] = useState(false);

  const createTree = useCallback(
    async (options: CreateLoomTreeOptions = {}) => {
      if (!bootstrap || creating) {
        return;
      }

      try {
        setCreating(true);

        // Pinned default first; fall back to the first available shared
        // agent. Stale pins are cleared inside the helper. The pin is managed
        // in Settings → Agents ("Make default"); per-tree switching happens in
        // the chat ⚙️ sheet after creation.
        const agentId =
          options.agentId ??
          (
            await resolveDefaultModelAgent({
              agentRepository: repositories.agentRepo,
              userPreferencesRepository: repositories.userPreferencesRepo,
            })
          )?.id;
        if (!agentId) {
          router.push('/onboarding');
          return;
        }

        const created = await useCases.createDialogueLoomTreeUseCase.execute({
          groveId: bootstrap.groveId,
          ownerAgentId: bootstrap.ownerAgentId,
          defaultModelAgentId: agentId,
          initialContent: {
            type: 'text',
            text: '',
          },
          pathName: 'Main',
        });

        const target = {
          pathname: '/tree/[treeId]' as const,
          params: {
            treeId: created.tree.id,
            autofocus: '1',
            ephemeral: '1',
          },
        };
        if (options.replace) {
          router.replace(target);
        } else {
          router.push(target);
        }
      } catch (caught) {
        onError?.(caught instanceof Error ? caught.message : String(caught));
      } finally {
        setCreating(false);
      }
    },
    [
      bootstrap,
      creating,
      onError,
      repositories.agentRepo,
      repositories.userPreferencesRepo,
      router,
      useCases.createDialogueLoomTreeUseCase,
    ]
  );

  return { creating, createTree, ready: bootstrap !== null };
};
