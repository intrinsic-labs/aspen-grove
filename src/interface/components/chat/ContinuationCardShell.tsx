import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import ContextMenu from 'react-native-context-menu-view';
import type { ULID } from '@domain/value-objects';
import {
  findNativeMenuItem,
  toNativeMenuActions,
} from '@/interface/ui/components/native-menu';
import { loomUiTokens } from '../../ui/value-objects/loom-ui-tokens';
import { continuationCardStyles } from './continuation-card-styles';
import {
  buildContinuationMenuSections,
  type ContinuationMenuAction,
} from './continuation-menu';

type ContinuationCardShellProps = {
  /** The saved node. Without one the card is display-only (still streaming, or failed). */
  readonly nodeId?: ULID;
  readonly isBookmarked?: boolean;
  /** The line above the card. */
  readonly caption: ReactNode;
  readonly cardStyle?: StyleProp<ViewStyle>;
  readonly testID?: string;
  /**
   * A tap on a card with no saved node (a failed one, to show its details).
   * Its pressable carries `pressTestID`.
   */
  readonly onPressWithoutNode?: () => void;
  readonly pressTestID?: string;
  readonly onSelect: (nodeId: ULID) => void;
  readonly onMenuAction: (nodeId: ULID, action: ContinuationMenuAction) => void;
  readonly children: ReactNode;
};

const ignoreLongPress = () => {};

/**
 * A continuation as Latent Spaces draws it (ChildNodeView): a caption over
 * a tan card. A card with a saved node takes the gestures: tap to expand it
 * into its sheet, double tap to make it current, long press for its menu.
 * Its pressable carries `chat-continuation-card-<nodeId>`.
 */
export const ContinuationCardShell = ({
  nodeId,
  isBookmarked = false,
  caption,
  cardStyle,
  testID,
  onPressWithoutNode,
  pressTestID,
  onSelect,
  onMenuAction,
  children,
}: ContinuationCardShellProps) => {
  const style = [continuationCardStyles.card, cardStyle];
  const sections = buildContinuationMenuSections(isBookmarked);

  return (
    <View testID={testID} style={continuationCardStyles.column}>
      {caption}
      {nodeId ? (
        <ContextMenu
          actions={toNativeMenuActions(sections)}
          borderRadius={loomUiTokens.continuationRail.cardRadius}
          previewBackgroundColor={loomUiTokens.continuationRail.cardFill}
          onPress={(event) => {
            const menuItem = findNativeMenuItem(sections, event.nativeEvent);
            if (menuItem) {
              onMenuAction(nodeId, menuItem.action);
            }
          }}
        >
          <Pressable
            testID={`chat-continuation-card-${nodeId}`}
            onPress={() => onSelect(nodeId)}
            // The long press is the menu's. Without a handler, Android's
            // Pressable also fires onPress on release and opens the sheet.
            onLongPress={ignoreLongPress}
            style={style}
          >
            {children}
          </Pressable>
        </ContextMenu>
      ) : onPressWithoutNode ? (
        <Pressable
          testID={pressTestID}
          accessibilityRole="button"
          onPress={onPressWithoutNode}
          style={style}
        >
          {children}
        </Pressable>
      ) : (
        <View style={style}>{children}</View>
      )}
    </View>
  );
};
