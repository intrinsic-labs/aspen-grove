import { Linking, Modal, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import {
  FormButtonRow,
  FormSection,
  FormSheetHeader,
  FormSurfaceProvider,
  FormTextFieldRow,
  FormToggleRow,
} from '@/interface/ui/components/form';
import { GlassIconButton } from '@/interface/ui/components/GlassIconButton';
import { KeyboardDoneBar } from '@/interface/ui/components/KeyboardDoneBar';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { HOME_LINKS } from '../../home/home-links';
import type { ExportSheetDraft } from './export-sheet-options';
import { ExportSheetHero } from './ExportSheetHero';

const sheet = loomUiTokens.exportSheet;
const nodeSheet = loomUiTokens.nodeSheet;
const KEYBOARD_ID = 'export-sheet-keyboard';

type OpenLoomExportSheetProps = {
  readonly visible: boolean;
  readonly draft: ExportSheetDraft | null;
  readonly onChange: (changes: Partial<ExportSheetDraft>) => void;
  readonly onBack: () => void;
  readonly onShare: () => void;
  /** The sheet has finished sliding away. */
  readonly onDismissed: () => void;
};

/**
 * Latent Spaces' Export Loom Tree sheet (OpenLoomExportSheet.swift): back
 * and share in the toolbar, the hero, the file's Title and Description,
 * then the include toggles and a link to the Open Loom docs.
 */
export const OpenLoomExportSheet = ({
  visible,
  draft,
  onChange,
  onBack,
  onShare,
  onDismissed,
}: OpenLoomExportSheetProps) => (
  <Modal
    visible={visible}
    animationType="slide"
    presentationStyle="pageSheet"
    onRequestClose={onBack}
    onDismiss={onDismissed}
  >
    <FormSurfaceProvider value="sheet">
      <View testID="export-sheet" style={styles.sheet}>
        <FormSheetHeader
          title="Export Loom Tree"
          leading={
            <GlassIconButton
              testID="export-sheet-back"
              icon="chevron-back"
              iconSize={nodeSheet.chevronSize}
              size={nodeSheet.circleSize}
              accessibilityLabel="Back"
              onPress={onBack}
            />
          }
          trailing={
            <GlassIconButton
              testID="export-sheet-share"
              icon="share-outline"
              iconSize={sheet.shareIconSize}
              size={nodeSheet.circleSize}
              accessibilityLabel="Export"
              onPress={onShare}
            />
          }
        />
        {draft ? (
          <KeyboardAwareScrollView
            enabled
            bottomOffset={sheet.keyboardBottomOffset}
            extraKeyboardSpace={0}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >
            <ExportSheetHero />
            <FormSection header="Title" style={styles.firstSection}>
              <FormTextFieldRow
                testID="export-sheet-title-input"
                value={draft.title}
                onChangeText={(title) => onChange({ title })}
                placeholder="Title"
                multiline
                inputAccessoryViewID={KEYBOARD_ID}
              />
            </FormSection>
            <FormSection header="Description">
              <FormTextFieldRow
                testID="export-sheet-description-input"
                value={draft.description}
                onChangeText={(description) => onChange({ description })}
                placeholder="Description"
                multiline
                inputAccessoryViewID={KEYBOARD_ID}
              />
            </FormSection>
            <FormSection header="Additional Options">
              <FormToggleRow
                testID="export-sheet-include-system-message"
                title="Include System Message"
                value={draft.includeSystemMessage}
                onValueChange={(includeSystemMessage) =>
                  onChange({ includeSystemMessage })
                }
              />
              <FormToggleRow
                testID="export-sheet-include-bookmarks"
                title="Include Bookmarks"
                value={draft.includeBookmarks}
                onValueChange={(includeBookmarks) =>
                  onChange({ includeBookmarks })
                }
              />
              <FormButtonRow
                testID="export-sheet-docs"
                title="OpenLoom Documentation"
                icon="book-outline"
                onPress={() => void Linking.openURL(HOME_LINKS.openLoomDocs)}
              />
            </FormSection>
          </KeyboardAwareScrollView>
        ) : null}
        <KeyboardDoneBar nativeID={KEYBOARD_ID} />
      </View>
    </FormSurfaceProvider>
  </Modal>
);

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: loomUiTokens.settingsForm.colors.sheetBackground,
  },
  content: {
    paddingTop: sheet.contentTopGap,
    paddingHorizontal: loomUiTokens.settingsForm.sectionInset,
    paddingBottom: sheet.bottomSpacer,
  },
  firstSection: {
    marginTop: sheet.firstHeaderTopGap,
  },
});
