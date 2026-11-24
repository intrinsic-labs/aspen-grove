import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAppBootstrapState, useAppServices } from '@interface/composition';

/**
 * Creates an empty buffer-mode tree and opens it. Not ephemeral: an empty
 * buffer is a document and stays in Recents until it is deleted. Resolves to
 * whether the buffer opened.
 */
export const useCreateBufferTree = (onError?: (message: string) => void) => {
  const router = useRouter();
  const { useCases } = useAppServices();
  const bootstrapState = useAppBootstrapState();
  const bootstrap =
    bootstrapState.status === 'ready' ? bootstrapState.result : null;
  const [creating, setCreating] = useState(false);

  const createBuffer = useCallback(async (): Promise<boolean> => {
    if (!bootstrap || creating) {
      return false;
    }
    try {
      setCreating(true);
      const created = await useCases.createBufferLoomTreeUseCase.execute({
        groveId: bootstrap.groveId,
        ownerAgentId: bootstrap.ownerAgentId,
      });
      router.push({
        pathname: '/tree/[treeId]',
        params: { treeId: created.tree.id },
      });
      return true;
    } catch (caught) {
      onError?.(caught instanceof Error ? caught.message : String(caught));
      return false;
    } finally {
      setCreating(false);
    }
  }, [
    bootstrap,
    creating,
    onError,
    router,
    useCases.createBufferLoomTreeUseCase,
  ]);

  return { creating, createBuffer };
};
