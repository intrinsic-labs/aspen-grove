import type { ImperativeRouter } from 'expo-router';
import type { ULID } from '@domain/value-objects';
import { useChatSheets } from '../header-actions/useChatSheets';
import { treeModelRoutes } from '../tree-model/tree-model-routes';
import { useTreeMenuSheets } from './useTreeMenuSheets';

type UseChatMenusInput = Omit<
  Parameters<typeof useTreeMenuSheets>[0],
  'treeId'
> & {
  readonly treeId: ULID | null;
  readonly router: Pick<ImperativeRouter, 'push'>;
};

/**
 * What the tree's header menu opens: the Tags sheet, the bookmarks list,
 * the description editor, the export sheet, and Model Settings, which is
 * pushed as Latent Spaces pushes it (the session is re-read when the tree
 * comes back into focus, in useChatSessionLoader).
 */
export const useChatMenus = ({
  treeId,
  router,
  ...menu
}: UseChatMenusInput) => {
  const sheets = useChatSheets({ treeId });
  const openModelSettings = () => {
    if (treeId) {
      router.push(treeModelRoutes.settings(treeId));
    }
  };
  const menuSheets = useTreeMenuSheets({ treeId, ...menu });
  return { tags: sheets.tags, openModelSettings, ...menuSheets };
};
