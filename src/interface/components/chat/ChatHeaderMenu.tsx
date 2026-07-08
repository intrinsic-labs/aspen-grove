import { Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import ContextMenu, {
  type ContextMenuAction,
} from 'react-native-context-menu-view';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';

type ChatHeaderMenuAction = 'bookmarks' | 'settings' | 'editTitle';

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
];

type ChatHeaderMenuProps = {
  readonly onOpenBookmarks: () => void;
  readonly onOpenDialogueSettings: () => void;
  readonly onEditTitle: () => void;
};

export const ChatHeaderMenu = ({
  onOpenBookmarks,
  onOpenDialogueSettings,
  onEditTitle,
}: ChatHeaderMenuProps) => {
  const { colors } = useAspenGroveTheme();
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
        }
      }}
    >
      <Pressable
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Dialogue menu"
        style={({ pressed }) => [
          styles.menuButton,
          { opacity: pressed ? 0.65 : 1 },
        ]}
      >
        <Ionicons
          name="ellipsis-horizontal"
          size={22}
          color={colors.primary}
        />
      </Pressable>
    </ContextMenu>
  );
};

const styles = StyleSheet.create({
  menuButton: {
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
