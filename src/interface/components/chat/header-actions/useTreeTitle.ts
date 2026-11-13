import { useCallback, useState, type MutableRefObject } from 'react';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { ILoomTreeRepository } from '@application/repositories';
import { isDefaultTreeTitle } from '@application/services/tree-title';
import type { ULID } from '@domain/value-objects';
import type {
  TextPromptRequest,
  TextPromptResult,
} from '@/interface/ui/components/text-prompt/text-prompt';
import { toErrorMessage } from '../error-message';
import { treeNamePrompt } from './tree-name-prompt';

type UseTreeTitleInput = {
  readonly navigation: Pick<NavigationProp<ParamListBase>, 'setOptions'>;
  readonly treeRepo: Pick<ILoomTreeRepository, 'update'>;
  readonly sessionTreeId: ULID | undefined;
  readonly activeTreeIdRef: MutableRefObject<ULID | null>;
  readonly prompt: (request: TextPromptRequest) => Promise<TextPromptResult>;
  readonly setError: (error: string | null) => void;
};

/**
 * The tree's title: shown in the header, renamed from the menu's Edit Title
 * in the "Loom Tree Name" alert. `applyTreeTitle` is the one way a new
 * title reaches both state and header.
 */
export const useTreeTitle = ({
  navigation,
  treeRepo,
  sessionTreeId,
  activeTreeIdRef,
  prompt,
  setError,
}: UseTreeTitleInput) => {
  const [treeTitle, setTreeTitle] = useState('');

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
      const trimmedTitle = title.trim();
      // An empty name keeps the old one, as Home's Edit Name does.
      if (!treeId || trimmedTitle.length === 0) {
        return;
      }

      const updated = await treeRepo.update({
        id: treeId,
        changes: { title: trimmedTitle },
      });

      applyTreeTitle(updated.title);
    },
    [activeTreeIdRef, applyTreeTitle, sessionTreeId, treeRepo]
  );

  const editTreeTitle = useCallback(async () => {
    // An untitled tree's placeholder name isn't offered for editing.
    const current = isDefaultTreeTitle(treeTitle) ? '' : treeTitle;
    const title = await prompt(treeNamePrompt(current));
    if (title === null) {
      return;
    }
    try {
      await saveTreeTitle(title);
    } catch (caught) {
      setError(toErrorMessage(caught));
    }
  }, [prompt, saveTreeTitle, setError, treeTitle]);

  return {
    treeTitle,
    applyTreeTitle,
    editTreeTitle,
  };
};
