import { useCallback, useState } from 'react';
import type { ILoomTreeRepository } from '@application/repositories';
import type { ULID } from '@domain/value-objects';
import { toErrorMessage } from '../error-message';

type UseTreeDescriptionInput = {
  readonly treeId: ULID | null;
  readonly treeRepo: Pick<ILoomTreeRepository, 'findById' | 'update'>;
  readonly setError: (error: string | null) => void;
};

/**
 * The menu's Edit Description (ToolbarMenu.swift:55-62,118-131): the sheet
 * opens on the tree's description, Save writes it and closes, a swipe down
 * drops the draft.
 */
export const useTreeDescription = ({
  treeId,
  treeRepo,
  setError,
}: UseTreeDescriptionInput) => {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState('');

  const open = useCallback(async () => {
    if (!treeId) {
      return;
    }
    try {
      const tree = await treeRepo.findById(treeId);
      setDraft(tree?.description ?? '');
      setVisible(true);
    } catch (caught) {
      setError(toErrorMessage(caught));
    }
  }, [setError, treeId, treeRepo]);

  const save = useCallback(async () => {
    setVisible(false);
    if (!treeId) {
      return;
    }
    try {
      await treeRepo.update({ id: treeId, changes: { description: draft } });
    } catch (caught) {
      setError(toErrorMessage(caught));
    }
  }, [draft, setError, treeId, treeRepo]);

  return {
    visible,
    draft,
    setDraft,
    open: () => void open(),
    save: () => void save(),
    close: () => setVisible(false),
  };
};
