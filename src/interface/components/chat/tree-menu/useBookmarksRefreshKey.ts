import { useMemo, useReducer } from 'react';

/**
 * When the tree menu's Bookmarks list reloads. The rows reload after most
 * bookmark changes; a card's bookmark change doesn't reload them, so it bumps
 * a revision (`bookmarksChanged`) and the list reloads all the same.
 */
export const useBookmarksRefreshKey = (rows: unknown) => {
  const [bookmarksRevision, bookmarksChanged] = useReducer(
    (revision: number) => revision + 1,
    0
  );
  const refreshKey = useMemo(
    () => [rows, bookmarksRevision],
    [rows, bookmarksRevision]
  );
  return { refreshKey, bookmarksChanged };
};
