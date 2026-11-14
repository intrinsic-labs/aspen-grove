import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { loomUiTokens } from '../../value-objects/loom-ui-tokens';
import type { PendingTextPrompt } from './text-prompt';

const form = loomUiTokens.settingsForm;

type TextPromptDialogProps = {
  /** The prompt to show; null hides the dialog. */
  readonly pending: PendingTextPrompt | null;
};

/**
 * Android's stand-in for the iOS alert with a text field: a Material-style
 * dialog with the title, the message, the field, then Cancel and Save.
 */
export const TextPromptDialog = ({ pending }: TextPromptDialogProps) => {
  const [value, setValue] = useState('');
  const inputRef = useRef<TextInput>(null);
  const request = pending?.request;

  useEffect(() => {
    setValue(request?.initialValue ?? '');
  }, [request]);

  return (
    <Modal
      visible={pending !== null}
      transparent
      animationType="fade"
      onRequestClose={() => pending?.resolve(null)}
      onShow={() => inputRef.current?.focus()}
    >
      <View style={styles.backdrop}>
        <View testID="text-prompt" style={styles.dialog}>
          <Text style={styles.title}>{request?.title}</Text>
          {request?.message ? (
            <Text style={styles.message}>{request.message}</Text>
          ) : null}
          <TextInput
            ref={inputRef}
            testID="text-prompt-input"
            value={value}
            onChangeText={setValue}
            placeholder={request?.placeholder}
            placeholderTextColor={form.colors.tertiaryLabel}
            selectionColor={loomUiTokens.colors.accentColor}
            selectTextOnFocus
            returnKeyType="done"
            onSubmitEditing={() => pending?.resolve(value)}
            style={styles.input}
          />
          <View style={styles.buttons}>
            <Pressable
              testID="text-prompt-cancel"
              onPress={() => pending?.resolve(null)}
              hitSlop={8}
            >
              <Text style={styles.button}>Cancel</Text>
            </Pressable>
            <Pressable
              testID="text-prompt-save"
              onPress={() => pending?.resolve(value)}
              hitSlop={8}
            >
              <Text style={styles.button}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dialog: {
    borderRadius: 28,
    padding: 24,
    gap: 16,
    backgroundColor: form.colors.sheetRowBackground,
  },
  title: {
    fontSize: 22,
    color: '#FFFFFF',
  },
  message: {
    fontSize: 14,
    color: form.colors.secondaryLabel,
  },
  input: {
    fontSize: form.rowTextSize,
    color: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: loomUiTokens.colors.accentColor,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 24,
  },
  button: {
    fontSize: 14,
    fontWeight: '600',
    color: loomUiTokens.colors.accentColor,
  },
});
