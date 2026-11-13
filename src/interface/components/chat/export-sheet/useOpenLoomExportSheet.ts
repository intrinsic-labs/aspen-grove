import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { ILoomTreeRepository } from '@application/repositories';
import type { ExportOpenLoomOptions } from '@application/services/open-loom';
import type { ULID } from '@domain/value-objects';
import { toErrorMessage } from '../error-message';
import {
  initialExportDraft,
  toExportOptions,
  type ExportSheetDraft,
} from './export-sheet-options';

type UseOpenLoomExportSheetInput = {
  readonly treeId: ULID | null;
  readonly treeRepo: Pick<ILoomTreeRepository, 'findById'>;
  readonly exportTree: (options: ExportOpenLoomOptions) => Promise<void>;
  readonly setError: (error: string | null) => void;
};

/**
 * The Export Loom Tree sheet (OpenLoomExportSheet.swift): it opens on the
 * saved title and description, the back button drops the edits, and the
 * share button closes it and then exports with its choices. Nothing it
 * edits is saved to the tree.
 */
export const useOpenLoomExportSheet = ({
  treeId,
  treeRepo,
  exportTree,
  setError,
}: UseOpenLoomExportSheetInput) => {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState<ExportSheetDraft | null>(null);
  // The export waits for the sheet to go: iOS presents one sheet at a time.
  const pendingRef = useRef<ExportOpenLoomOptions | null>(null);

  const open = useCallback(async () => {
    if (!treeId) {
      return;
    }
    try {
      const tree = await treeRepo.findById(treeId);
      if (tree) {
        setDraft(initialExportDraft(tree));
        setVisible(true);
      }
    } catch (caught) {
      setError(toErrorMessage(caught));
    }
  }, [setError, treeId, treeRepo]);

  const runPending = useCallback(() => {
    const options = pendingRef.current;
    pendingRef.current = null;
    if (options) {
      void exportTree(options);
    }
  }, [exportTree]);

  const share = useCallback(() => {
    if (!draft) {
      return;
    }
    pendingRef.current = toExportOptions(draft);
    setVisible(false);
    // Android's Modal has no onDismiss.
    if (Platform.OS !== 'ios') {
      runPending();
    }
  }, [draft, runPending]);

  const update = useCallback(
    (changes: Partial<ExportSheetDraft>) =>
      setDraft((current) => (current ? { ...current, ...changes } : current)),
    []
  );

  return {
    visible,
    draft,
    update,
    open: () => void open(),
    close: () => setVisible(false),
    share,
    onDismissed: runPending,
  };
};
