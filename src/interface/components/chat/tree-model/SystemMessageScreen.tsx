import { useLayoutEffect, useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import type { ULID } from '@domain/value-objects';
import { useAppServices } from '@interface/composition';
import { KeyboardDoneBar } from '@/interface/ui/components/KeyboardDoneBar';
import { useKeyboardAccessoryId } from '@/interface/ui/components/useKeyboardAccessoryId';
import { formText } from '@/interface/ui/components/form';
import { AppScreen } from '@/interface/ui/value-objects';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { toMessageTextStyle } from '../message-list/message-text-style';
import { useDialogueDisplayPreferences } from '../useDialogueDisplayPreferences';
import { SystemMessageMenu } from './SystemMessageMenu';
import { useTreeSystemMessage } from './useTreeSystemMessage';
import { AppTextInput } from '@/interface/ui/components/AppTextInput';

const editor = loomUiTokens.textEditorSheet;
// Pushed under the navigation bar, the first line's glyphs start 128 pt from
// the screen top (measured, shot 44): 9 pt closer than in the sheet.
const PUSHED_TEXT_TOP_GAP = editor.textTopGap - 9;

/**
 * Latent Spaces' `FullScreenTextEditor` titled "System Message", pushed from
 * Model Settings (TreeModelSettingsView.swift:193-200): the text in the loom
 * font, focused as it opens, a `···` menu (Copy text, Clear
 * text) trailing, and a keyboard "Done".
 */
const SystemMessageScreen = () => {
  const { treeId } = useLocalSearchParams<{ treeId: string }>();
  const navigation = useNavigation();
  const accessoryId = useKeyboardAccessoryId('tree-system-message-keyboard');
  const { repositories } = useAppServices();
  const message = useTreeSystemMessage(treeId as ULID | undefined);
  const { preferences } = useDialogueDisplayPreferences({
    userPreferencesRepo: repositories.userPreferencesRepo,
  });
  const textStyle = useMemo(
    () => toMessageTextStyle(preferences),
    [preferences]
  );
  const text = message.text ?? '';
  const { onChangeText } = message;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <SystemMessageMenu text={text} onClear={() => onChangeText('')} />
      ),
    });
  }, [navigation, onChangeText, text]);

  return (
    <AppScreen testID="tree-system-message-screen" style={styles.screen}>
      {message.text === null ? null : (
        <>
          <AppTextInput
            testID="tree-system-message-input"
            value={text}
            onChangeText={onChangeText}
            autoFocus
            multiline
            scrollEnabled
            inputAccessoryViewID={accessoryId}
            style={[styles.defaultFont, textStyle, styles.input]}
          />
          <KeyboardDoneBar nativeID={accessoryId} />
        </>
      )}
      {message.error ? (
        <Text style={[formText.footer, styles.error]}>{message.error}</Text>
      ) : null}
    </AppScreen>
  );
};

export default SystemMessageScreen;

const styles = StyleSheet.create({
  screen: {
    backgroundColor: loomUiTokens.settingsForm.colors.background,
  },
  // `loadLoomFont()` falls back to Cardo; a TextInput has no such default.
  defaultFont: {
    fontFamily: 'Cardo-Regular',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    textAlignVertical: 'top',
    paddingHorizontal: editor.textInset,
    paddingTop: PUSHED_TEXT_TOP_GAP,
  },
  error: {
    color: '#FF453A',
    paddingHorizontal: editor.textInset,
    paddingBottom: 12,
  },
});
