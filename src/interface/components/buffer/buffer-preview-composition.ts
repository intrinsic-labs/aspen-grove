import type { PreviewDocument } from './buffer-preview-document';
import { flushReconcile } from './buffer-preview-reconcile';
import type { CompositionBarrier } from './composition-barrier';

/** A pure step on the latest preview document, queued by the host. */
export type ApplyToDocument = (
  update: (doc: PreviewDocument) => PreviewDocument
) => void;

/**
 * The editor reports whether a composition is active. When one ends, the
 * recoloring it held back runs first, on the passage it belongs to, and only
 * then does the barrier release a queued document action (a sibling switch):
 * the switch moves the working passage, and a deferred recolor flushed after
 * it would find the departing passage gone and be lost.
 */
export const observeComposition = (
  barrier: CompositionBarrier,
  apply: ApplyToDocument,
  composing: boolean
): void => {
  if (!composing) {
    apply(flushReconcile);
  }
  barrier.observe(composing);
};
