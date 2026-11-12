import { useCallback, useState, type MutableRefObject } from 'react';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { ILoomTreeRepository } from '@application/repositories';
import { isDefaultTreeTitle } from '@application/services/tree-title';
import type { ULID } from '@domain/value-objects';

type UseTreeTitleInput = {
  readonly navigation: Pick<NavigationProp<ParamListBase>, 'setOptions'>;
  readonly treeRepo: Pick<ILoomTreeRepository, 'update'>;
  readonly sessionTreeId: ULID | undefined;
  readonly activeTreeIdRef: MutableRefObject<ULID | null>;
};

/**
 * The tree's title: shown in the header, renamed from the title sheet.
 * `applyTreeTitle` is the one way a new title reaches both state and header.
 */
export const useTreeTitle = ({
  navigation,
  treeRepo,
  sessionTreeId,
  activeTreeIdRef,
}: UseTreeTitleInput) => {
  const [treeTitle, setTreeTitle] = useState('');
  const [titleEditorVisible, setTitleEditorVisible] = useState(false);

  const applyTreeTitle = useCallback(
    (title: string) => {
      setTreeTitle(title);
      // An untitled tree shows no title until its first message names it.
      navigation.setOptions({ title: isDefaultTreeTitle(title) ? '' : title });
    },
    [navigation]
  );

  const saveTreeTitle = useCallback(
    async (title: string) => {
      const treeId = sessionTreeId ?? activeTreeIdRef.current;
      if (!treeId) {
        throw new Error('No active Loom Tree to rename.');
      }

      const trimmedTitle = title.trim();
      if (trimmedTitle.length === 0) {
        throw new Error('Title is required.');
      }

      const updated = await treeRepo.update({
        id: treeId,
        changes: { title: trimmedTitle },
      });

      applyTreeTitle(updated.title);
      setTitleEditorVisible(false);
    },
    [activeTreeIdRef, applyTreeTitle, sessionTreeId, treeRepo]
  );

  return {
    treeTitle,
    titleEditorVisible,
    setTitleEditorVisible,
    applyTreeTitle,
    saveTreeTitle,
  };
};
