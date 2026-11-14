import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { resolveDefaultModelAgent } from '@application/services/resolve-default-model-agent';
import type { ULID } from '@domain/value-objects';
import { useAppBootstrapState, useAppServices } from '@interface/composition';
import { setFirstMessage } from '@interface/components/chat/turns/first-message-store';

export type CreateLoomTreeOptions = {
  /** Use this agent instead of the pinned/default one. */
  readonly agentId?: ULID;
  /** Replace the current screen instead of pushing (onboarding's last step). */
  readonly replace?: boolean;
  /**
   * Home's composer: the tree opens and sends this as its first message
   * (HomeScreenView.swift `createtree`), instead of opening empty with the
   * composer focused.
   */
  readonly firstMessage?: string;
};

/**
 * Creates a new dialogue loom tree with the pinned/default model agent and
 * navigates into it. Shared by Home's composer and onboarding. With no model
 * agent yet, it opens first-run setup instead of failing. Resolves to
 * whether the tree opened.
 */
export const useCreateLoomTree = (onError?: (message: string) => void) => {
  const router = useRouter();
  const { repositories, useCases } = useAppServices();
  const bootstrapState = useAppBootstrapState();
  const bootstrap =
    bootstrapState.status === 'ready' ? bootstrapState.result : null;

  const [creating, setCreating] = useState(false);

  const createTree = useCallback(
    async (options: CreateLoomTreeOptions = {}): Promise<boolean> => {
      if (!bootstrap || creating) {
        return false;
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
          return false;
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

        const firstMessage = options.firstMessage?.trim();
        if (firstMessage) {
          setFirstMessage(created.tree.id, firstMessage);
        }
        const target = {
          pathname: '/tree/[treeId]' as const,
          params: {
            treeId: created.tree.id,
            // Until its first message is saved, leaving deletes the tree.
            ephemeral: '1',
            ...(firstMessage ? {} : { autofocus: '1' }),
          },
        };
        if (options.replace) {
          router.replace(target);
        } else {
          router.push(target);
        }
        return true;
      } catch (caught) {
        onError?.(caught instanceof Error ? caught.message : String(caught));
        return false;
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
