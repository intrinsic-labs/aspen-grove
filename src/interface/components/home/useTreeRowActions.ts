import { useCallback } from 'react';
import type { LoomTree } from '@domain/entities';
import { useAppServices } from '@interface/composition';
import { useTextPrompt } from '@/interface/ui/components/text-prompt/useTextPrompt';
import { treeNamePrompt } from '../chat/header-actions/tree-name-prompt';

type UseTreeRowActionsInput = {
  /** Reloads the list after a rename or delete. */
  readonly reload: () => Promise<void>;
  readonly setError: (message: string | null) => void;
};

/**
 * Home's swipe actions on a tree row (HomeScreenView.swift:77-98):
 * "Edit Name" asks for a new title in an alert with a text field and saves
 * it; Delete removes the tree with its nodes, as `.onDelete` does.
 * Android asks in `TextPromptDialog` (`renamePrompt`).
 */
export const useTreeRowActions = ({
  reload,
  setError,
}: UseTreeRowActionsInput) => {
  const { repositories } = useAppServices();
  const { prompt, pending } = useTextPrompt();

  const saveTitle = useCallback(
    async (tree: LoomTree, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) {
        return;
      }
      await repositories.treeRepo.update({
        id: tree.id,
        changes: { title: trimmed },
      });
      await reload();
    },
    [reload, repositories.treeRepo]
  );

  const rename = useCallback(
    async (tree: LoomTree) => {
      const title = await prompt(treeNamePrompt(tree.title));
      if (title !== null) {
        await saveTitle(tree, title).catch(showError(setError));
      }
    },
    [prompt, saveTitle, setError]
  );

  const remove = useCallback(
    async (tree: LoomTree) => {
      try {
        await repositories.treeRepo.hardDelete(tree.id);
        await reload();
      } catch (caught) {
        showError(setError)(caught);
      }
    },
    [reload, repositories.treeRepo, setError]
  );

  return {
    rename: (tree: LoomTree) => void rename(tree),
    remove,
    renamePrompt: pending,
  };
};

const showError =
  (setError: (message: string | null) => void) => (caught: unknown) =>
    setError(caught instanceof Error ? caught.message : String(caught));
