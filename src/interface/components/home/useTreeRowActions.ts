import { useCallback, useState } from 'react';
import { Alert, Platform } from 'react-native';
import type { LoomTree } from '@domain/entities';
import { useAppServices } from '@interface/composition';

type UseTreeRowActionsInput = {
  /** Reloads the list after a rename or delete. */
  readonly reload: () => Promise<void>;
  readonly setError: (message: string | null) => void;
};

const RENAME_TITLE = 'Loom Tree Name';

/**
 * Home's swipe actions on a tree row (HomeScreenView.swift:77-98):
 * "Edit Name" asks for a new title in an alert with a text field and saves
 * it; Delete removes the tree with its nodes, as `.onDelete` does.
 * Android has no alert with a text field, so it renames in the title sheet
 * (`renameTarget`).
 */
export const useTreeRowActions = ({
  reload,
  setError,
}: UseTreeRowActionsInput) => {
  const { repositories } = useAppServices();
  const [renameTarget, setRenameTarget] = useState<LoomTree | null>(null);

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
      setRenameTarget(null);
      await reload();
    },
    [reload, repositories.treeRepo]
  );

  const rename = useCallback(
    (tree: LoomTree) => {
      if (Platform.OS !== 'ios') {
        setRenameTarget(tree);
        return;
      }
      Alert.prompt(
        RENAME_TITLE,
        undefined,
        [
          {
            text: 'Save',
            onPress: (title?: string) =>
              void saveTitle(tree, title ?? '').catch(showError(setError)),
          },
          { text: 'Cancel', style: 'cancel' },
        ],
        'plain-text',
        tree.title
      );
    },
    [saveTitle, setError]
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
    rename,
    remove,
    renameTarget,
    closeRename: () => setRenameTarget(null),
    saveRename: (title: string) =>
      renameTarget ? saveTitle(renameTarget, title) : Promise.resolve(),
  };
};

const showError =
  (setError: (message: string | null) => void) => (caught: unknown) =>
    setError(caught instanceof Error ? caught.message : String(caught));
