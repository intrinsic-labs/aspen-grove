import type {
  ILoomTreeRepository,
  INodeRepository,
} from '@application/repositories';
import type { ExportOpenLoomOptions } from '@application/services/open-loom';
import type { ULID } from '@domain/value-objects';
import { useTreeBookmarks } from '../bookmarks/useTreeBookmarks';
import { useOpenLoomExportSheet } from '../export-sheet/useOpenLoomExportSheet';
import { useTreeDescription } from '../tree-description/useTreeDescription';

type UseTreeMenuSheetsInput = {
  readonly treeId: ULID | null;
  readonly treeRepo: Pick<ILoomTreeRepository, 'findById' | 'update'>;
  readonly nodeRepo: Pick<INodeRepository, 'findBookmarked'>;
  readonly exportTree: (options: ExportOpenLoomOptions) => Promise<void>;
  readonly setError: (error: string | null) => void;
  /** Changes whenever the rows reload, so the bookmarks list does too. */
  readonly refreshKey: unknown;
};

/**
 * What the tree menu lists and opens beyond the shared sheets: its
 * bookmarks, the description editor and the export sheet.
 */
export const useTreeMenuSheets = ({
  treeId,
  treeRepo,
  nodeRepo,
  exportTree,
  setError,
  refreshKey,
}: UseTreeMenuSheetsInput) => ({
  bookmarks: useTreeBookmarks({ treeId, nodeRepo, refreshKey }),
  description: useTreeDescription({ treeId, treeRepo, setError }),
  exportSheet: useOpenLoomExportSheet({
    treeId,
    treeRepo,
    exportTree,
    setError,
  }),
});
