import { useLayoutEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
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
  /**
   * Show Onboarding: the tree's Getting Started sheet, as Latent Spaces'
   * (ToolbarMenu.swift:97-101 sets LoomTreeView's `showingPopupSheet`).
   */
  readonly showOnboarding: () => void;
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
  showOnboarding,
}: UseTreeHeaderMenuInput) => {
  const navigation = useNavigation();

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
          showOnboarding();
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
    setVoiceModeEnabled,
    showOnboarding,
    voiceModeEnabled,
  ]);
};
