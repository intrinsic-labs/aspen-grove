import type { ReactNode } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { loomUiTokens } from '../../value-objects/loom-ui-tokens';
import { FormSurfaceProvider } from './form-context';

type FormSheetProps = {
  readonly visible: boolean;
  /** Swipe-down or the system back gesture. */
  readonly onRequestClose: () => void;
  readonly children: ReactNode;
  /** Forwarded to the sheet's root View. */
  readonly testID?: string;
};

/**
 * A SwiftUI `.sheet` holding a Form: a page sheet on the elevated sheet
 * background, its rows one step lighter.
 */
export const FormSheet = ({
  visible,
  onRequestClose,
  children,
  testID,
}: FormSheetProps) => (
  <Modal
    visible={visible}
    animationType="slide"
    presentationStyle="pageSheet"
    onRequestClose={onRequestClose}
  >
    <FormSurfaceProvider value="sheet">
      <View testID={testID} style={styles.sheet}>
        {children}
      </View>
    </FormSurfaceProvider>
  </Modal>
);

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: loomUiTokens.settingsForm.colors.sheetBackground,
  },
});
