import ContextMenu from 'react-native-context-menu-view';
import * as Clipboard from 'expo-clipboard';
import { HeaderIconButton } from '@/interface/ui/value-objects';
import {
  findNativeMenuItem,
  toNativeMenuActions,
} from '@/interface/ui/components/native-menu';
import { TEXT_EDITOR_MENU } from '@/interface/ui/components/text-editor/text-editor-menu';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

type SystemMessageMenuProps = {
  readonly text: string;
  readonly onClear: () => void;
};

/** The editor's trailing `ellipsis.circle` menu (FullScreenTextEditor.swift:31-44). */
export const SystemMessageMenu = ({
  text,
  onClear,
}: SystemMessageMenuProps) => (
  <ContextMenu
    dropdownMenuMode
    actions={toNativeMenuActions(TEXT_EDITOR_MENU)}
    onPress={(event) => {
      const item = findNativeMenuItem(
        TEXT_EDITOR_MENU,
        event.nativeEvent.indexPath
      );
      if (item?.action === 'copy') {
        void Clipboard.setStringAsync(text);
      } else if (item?.action === 'clear') {
        onClear();
      }
    }}
  >
    <HeaderIconButton
      testID="tree-system-message-menu-button"
      icon="ellipsis-horizontal-circle-outline"
      iconSize={loomUiTokens.header.menuIconSize}
      accessibilityLabel="Editor menu"
    />
  </ContextMenu>
);
