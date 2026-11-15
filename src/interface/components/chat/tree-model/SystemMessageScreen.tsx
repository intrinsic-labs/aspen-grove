import { useLayoutEffect, useMemo } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import type { ULID } from '@domain/value-objects';
import { useAppServices } from '@interface/composition';
import { KeyboardDoneBar } from '@/interface/ui/components/KeyboardDoneBar';
import { formText } from '@/interface/ui/components/form';
import { AppScreen } from '@/interface/ui/value-objects';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { toMessageTextStyle } from '../message-list/message-text-style';
import { useDialogueDisplayPreferences } from '../useDialogueDisplayPreferences';
import { SystemMessageMenu } from './SystemMessageMenu';
import { useTreeSystemMessage } from './useTreeSystemMessage';

const editor = loomUiTokens.textEditorSheet;
const ACCESSORY_ID = 'tree-system-message-keyboard';
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
        <TextInput
          testID="tree-system-message-input"
          value={text}
          onChangeText={onChangeText}
          autoFocus
          multiline
          scrollEnabled
          keyboardAppearance="dark"
          selectionColor={loomUiTokens.colors.accentColor}
          inputAccessoryViewID={ACCESSORY_ID}
          style={[styles.defaultFont, textStyle, styles.input]}
        />
      )}
      {message.error ? (
        <Text style={[formText.footer, styles.error]}>{message.error}</Text>
      ) : null}
      <KeyboardDoneBar nativeID={ACCESSORY_ID} />
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
