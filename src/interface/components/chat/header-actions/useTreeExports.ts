import { useCallback, type MutableRefObject } from 'react';
import type {
  ExportLoomTreeUseCase,
  ExportPathMarkdownUseCase,
} from '@application/use-cases';
import type { ULID } from '@domain/value-objects';
import { shareTextAsFile } from '@interface/services/loom-file-sharing';
import { toErrorMessage } from '../error-message';
import type { ChatSession } from '../types';

type UseTreeExportsInput = {
  readonly session: ChatSession | null;
  readonly activeTreeIdRef: MutableRefObject<ULID | null>;
  readonly exportLoomTreeUseCase: Pick<ExportLoomTreeUseCase, 'execute'>;
  readonly exportPathMarkdownUseCase: Pick<
    ExportPathMarkdownUseCase,
    'execute'
  >;
  readonly setError: (error: string | null) => void;
};

/** Header-menu exports: the whole tree as Open Loom JSON, the path as Markdown. */
export const useTreeExports = ({
  session,
  activeTreeIdRef,
  exportLoomTreeUseCase,
  exportPathMarkdownUseCase,
  setError,
}: UseTreeExportsInput) => {
  const exportTree = useCallback(async () => {
    const treeId = session?.treeId ?? activeTreeIdRef.current;
    if (!treeId) {
      return;
    }
    try {
      const result = await exportLoomTreeUseCase.execute({
        treeId,
        currentNodeId: session?.activeNodeId,
      });
      await shareTextAsFile({
        content: result.json,
        fileName: result.suggestedFileName,
        mimeType: 'application/json',
      });
    } catch (caught) {
      setError(toErrorMessage(caught));
    }
  }, [activeTreeIdRef, exportLoomTreeUseCase, session, setError]);

  const exportPathMarkdown = useCallback(async () => {
    if (!session) {
      return;
    }
    try {
      const result = await exportPathMarkdownUseCase.execute({
        treeId: session.treeId,
        pathId: session.pathId,
      });
      await shareTextAsFile({
        content: result.markdown,
        fileName: result.suggestedFileName,
        mimeType: 'text/markdown',
      });
    } catch (caught) {
      setError(toErrorMessage(caught));
    }
  }, [exportPathMarkdownUseCase, session, setError]);

  return { exportTree, exportPathMarkdown };
};
