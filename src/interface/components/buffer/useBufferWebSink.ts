import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type {
  AppliedReceipt,
  WebEditorSink,
} from './android/buffer-web-editor-props';
import {
  adoptCheckpoint,
  relabelPreview,
} from './buffer-preview-authors';
import type { PreviewEdit, PreviewState } from './buffer-preview';

/**
 * What the screen applies from the web editor, as one stable object (the
 * WebView is memoized on it), and the receipt of the last applied revision.
 */
export const useBufferWebSink = (
  setPreview: Dispatch<SetStateAction<PreviewState>>,
  onReplace: (edit: PreviewEdit) => void
) => {
  const [receipt, setReceipt] = useState<AppliedReceipt | null>(null);
  const sink = useMemo<WebEditorSink>(
    () => ({
      onReplace,
      onModelRanges: (ranges) =>
        setPreview((state) => relabelPreview(state, ranges)),
      onAdopt: (text, ranges) =>
        setPreview((state) => adoptCheckpoint(state, text, ranges)),
      onApplied: setReceipt,
    }),
    [onReplace, setPreview]
  );
  const clearReceipt = useCallback(() => setReceipt(null), []);
  return { sink, receipt, clearReceipt };
};
