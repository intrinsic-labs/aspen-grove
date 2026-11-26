import { emptyPreview } from './buffer-preview-document';
import type { CompositionBarrier } from './composition-barrier';
import { useBufferEditorFeed } from './useBufferEditorFeed';

/**
 * The in-memory preview document (the Phase 1 fixtures): the shared editor
 * feed, started empty, with nothing saved.
 */
export const useBufferPreview = (barrier: CompositionBarrier) =>
  useBufferEditorFeed(barrier, emptyPreview);
