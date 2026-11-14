import { useCallback, useEffect, useState, type MutableRefObject } from 'react';
import type { ImperativeRouter } from 'expo-router';
import type { ULID } from '@domain/value-objects';
import {
  getDialogueDraft,
  setDialogueDraft,
  subscribeDialogueDraft,
} from '../dialogue-draft-store';

type UseComposerDraftInput = {
  readonly sessionTreeId: ULID | undefined;
  readonly activeTreeIdRef: MutableRefObject<ULID | null>;
  readonly treeIdParam: string | undefined;
  readonly router: Pick<ImperativeRouter, 'push'>;
};

/**
 * The composer's text, kept in sync with the per-tree draft store so the
 * inline composer and the expanded composer route edit the same draft.
 */
export const useComposerDraft = ({
  sessionTreeId,
  activeTreeIdRef,
  treeIdParam,
  router,
}: UseComposerDraftInput) => {
  const [input, setInput] = useState('');
  const draftTreeId = sessionTreeId ?? activeTreeIdRef.current ?? treeIdParam;

  useEffect(() => {
    if (!draftTreeId) {
      return undefined;
    }
    return subscribeDialogueDraft(draftTreeId, () => {
      const nextDraft = getDialogueDraft(draftTreeId);
      setInput((current) => (current === nextDraft ? current : nextDraft));
    });
  }, [draftTreeId]);

  useEffect(() => {
    setDialogueDraft(draftTreeId, input);
  }, [draftTreeId, input]);

  const openExpandedComposer = useCallback(() => {
    const treeId = sessionTreeId ?? activeTreeIdRef.current ?? treeIdParam;
    if (!treeId) {
      return;
    }
    setDialogueDraft(treeId, input);
    router.push({
      pathname: '/tree/[treeId]/compose',
      params: { treeId },
    });
  }, [activeTreeIdRef, input, router, sessionTreeId, treeIdParam]);

  return { input, setInput, openExpandedComposer };
};
