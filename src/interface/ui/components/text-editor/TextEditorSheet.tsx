import { useRef } from 'react';
import { StyleSheet, type TextInput, View, type TextStyle } from 'react-native';
import ContextMenu from 'react-native-context-menu-view';
import * as Clipboard from 'expo-clipboard';
import { loomUiTokens } from '../../value-objects/loom-ui-tokens';
import { FormSheetHeader } from '../form/FormSheetHeader';
import { GlassIconButton } from '../GlassIconButton';
import { KeyboardDoneBar } from '../KeyboardDoneBar';
import { PageSheet } from '../sheet/PageSheet';
import { useKeyboardAccessoryId } from '../useKeyboardAccessoryId';
import { findNativeMenuItem, toNativeMenuActions } from '../native-menu';
import { TEXT_EDITOR_MENU } from './text-editor-menu';
import { AppTextInput } from '../AppTextInput';

const editor = loomUiTokens.textEditorSheet;

type TextEditorSheetProps = {
  readonly visible: boolean;
  readonly title: string;
  readonly text: string;
  readonly onChangeText: (text: string) => void;
  readonly onSave: () => void;
  /** Swipe-down: closes without saving (asking first if the text changed). */
  readonly onClose: () => void;
  /** The text differs from what was saved: a swipe down asks first. */
  readonly hasUnsavedChanges?: boolean;
  /** The loom font the messages use; Cardo when it names no family. */
  readonly textStyle: TextStyle;
  /** Prefix for the sheet's ids: `<testID>`, `-input`, `-save`, `-menu-button`. */
  readonly testID: string;
};

/**
 * Latent Spaces' `FullScreenTextEditor` in a sheet: the menu (Copy text,
 * Clear text) leading, the inline title, Save trailing, and the text in the
 * loom font filling the sheet, focused as it opens, with a keyboard "Done".
 */
export const TextEditorSheet = ({
  visible,
  title,
  text,
  onChangeText,
  onSave,
  onClose,
  hasUnsavedChanges,
  textStyle,
  testID,
}: TextEditorSheetProps) => {
  const inputRef = useRef<TextInput>(null);
  const accessoryId = useKeyboardAccessoryId(`${testID}-keyboard`, visible);

  return (
    <PageSheet
      visible={visible}
      onClose={onClose}
      hasUnsavedChanges={hasUnsavedChanges}
      onShow={() => inputRef.current?.focus()}
    >
      <View testID={testID} style={styles.sheet}>
        <FormSheetHeader
          title={title}
          leading={
            <ContextMenu
              dropdownMenuMode
              actions={toNativeMenuActions(TEXT_EDITOR_MENU)}
              onPress={(event) => {
                const item = findNativeMenuItem(
                  TEXT_EDITOR_MENU,
                  event.nativeEvent
                );
                if (item?.action === 'copy') {
                  void Clipboard.setStringAsync(text);
                } else if (item?.action === 'clear') {
                  onChangeText('');
                }
              }}
            >
              <GlassIconButton
                testID={`${testID}-menu-button`}
                icon="ellipsis-horizontal"
                iconSize={loomUiTokens.header.ellipsisSize}
                size={loomUiTokens.nodeSheet.circleSize}
                accessibilityLabel="Editor menu"
              />
            </ContextMenu>
          }
          trailing={{
            label: 'Save',
            onPress: onSave,
            testID: `${testID}-save`,
          }}
        />
        <AppTextInput
          ref={inputRef}
          testID={`${testID}-input`}
          value={text}
          onChangeText={onChangeText}
          multiline
          scrollEnabled
          inputAccessoryViewID={accessoryId}
          style={[styles.defaultFont, textStyle, styles.input]}
        />
        <KeyboardDoneBar nativeID={accessoryId} />
      </View>
    </PageSheet>
  );
};

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: loomUiTokens.nodeSheet.background,
  },
  // The loom font when the reader hasn't picked one, as messages fall back
  // to (`loadLoomFont()` defaults to Cardo); a TextInput has no such default.
  defaultFont: {
    fontFamily: 'Cardo-Regular',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    textAlignVertical: 'top',
    paddingHorizontal: editor.textInset,
    paddingTop: editor.textTopGap,
  },
});
