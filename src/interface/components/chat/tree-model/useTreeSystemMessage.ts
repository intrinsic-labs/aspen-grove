import { useCallback, useEffect, useRef, useState } from 'react';
import type { ULID } from '@domain/value-objects';
import { useAppServices } from '@interface/composition';
import { toErrorMessage } from '../error-message';
import { markTreeModelChanged } from './tree-model-change-store';

const SAVE_DELAY_MS = 450;

/**
 * The tree's system message: `LoomTree.systemContext`, the text the export
 * sheet's "Include System Message" writes out and that goes to the model
 * after the agent's own system prompt. Latent Spaces binds the editor to the
 * tree, so it saves as you type; here a pause in typing saves it, and so
 * does leaving the page.
 */
export const useTreeSystemMessage = (treeId: ULID | undefined) => {
  const { repositories } = useAppServices();
  const treeRepo = repositories.treeRepo;
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saved = useRef<string | null>(null);
  const latest = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!treeId) {
      return;
    }
    void treeRepo.findById(treeId).then(
      (tree) => {
        const initial = tree?.systemContext ?? '';
        saved.current = initial;
        latest.current = initial;
        setText(initial);
      },
      (caught: unknown) => setError(toErrorMessage(caught))
    );
  }, [treeId, treeRepo]);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const next = latest.current;
    if (!treeId || next === null || next === saved.current) {
      return;
    }
    saved.current = next;
    markTreeModelChanged(treeId);
    treeRepo
      .update({ id: treeId, changes: { systemContext: next } })
      .catch((caught: unknown) => setError(toErrorMessage(caught)));
  }, [treeId, treeRepo]);

  // Leaving the page saves what is left.
  useEffect(() => flush, [flush]);

  const onChangeText = useCallback(
    (next: string) => {
      latest.current = next;
      setText(next);
      if (timer.current) {
        clearTimeout(timer.current);
      }
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush]
  );

  return { text, onChangeText, error };
};
