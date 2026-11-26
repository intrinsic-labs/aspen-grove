import { useCallback, useMemo, useState } from 'react';
import type { Replacement } from '@application/services/buffer/apply-replacement';
import type {
  AppliedReceipt,
  WebEditorSink,
} from './android/buffer-web-editor-props';
import {
  applyEdits,
  emptyPreview,
  noteSelection,
} from './buffer-preview-document';
import { flushReconcile } from './buffer-preview-reconcile';
import { adopt, relabel } from './buffer-preview-restore';
import type { BufferSelection } from './derive-replacement';
import type { CompositionBarrier } from './composition-barrier';

/**
 * The preview document and everything the two editors do to it. The native
 * input reports one replacement at a time and its selection; the Android
 * page reports transactions through the sink (a stable object, since the
 * WebView is memoized on it) and the receipt of the last applied revision.
 * Every change is a pure step on the latest document, so none can be lost
 * to a render that has not happened yet.
 */
export const useBufferPreview = (barrier: CompositionBarrier) => {
  const [doc, setDoc] = useState(emptyPreview);
  const [receipt, setReceipt] = useState<AppliedReceipt | null>(null);

  const onReplace = useCallback(
    (edit: Replacement) =>
      setDoc((current) =>
        applyEdits(current, [edit], { composing: barrier.isComposing() })
      ),
    [barrier]
  );
  const onSelection = useCallback(
    (selection: BufferSelection) =>
      setDoc((current) => noteSelection(current, selection)),
    []
  );
  // Recoloring held back by a composition runs when it ends.
  const onComposition = useCallback(
    (composing: boolean) => {
      barrier.observe(composing);
      if (!composing) {
        setDoc(flushReconcile);
      }
    },
    [barrier]
  );
  const sink = useMemo<WebEditorSink>(
    () => ({
      onChanges: (replacements, caret, modelRanges) =>
        setDoc((current) => {
          const next = applyEdits(current, replacements, {
            caret,
            exactColors: true,
          });
          return modelRanges ? relabel(next, modelRanges) : next;
        }),
      onAdopt: (text, ranges, layout, caret) =>
        setDoc((current) => adopt(current, text, ranges, layout, caret)),
      onApplied: (applied) => {
        setReceipt(applied);
        barrier.observe(applied.composing);
      },
      onComposition: barrier.observe,
    }),
    [barrier]
  );
  const clearReceipt = useCallback(() => setReceipt(null), []);
  return {
    doc,
    setDoc,
    onReplace,
    onSelection,
    onComposition,
    sink,
    receipt,
    clearReceipt,
  };
};
