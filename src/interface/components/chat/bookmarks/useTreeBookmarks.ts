import { useEffect, useState } from 'react';
import type { INodeRepository } from '@application/repositories';
import type { ULID } from '@domain/value-objects';
import { contentToDisplayText } from '../node-text';
import type { TreeMenuBookmark } from '../tree-menu/tree-menu';

/** Long texts are cut before they reach the native menu, which clips them anyway. */
const MAX_TITLE_LENGTH = 200;

type UseTreeBookmarksInput = {
  readonly treeId: ULID | null;
  readonly nodeRepo: Pick<INodeRepository, 'findBookmarked'>;
  /** Changes whenever a bookmark may have changed (the rows reload). */
  readonly refreshKey: unknown;
};

/**
 * The tree's bookmarks for the menu, oldest first (Latent Spaces lists them
 * in the order they were added; Aspen Grove keeps no bookmark time, so node
 * creation order stands in).
 */
export const useTreeBookmarks = ({
  treeId,
  nodeRepo,
  refreshKey,
}: UseTreeBookmarksInput): readonly TreeMenuBookmark[] => {
  const [bookmarks, setBookmarks] = useState<readonly TreeMenuBookmark[]>([]);

  useEffect(() => {
    if (!treeId) {
      setBookmarks([]);
      return;
    }
    let cancelled = false;
    void nodeRepo
      .findBookmarked(treeId)
      .then((nodes) => {
        if (cancelled) {
          return;
        }
        setBookmarks(
          [...nodes]
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            .map((node) => ({
              nodeId: node.id,
              title: (
                node.metadata.bookmarkLabel ??
                contentToDisplayText(node.content)
              ).slice(0, MAX_TITLE_LENGTH),
              authorType: node.authorType,
            }))
        );
      })
      .catch(() => {
        // The menu keeps its last list; the tree screen shows its own errors.
      });
    return () => {
      cancelled = true;
    };
  }, [nodeRepo, refreshKey, treeId]);

  return bookmarks;
};
