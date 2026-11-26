import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import type { BufferDocument } from '@application/services/buffer/document-ranges';
import type { BufferDocumentSession } from './buffer-document-session';
import { createDraftSaver } from './buffer-draft-saver';

type Options = {
  readonly session: BufferDocumentSession;
  /** The newest document on screen. */
  readonly getDocument: () => BufferDocument;
  /** False while loading, while a command runs, or while a fixture shows. */
  readonly active: () => boolean;
  /** Changes whenever the typed text does. */
  readonly document: BufferDocument;
  readonly enabled: boolean;
};

/**
 * The draft's life outside a commit: typing is stored after a pause, and
 * everything pending is stored when the app goes to the background or the
 * screen leaves. None of it writes a version; keyboard dismissal does
 * nothing. What to do with a draft found on open is `settleStoredDraft`.
 */
export const useBufferDraftLifecycle = ({
  session,
  getDocument,
  active,
  document,
  enabled,
}: Options) => {
  const saver = useMemo(
    () =>
      createDraftSaver({
        save: () =>
          active() ? session.save(getDocument()) : Promise.resolve(),
      }),
    [session, getDocument, active]
  );

  useEffect(() => {
    if (enabled) saver.schedule();
  }, [saver, document, enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void saver.flush();
    });
    return () => {
      subscription.remove();
      void saver.flush();
    };
  }, [saver, enabled]);

  return saver;
};
