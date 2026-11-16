import { useLocalSearchParams } from 'expo-router';
import { toDialogueRouteParams } from './route-params';

/** The dialogue route's params (`/tree/[treeId]`), read once per render. */
export const useDialogueRouteParams = () =>
  toDialogueRouteParams(
    useLocalSearchParams<{
      treeId?: string | string[];
      autofocus?: string | string[];
      ephemeral?: string | string[];
      nodeSheetId?: string | string[];
    }>()
  );
