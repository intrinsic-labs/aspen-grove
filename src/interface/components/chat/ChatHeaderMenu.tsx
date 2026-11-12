import ContextMenu, {
  type ContextMenuAction,
} from 'react-native-context-menu-view';
import { HeaderIconButton } from '@/interface/ui/value-objects';
import { loomUiTokens } from '@interface/ui/value-objects/loom-ui-tokens';

type ChatHeaderMenuAction =
  | 'bookmarks'
  | 'settings'
  | 'voiceMode'
  | 'editTitle'
  | 'tags'
  | 'exportTree'
  | 'exportPath'
  | 'onboarding';

type ChatHeaderMenuItem = {
  readonly action: ChatHeaderMenuAction;
  readonly title: string;
  readonly systemIcon: string;
};

const MENU_ITEMS: readonly ChatHeaderMenuItem[] = [
  {
    action: 'bookmarks',
    title: 'Bookmarks',
    systemIcon: 'bookmark',
  },
  {
    action: 'settings',
    title: 'Dialogue Settings',
    systemIcon: 'slider.horizontal.3',
  },
  {
    // Latent Spaces' tree toolbar toggle (ToolbarMenu.swift).
    action: 'voiceMode',
    title: 'Voice Mode',
    systemIcon: 'waveform',
  },
  {
    action: 'editTitle',
    title: 'Edit Title',
    systemIcon: 'pencil',
  },
  {
    action: 'tags',
    title: 'Tags',
    systemIcon: 'tag',
  },
  {
    action: 'exportTree',
    title: 'Export Tree (OpenLoom)',
    systemIcon: 'square.and.arrow.up',
  },
  {
    action: 'exportPath',
    title: 'Export Path (Markdown)',
    systemIcon: 'doc.plaintext',
  },
  {
    // Latent Spaces' last tree menu item (ToolbarMenu.swift:96-101).
    action: 'onboarding',
    title: 'Show Onboarding',
    systemIcon: 'questionmark.circle',
  },
];

type ChatHeaderMenuProps = {
  readonly onOpenBookmarks: () => void;
  readonly onOpenDialogueSettings: () => void;
  /** Checked in the menu while Voice Mode is on. */
  readonly voiceModeEnabled: boolean;
  readonly onToggleVoiceMode: () => void;
  readonly onEditTitle: () => void;
  readonly onOpenTags: () => void;
  readonly onExportTree: () => void;
  readonly onExportPath: () => void;
  readonly onShowOnboarding: () => void;
};

export const ChatHeaderMenu = ({
  onOpenBookmarks,
  onOpenDialogueSettings,
  voiceModeEnabled,
  onToggleVoiceMode,
  onEditTitle,
  onOpenTags,
  onExportTree,
  onExportPath,
  onShowOnboarding,
}: ChatHeaderMenuProps) => {
  const actions: ContextMenuAction[] = MENU_ITEMS.map((item) => ({
    title: item.title,
    systemIcon: item.systemIcon,
    selected: item.action === 'voiceMode' ? voiceModeEnabled : undefined,
  }));

  return (
    <ContextMenu
      dropdownMenuMode
      actions={actions}
      onPress={(event) => {
        const menuItem = MENU_ITEMS[event.nativeEvent.index];
        if (!menuItem) {
          return;
        }
        switch (menuItem.action) {
          case 'bookmarks':
            onOpenBookmarks();
            break;
          case 'settings':
            onOpenDialogueSettings();
            break;
          case 'voiceMode':
            onToggleVoiceMode();
            break;
          case 'editTitle':
            onEditTitle();
            break;
          case 'tags':
            onOpenTags();
            break;
          case 'exportTree':
            onExportTree();
            break;
          case 'exportPath':
            onExportPath();
            break;
          case 'onboarding':
            onShowOnboarding();
            break;
        }
      }}
    >
      {/* Latent Spaces' `slider.horizontal.3` (ToolbarMenu.swift). */}
      <HeaderIconButton
        icon="options-outline"
        iconSize={loomUiTokens.header.menuIconSize}
        accessibilityLabel="Dialogue menu"
        testID="chat-menu-button"
      />
    </ContextMenu>
  );
};
