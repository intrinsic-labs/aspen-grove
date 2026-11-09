import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import ContextMenu from 'react-native-context-menu-view';
import type { ULID } from '@domain/value-objects';
import { loomUiTokens } from '../../ui/value-objects/loom-ui-tokens';
import {
  buildContinuationMenuItems,
  type ContinuationMenuAction,
} from './continuation-menu';

type ContinuationCardShellProps = {
  /** The saved node. Without one the card is display-only (still streaming, or failed). */
  readonly nodeId?: ULID;
  /** The long-press menu's title (the node's local id). */
  readonly menuTitle?: string;
  readonly isBookmarked?: boolean;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
  readonly onSelect: (nodeId: ULID) => void;
  readonly onMenuAction: (nodeId: ULID, action: ContinuationMenuAction) => void;
  readonly children: ReactNode;
};

/**
 * The tan continuation card (Latent Spaces' ChildNodeView). A card with a
 * saved node takes the sibling gestures: tap for details, double tap to make
 * it current, long press for the menu. Its pressable carries
 * `chat-continuation-card-<nodeId>`.
 */
export const ContinuationCardShell = ({
  nodeId,
  menuTitle,
  isBookmarked = false,
  style,
  testID,
  onSelect,
  onMenuAction,
  children,
}: ContinuationCardShellProps) => {
  const cardStyle = [styles.card, style];

  if (!nodeId) {
    return (
      <View testID={testID} style={cardStyle}>
        {children}
      </View>
    );
  }

  const menuItems = buildContinuationMenuItems(isBookmarked);
  return (
    <View testID={testID}>
      <ContextMenu
        title={menuTitle}
        actions={menuItems.map((item) => ({
          title: item.title,
          systemIcon: item.systemIcon,
        }))}
        onPress={(event) => {
          const menuItem = menuItems[event.nativeEvent.index];
          if (menuItem) {
            onMenuAction(nodeId, menuItem.action);
          }
        }}
      >
        <Pressable
          testID={`chat-continuation-card-${nodeId}`}
          onPress={() => onSelect(nodeId)}
          style={cardStyle}
        >
          {children}
        </Pressable>
      </ContextMenu>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: loomUiTokens.continuationRail.cardWidth,
    height: loomUiTokens.continuationRail.cardHeight,
    borderRadius: loomUiTokens.continuationRail.cardRadius,
    padding: loomUiTokens.continuationRail.cardPadding,
    gap: loomUiTokens.continuationRail.cardGap,
    backgroundColor: loomUiTokens.colors.accentColor,
  },
});
