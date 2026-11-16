import type { ReactNode } from 'react';
import { Modal } from 'react-native';
import { loomUiTokens } from '../../value-objects/loom-ui-tokens';
import { BelowStatusBar } from './BelowStatusBar';
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
      {/* Android has no page sheet: the Modal fills the screen. */}
      <BelowStatusBar
        backgroundColor={loomUiTokens.settingsForm.colors.sheetBackground}
      >
        {children}
      </BelowStatusBar>
    </Modal>
  );
};
