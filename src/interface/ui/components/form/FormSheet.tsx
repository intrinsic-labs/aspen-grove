import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { loomUiTokens } from '../../value-objects/loom-ui-tokens';
import { PageSheet } from '../sheet/PageSheet';
import { FormSurfaceProvider } from './form-context';

type FormSheetProps = {
  readonly visible: boolean;
  /** Swipe-down or the system back gesture. */
  readonly onRequestClose: () => void;
  /** Edits a swipe down would drop: it asks first (`PageSheet`). */
  readonly hasUnsavedChanges?: boolean;
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
  hasUnsavedChanges,
  children,
  testID,
}: FormSheetProps) => (
  <PageSheet
    visible={visible}
    onClose={onRequestClose}
    hasUnsavedChanges={hasUnsavedChanges}
  >
    <FormSurfaceProvider value="sheet">
      <View testID={testID} style={styles.sheet}>
        {children}
      </View>
    </FormSurfaceProvider>
  </PageSheet>
);

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: loomUiTokens.settingsForm.colors.sheetBackground,
  },
});
