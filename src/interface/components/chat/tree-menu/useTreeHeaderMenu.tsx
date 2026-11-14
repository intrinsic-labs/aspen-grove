import { useLayoutEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import type { ULID } from '@domain/value-objects';
import type { TreeMenuBookmark, TreeMenuCommand } from './tree-menu';
import { TreeToolbarMenu } from './TreeToolbarMenu';

type UseTreeHeaderMenuInput = {
  readonly bookmarks: readonly TreeMenuBookmark[];
  readonly voiceModeEnabled: boolean;
  readonly setVoiceModeEnabled: (enabled: boolean) => void;
  /** Model: the tree's agent, today in Dialogue Settings. */
  readonly openModel: () => void;
  readonly editTitle: () => void;
  readonly editDescription: () => void;
  readonly openBookmark: (nodeId: ULID) => void;
  readonly openExport: () => void;
  readonly openTags: () => void;
  readonly exportPath: () => Promise<void>;
};

/** Puts the tree menu in the header's trailing slot and runs its commands. */
export const useTreeHeaderMenu = ({
  bookmarks,
  voiceModeEnabled,
  setVoiceModeEnabled,
  openModel,
  editTitle,
  editDescription,
  openBookmark,
  openExport,
  openTags,
  exportPath,
}: UseTreeHeaderMenuInput) => {
  const navigation = useNavigation();
  const router = useRouter();

  useLayoutEffect(() => {
    const onCommand = (command: TreeMenuCommand) => {
      switch (command.type) {
        case 'model':
          openModel();
          break;
        case 'voiceMode':
          setVoiceModeEnabled(!voiceModeEnabled);
          break;
        case 'editTitle':
          editTitle();
          break;
        case 'editDescription':
          editDescription();
          break;
        case 'openBookmark':
          openBookmark(command.nodeId);
          break;
        case 'export':
          openExport();
          break;
        case 'onboarding':
          router.push('/onboarding');
          break;
        case 'tags':
          openTags();
          break;
        case 'exportPath':
          void exportPath();
          break;
      }
    };

    navigation.setOptions({
      headerRightContainerStyle: { paddingRight: 14 },
      headerRight: () => (
        <TreeToolbarMenu
          voiceModeEnabled={voiceModeEnabled}
          bookmarks={bookmarks}
          onCommand={onCommand}
        />
      ),
    });
  }, [
    bookmarks,
    editDescription,
    editTitle,
    exportPath,
    navigation,
    openBookmark,
    openExport,
    openModel,
    openTags,
    router,
    setVoiceModeEnabled,
    voiceModeEnabled,
  ]);
};
