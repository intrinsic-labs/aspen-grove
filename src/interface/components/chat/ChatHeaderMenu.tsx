import ContextMenu, {
  type ContextMenuAction,
} from 'react-native-context-menu-view';
import { HeaderIconButton } from '@/interface/ui/value-objects';

type ChatHeaderMenuAction =
  | 'bookmarks'
  | 'settings'
  | 'editTitle'
  | 'tags'
  | 'exportTree'
  | 'exportPath';

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
];

type ChatHeaderMenuProps = {
  readonly onOpenBookmarks: () => void;
  readonly onOpenDialogueSettings: () => void;
  readonly onEditTitle: () => void;
  readonly onOpenTags: () => void;
  readonly onExportTree: () => void;
  readonly onExportPath: () => void;
};

export const ChatHeaderMenu = ({
  onOpenBookmarks,
  onOpenDialogueSettings,
  onEditTitle,
  onOpenTags,
  onExportTree,
  onExportPath,
}: ChatHeaderMenuProps) => {
  const actions: ContextMenuAction[] = MENU_ITEMS.map((item) => ({
    title: item.title,
    systemIcon: item.systemIcon,
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
        }
      }}
    >
      <HeaderIconButton
        icon="ellipsis-horizontal"
        accessibilityLabel="Dialogue menu"
      />
    </ContextMenu>
  );
};
