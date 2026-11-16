import type { ReactNode } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loomUiTokens } from '../../value-objects/loom-ui-tokens';
import { useDiscardGuard } from './useDiscardGuard';

type PageSheetProps = {
  readonly visible: boolean;
  /** A swipe down or Android's back, once any unsaved edits may go. */
  readonly onClose: () => void;
  /**
   * The sheet holds edits a close would drop. It can't be pulled away then:
   * a swipe down asks Keep Editing or Discard Changes first.
   */
  readonly hasUnsavedChanges?: boolean;
  /**
   * Drops the unsaved edits when Discard Changes is chosen, before
   * `onClose`. Not needed by a sheet that reloads its draft as it opens.
   */
  readonly onDiscard?: () => void;
  readonly onShow?: () => void;
  /** iOS: the sheet has finished sliding away. */
  readonly onDismiss?: () => void;
  readonly children: ReactNode;
};

/**
 * A SwiftUI `.sheet` (a page sheet sliding up), which follows a swipe down
 * and dismisses as Latent Spaces' sheets do. React Native's Modal refuses
 * that drag unless `allowSwipeDismissal` is on; it stays off while edits
 * are unsaved, so the swipe only asks (`useDiscardGuard`).
 */
export const PageSheet = ({
  visible,
  onClose,
  hasUnsavedChanges = false,
  onDiscard,
  onShow,
  onDismiss,
  children,
}: PageSheetProps) => {
  const requestClose = useDiscardGuard(hasUnsavedChanges, onClose, onDiscard);
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      allowSwipeDismissal={!hasUnsavedChanges}
      onRequestClose={requestClose}
      onShow={onShow}
      onDismiss={onDismiss}
    >
      {Platform.OS === 'android' ? (
        // Android has no page sheet: the Modal fills the screen, edge to
        // edge, so keep the sheet's own bar out from under the status bar.
        <View style={[styles.androidSheet, { paddingTop: insets.top }]}>
          {children}
        </View>
      ) : (
        children
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  androidSheet: {
    flex: 1,
    backgroundColor: loomUiTokens.settingsForm.colors.sheetBackground,
  },
});
